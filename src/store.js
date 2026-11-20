// Piezas compartidas por la portada y la página Tienda: catálogo, tarjetas, detalle del perfume,
// menú del teléfono y enlaces de WhatsApp.
import { products as seedProducts, families as seedFamilies, brands as seedBrands, upcoming as seedUpcoming, WHATSAPP_NUMBER } from './data.js';
import { bottleSVG } from './bottle.js';
import { loadCatalog } from './api.js';

// Catálogo vivo desde el panel; si Supabase no responde, se usa el de respaldo.
export const catalog = await loadCatalog({
  brands: seedBrands,
  families: seedFamilies,
  products: seedProducts,
  showcase: [],
  upcoming: { ...seedUpcoming, photos: [], silhouette: true },
});
export const { products, upcoming } = catalog;
export const brands = catalog.brands || [];
export const families = catalog.families || [];
export const showcase = catalog.showcase || [];

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fmt = (n) => '$' + Number(n).toLocaleString('es-CO');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Ruta a la raíz del sitio desde la página actual ("./" en la portada, "../" en /tienda/).
export const ROOT = document.body.dataset.root || './';
export const shopUrl = (params = {}) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return `${ROOT}tienda/${q ? `?${q}` : ''}`;
};

// 15 ml o menos = mini (perfume original rellenado en frasco pequeño).
export const MINI_MAX_ML = 15;
export const sizesOf = (p) => Object.keys(p.prices).map(Number).sort((a, b) => a - b);
export const hasMinis = (p) => sizesOf(p).some((ml) => ml <= MINI_MAX_ML);
export const hasFull = (p) => sizesOf(p).some((ml) => ml > MINI_MAX_ML);
export const minPrice = (p) => Math.min(...Object.values(p.prices));

export const brandName = (id) => brands.find((b) => b.id === id)?.name || '';
export const familyName = (id) => families.find((f) => f.id === id)?.name || '';
export const productById = Object.fromEntries(products.map((p) => [p.id, p]));
export const usedBrands = brands.filter((b) => products.some((p) => p.brand === b.id)).sort((a, b) => a.name.localeCompare(b.name, 'es'));

// La foto subida desde el panel; mientras no exista, un frasco dibujado provisional.
export const bottleFor = (p, extra = {}) => bottleSVG({ liquid: p.liquid, shape: p.shape, cap: p.cap, ...extra });
export const visualFor = (p, { lazy = true } = {}) =>
  p.photo ? `<img class="product-photo" src="${esc(p.photo)}" alt="${esc(p.name)}" ${lazy ? 'loading="lazy"' : ''} decoding="async">` : bottleFor(p);

/* ---------- WhatsApp ---------- */
export const waLink = (text) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

/* ---------- Tarjetas ---------- */
export function cardHTML(p) {
  const brand = brandName(p.brand);
  return `
  <article class="card">
    <button class="card-stage" data-open="${esc(p.id)}" aria-label="Ver ${esc(p.name)}" style="--liq:${esc(p.liquid)}">
      ${p.tag ? `<span class="card-tag">${esc(p.tag)}</span>` : ''}
      ${visualFor(p)}
    </button>
    <div class="card-info">
      ${brand ? `<p class="card-brand">${esc(brand)}</p>` : ''}
      <h3 class="card-name"><button data-open="${esc(p.id)}">${esc(p.name)}</button></h3>
      <p class="card-price">desde ${fmt(minPrice(p))}${hasMinis(p) ? '<span>· Mini</span>' : ''}</p>
      <button class="card-btn" data-open="${esc(p.id)}" tabindex="-1" aria-hidden="true">Ver perfume</button>
    </div>
  </article>`;
}

// Las tarjetas aparecen al entrar en pantalla, bajando o subiendo, desde el lado por donde llegan.
const cardObserver = new IntersectionObserver(
  (entries) => {
    let n = 0;
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.style.setProperty('--d', `${Math.min(n++, 4) * 70}ms`);
        en.target.classList.add('is-in');
      } else {
        en.target.dataset.from = en.boundingClientRect.top < 0 ? 'top' : 'bottom';
        en.target.classList.remove('is-in');
      }
    }
  },
  { rootMargin: '-4% 0px -6% 0px' },
);
export function revealCards(root) {
  $$('.card', root).forEach((c) => (reduceMotion ? c.classList.add('is-in') : cardObserver.observe(c)));
}

// Inclinación 3D suave de las fotos de las tarjetas siguiendo el mouse.
if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.addEventListener('pointermove', (e) => {
    const stage = e.target.closest?.('.card-stage');
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    stage.style.setProperty('--tx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    stage.style.setProperty('--ty', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  });
  document.addEventListener('pointerout', (e) => {
    const stage = e.target.closest?.('.card-stage');
    if (stage && !stage.contains(e.relatedTarget)) {
      stage.style.setProperty('--tx', 0);
      stage.style.setProperty('--ty', 0);
    }
  });
}

// Cambio suave del contenido (filtros, pestañas).
export function swap(fn) {
  if (document.startViewTransition && !reduceMotion) document.startViewTransition(fn);
  else fn();
}

/* =========================================================
   Detalle del perfume
   ========================================================= */
let modal;
let current = null;

export function openModal(id) {
  const p = productById[id];
  if (!p) return;
  current = p;
  modal.style.setProperty('--liq', p.liquid);
  $('#modalVisual').innerHTML = visualFor(p, { lazy: false });
  $('#modalBrand').textContent = brandName(p.brand);
  $('#modalName').textContent = p.name;
  $('#modalMeta').textContent = [p.gender, familyName(p.family)].filter(Boolean).join(' · ');
  $('#modalDesc').textContent = p.description;
  $('#modalNotes').innerHTML = [
    ['Al aplicarlo', p.notes?.top],
    ['Después de un rato', p.notes?.heart],
    ['Al final del día', p.notes?.base],
  ]
    .filter(([, n]) => n?.length)
    .map(([t, n]) => `<div><dt>${t}</dt><dd>${esc(n.join(', '))}</dd></div>`)
    .join('');

  const sizes = sizesOf(p);
  const group = (title, list) =>
    list.length
      ? `<fieldset><legend>${title}</legend>${list
          .map((ml) => `<label class="size"><input type="radio" name="size" value="${ml}"><span><strong>${ml} ml</strong>${fmt(p.prices[ml])}</span></label>`)
          .join('')}</fieldset>`
      : '';
  $('#modalSizes').innerHTML = group('Mini', sizes.filter((ml) => ml <= MINI_MAX_ML)) + group('Frasco completo', sizes.filter((ml) => ml > MINI_MAX_ML));
  const radios = $$('input[name="size"]', modal);
  radios[radios.length - 1].checked = true;
  updateOrder();

  modal.showModal();
  document.body.classList.add('is-locked');
  requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('is-open')));
}

function updateOrder() {
  const ml = Number($('input[name="size"]:checked', modal)?.value);
  const brand = brandName(current.brand);
  const kindLabel = ml <= MINI_MAX_ML ? 'mini de ' : '';
  $('#modalOrder').href = waLink(`Hola, quiero pedir ${kindLabel}${current.name}${brand ? ` de ${brand}` : ''} en ${ml} ml (${fmt(current.prices[ml])}). Mi ciudad es: `);
}

function closeModal() {
  if (!modal.open) return;
  modal.classList.remove('is-open');
  document.body.classList.remove('is-locked');
  setTimeout(() => modal.close(), reduceMotion ? 0 : 220);
}

function bindModal() {
  modal = $('#modal');
  $('#modalSizes').addEventListener('change', updateOrder);
  $('#modalClose').addEventListener('click', closeModal);
  modal.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeModal();
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open]');
    if (open) openModal(open.dataset.open);
  });

  // En el teléfono el detalle es una hoja que se cierra arrastrando hacia abajo.
  const handle = $('#sheetHandle');
  let startY = 0;
  let startT = 0;
  let dy = 0;
  let dragging = false;
  handle.addEventListener('pointerdown', (e) => {
    if (dragging) return;
    dragging = true;
    startY = e.clientY;
    startT = performance.now();
    dy = 0;
    handle.setPointerCapture(e.pointerId);
    modal.style.transition = 'none';
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const raw = e.clientY - startY;
    dy = raw < 0 ? raw * 0.2 : raw;
    modal.style.transform = `translateY(${dy}px)`;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    const velocity = dy / Math.max(1, performance.now() - startT);
    modal.style.transition = '';
    modal.style.transform = '';
    if (dy > 140 || velocity > 0.5) closeModal();
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

/* ---------- Menú del teléfono ---------- */
function bindMobileMenu() {
  const menu = $('#menu');
  const menuBtn = $('#menuBtn');
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.body.classList.toggle('is-locked', open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
    } else {
      menu.classList.remove('is-open');
      setTimeout(() => {
        if (!menu.classList.contains('is-open')) menu.hidden = true;
      }, 280);
    }
  };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false);
  });
}

/* =========================================================
   Movimiento: apariciones al bajar y menú que se esconde
   ========================================================= */
// Títulos y textos sueltos aparecen solos; las listas aparecen elemento por elemento.
const REVEAL = '.title, .eyebrow, .about-title, .about p, .about .btn, .brand-col-title, .faq-head p, .shop-eyebrow, .shop-title, .see-all';
const STAGGER = '.perks-list, .minis-steps, .brand-list, .faq-list, .filters';

// Se repiten cada vez que la parte entra en pantalla: bajando llega desde abajo, subiendo desde arriba.
const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        // Los hijos se numeran al aparecer (algunas listas se llenan después de cargar).
        [...en.target.children].forEach((c, i) => c.style.setProperty('--i', i));
        en.target.classList.add('is-in');
      } else {
        en.target.dataset.from = en.boundingClientRect.top < 0 ? 'top' : 'bottom';
        en.target.classList.remove('is-in');
      }
    }
  },
  { rootMargin: '-6% 0px -8% 0px', threshold: 0.08 },
);

export function watchReveals(root = document) {
  if (reduceMotion) return;
  $$(REVEAL, root).forEach((el) => {
    if (el.closest('.hero')) return;
    el.classList.add('rv');
    // Los títulos grandes se destapan con una capa interior: si el recorte se aplicara al título mismo,
    // el navegador no detectaría que entró en pantalla.
    if (el.matches('.title, .shop-title, .about-title') && !el.querySelector(':scope > .rv-in')) {
      el.innerHTML = `<span class="rv-in">${el.innerHTML}</span>`;
    }
    revealObserver.observe(el);
  });
  $$(STAGGER, root).forEach((el) => {
    el.classList.add('rv-stagger');
    revealObserver.observe(el);
  });
  // Íconos que se dibujan solos (los trazos se miden como 1 para animarlos fácil).
  $$('.perks-list svg :is(path, rect, circle)', root).forEach((s) => s.setAttribute('pathLength', '1'));
}

function bindNavOnScroll() {
  const nav = $('#nav');
  if (!nav) return;
  let lastY = window.scrollY;
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 8);
    // Se esconde al bajar (para dejar ver más) y vuelve apenas se sube un poco.
    if (y > 260 && y > lastY + 6 && !document.body.classList.contains('is-locked')) nav.classList.add('is-hidden');
    else if (y < lastY - 6 || y <= 260) nav.classList.remove('is-hidden');
    lastY = y;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}

// Prepara lo común de cualquier página de la tienda.
export function initPage() {
  watchReveals();
  bindNavOnScroll();
  $$('[data-whatsapp]').forEach((a) => {
    a.href = waLink('Hola, quiero información sobre sus perfumes.');
    a.target = '_blank';
    a.rel = 'noopener';
  });
  bindMobileMenu();
  bindModal();
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
}
