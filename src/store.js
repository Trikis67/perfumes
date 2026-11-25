// Piezas compartidas por la portada y la página Tienda: catálogo, tarjetas, detalle del perfume,
// menú del teléfono y enlaces de WhatsApp.
import { products as seedProducts, families as seedFamilies, brands as seedBrands, upcoming as seedUpcoming, WHATSAPP_NUMBER, STORE_NAME } from './data.js';
import { bottleSVG } from './bottle.js';
import { loadCatalog } from './api.js';
import { isSet, setVisualHTML } from './setvisual.js';
import { createCart } from './cart.js';
import { createSearch, mountSearch } from './search.js';
export { isSet };

// Catálogo vivo desde el panel; si Supabase no responde, se usa el de respaldo.
export const catalog = await loadCatalog({
  brands: seedBrands,
  families: seedFamilies,
  products: seedProducts,
  categories: [],
  showcase: [],
  upcoming: { ...seedUpcoming, photos: [], silhouette: true },
});
export const { products, upcoming } = catalog;
export const brands = catalog.brands || [];
export const families = catalog.families || [];
export const categories = catalog.categories || [];
export const showcase = catalog.showcase || [];

// Shipping Protection: se suma a TODOS los precios (perfumes, decants y sets). El monto se cambia en el panel.
const round2 = (n) => Math.round(Number(n) * 100) / 100;
const fee = Number(catalog.shop?.protectionFee);
export const PROTECTION_FEE = Number.isFinite(fee) && fee >= 0 ? fee : 5;
for (const p of products) p.prices = Object.fromEntries(Object.entries(p.prices).map(([ml, v]) => [ml, round2(Number(v) + PROTECTION_FEE)]));

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Precios en quetzales guatemaltecos: Q1,250
export const fmt = (n) => {
  const v = Number(n);
  return 'Q' + v.toLocaleString('es-GT', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
};
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Ruta a la raíz del sitio desde la página actual ("./" en la portada, "../" en /tienda/).
export const ROOT = document.body.dataset.root || './';
export const shopUrl = (params = {}) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return `${ROOT}tienda/${q ? `?${q}` : ''}`;
};

// 15 ml o menos = decant (perfume original rellenado en frasco pequeño).
// (Por dentro se sigue llamando "mini" para no romper enlaces ni datos guardados.)
export const MINI_MAX_ML = 15;
export const sizesOf = (p) => Object.keys(p.prices).map(Number).sort((a, b) => a - b);
// Un set es decant si todos sus perfumes son pequeños, y "completo" si alguno es grande.
export const hasMinis = (p) => (isSet(p) ? p.items.every((it) => it.ml <= MINI_MAX_ML) : sizesOf(p).some((ml) => ml <= MINI_MAX_ML));
export const hasFull = (p) => (isSet(p) ? p.items.some((it) => it.ml > MINI_MAX_ML) : sizesOf(p).some((ml) => ml > MINI_MAX_ML));
export const minPrice = (p) => Math.min(...Object.values(p.prices));

export const brandName = (id) => brands.find((b) => b.id === id)?.name || '';
export const familyName = (id) => families.find((f) => f.id === id)?.name || '';
// Un perfume puede tener varias familias (los guardados antes solo tienen "family").
export const familiesOf = (p) => (Array.isArray(p?.families) && p.families.length ? p.families : p?.family ? [p.family] : []);
export const categoryName = (id) => categories.find((c) => c.id === id)?.name || '';
export const productById = Object.fromEntries(products.map((p) => [p.id, p]));
export const usedBrands = brands.filter((b) => products.some((p) => p.brand === b.id)).sort((a, b) => a.name.localeCompare(b.name, 'es'));
export const usedCategories = categories.filter((c) => products.some((p) => p.category === c.id));
// Buscador con tolerancia a errores (se usa en la lupa de la barra y en la página Tienda con ?q=).
export const searchProducts = createSearch({
  products,
  brandName,
  familyName: (id) => families.find((f) => f.id === id)?.name || '',
  categoryName,
  familiesOf: (p) => (Array.isArray(p?.families) && p.families.length ? p.families : p?.family ? [p.family] : []),
});

// La foto subida desde el panel; mientras no exista, un frasco dibujado provisional.
// Los sets muestran todos sus perfumes juntos.
export const bottleFor = (p, extra = {}) => bottleSVG({ liquid: p.liquid, shape: p.shape, cap: p.cap, ...extra });
export const visualFor = (p, { lazy = true } = {}) =>
  isSet(p)
    ? setVisualHTML(p.items, { lazy })
    : p.photo
      ? `<img class="product-photo" src="${esc(p.photo)}" alt="${esc(p.name)}" ${lazy ? 'loading="lazy"' : ''} decoding="async">`
      : bottleFor(p);

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
      ${
        isSet(p)
          ? `<p class="card-price">${fmt(minPrice(p))}<span>· Set de ${p.items.length}</span></p>`
          : `<p class="card-price">desde ${fmt(minPrice(p))}${hasMinis(p) ? '<span>· Decant</span>' : ''}</p>`
      }
      ${p.inStock === false ? '<p class="card-stock">Agotado por ahora</p>' : ''}
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
    const stage = e.target.closest?.('.card-stage, .rec-stage, .modal-visual, .cart-thumb');
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    stage.style.setProperty('--tx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    stage.style.setProperty('--ty', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  });
  document.addEventListener('pointerout', (e) => {
    const stage = e.target.closest?.('.card-stage, .rec-stage, .modal-visual, .cart-thumb');
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
// Colores suaves para las etiquetas: [fondo, borde, letra].
const PILL_COLORS = [
  ['#E4F1EC', '#C3DDD2', '#2F5A4B'],
  ['#F5E4E4', '#E5C4C4', '#6E3B3B'],
  ['#F2E8D4', '#DECAA4', '#5E4A24'],
  ['#ECE6F4', '#D2C6E5', '#4A3D66'],
  ['#E3EDF5', '#C3D6E6', '#2F4A63'],
  ['#F8E8DC', '#EBCDB6', '#6A4128'],
  ['#EEF2DD', '#D5DEB2', '#4A5524'],
  ['#F4E4EE', '#E3C3D6', '#653A55'],
];
const shuffled = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pillStyle = ([bg, line, ink]) => `--pill-bg:${bg};--pill-line:${line};--pill-ink:${ink}`;

let modal;
let current = null;
let qty = 1; // cantidad elegida en el detalle

export function openModal(id) {
  const p = productById[id];
  if (!p) return;
  current = p;
  modal.style.setProperty('--liq', p.liquid);
  $('#modalVisual').innerHTML = visualFor(p, { lazy: false });
  $('#modalBrand').textContent = brandName(p.brand);
  $('#modalName').textContent = p.name;
  // Existencias: punto verde si está listo para enviar; si está agotado no se puede agregar al carrito.
  const soldOut = p.inStock === false;
  $('#modalStock')?.remove();
  $('#modalName').insertAdjacentHTML(
    'afterend',
    `<p class="stock ${soldOut ? 'is-out' : 'is-in'}" id="modalStock"><i aria-hidden="true"></i>${soldOut ? 'Agotado por ahora' : 'En existencia, listo para enviar'}</p>`,
  );
  qty = 1;
  $('#modalQty').textContent = '1';
  $('.qty-pick', modal).hidden = soldOut;
  $('#modalAdd').disabled = soldOut;
  $('#modalAdd').textContent = soldOut ? 'Agotado' : 'Agregar al carrito';
  $('#modalOrder').textContent = soldOut ? 'Preguntar cuándo vuelve por WhatsApp' : 'Pedir solo este por WhatsApp';
  $('#modalMeta').textContent = [isSet(p) ? 'Set de perfumes' : '', p.gender].filter(Boolean).join(' · ');
  // Categoría y familias como etiquetas de colores (colores suaves elegidos al azar cada vez).
  // Cada etiqueta lleva a la Tienda con todos los perfumes que la tienen.
  const tags = [
    ...(categoryName(p.category) ? [['Categoría', categoryName(p.category), shopUrl({ categoria: p.category })]] : []),
    ...familiesOf(p)
      .filter((id) => familyName(id))
      .map((id) => ['Familia', familyName(id), shopUrl({ familia: id })]),
  ];
  const colors = shuffled(PILL_COLORS);
  $('#modalTags')?.remove();
  if (tags.length)
    $('#modalMeta').insertAdjacentHTML(
      'afterend',
      `<ul class="pills" id="modalTags">${tags.map(([kind, n, href], i) => `<li><a class="pill" style="${pillStyle(colors[i % colors.length])}" href="${esc(href)}" title="Ver todos: ${kind} ${esc(n)}">${esc(n)}</a></li>`).join('')}</ul>`,
    );
  $('#modalDesc').textContent = p.description;
  // Notas como etiquetas: cada nivel con su propio color, también al azar.
  $('#modalNotes').innerHTML = [
    ['Al aplicarlo', p.notes?.top],
    ['Después de un rato', p.notes?.heart],
    ['Al final del día', p.notes?.base],
  ]
    .filter(([, n]) => n?.length)
    .map(
      ([t, n], i) =>
        `<div><dt>${t}</dt><dd><ul class="pills">${n
          .map((x) => `<li><a class="pill" style="${pillStyle(colors[(tags.length + i) % colors.length])}" href="${esc(shopUrl({ nota: x }))}" title="Ver todos los perfumes con ${esc(x)}">${esc(x)}</a></li>`)
          .join('')}</ul></dd></div>`,
    )
    .join('');

  modal.classList.toggle('is-set', isSet(p));
  if (isSet(p)) {
    // Un set tiene un solo precio: se muestra qué perfumes trae.
    const ml = sizesOf(p)[0];
    $('#modalSizes').innerHTML = `
      <fieldset class="set-list"><legend>Este set trae ${p.items.length} perfumes</legend>
        <ol>${p.items.map((it) => `<li><span class="set-dot" style="--c:${esc(it.liquid || '#B58A4C')}"></span><strong>${esc(it.name)}</strong><span>${it.ml} ml</span></li>`).join('')}</ol>
        <p class="set-price"><span>Precio del set</span><strong>${fmt(p.prices[ml])}</strong></p>
        <input type="radio" name="size" value="${ml}" checked hidden>
      </fieldset>`;
  } else {
    const sizes = sizesOf(p);
    const group = (title, list) =>
      list.length
        ? `<fieldset><legend>${title}</legend>${list
            .map((ml) => `<label class="size"><input type="radio" name="size" value="${ml}"><span><strong>${ml} ml</strong>${fmt(p.prices[ml])}</span></label>`)
            .join('')}</fieldset>`
        : '';
    $('#modalSizes').innerHTML = group('Decant', sizes.filter((ml) => ml <= MINI_MAX_ML)) + group('Frasco completo', sizes.filter((ml) => ml > MINI_MAX_ML));
    const radios = $$('input[name="size"]', modal);
    radios[radios.length - 1].checked = true;
  }
  updateOrder();

  modal.showModal();
  document.body.classList.add('is-locked');
  requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('is-open')));
}

function updateOrder() {
  const ml = Number($('input[name="size"]:checked', modal)?.value);
  const brand = brandName(current.brand);
  const of = brand ? ` de ${brand}` : '';
  if (current.inStock === false) {
    $('#modalOrder').href = waLink(`Hola, ¿cuándo vuelve ${current.name}${of}?`);
    return;
  }
  const unit = current.prices[ml];
  const total = fmt(Math.round(unit * qty * 100) / 100);
  const size = isSet(current) ? `Set de ${current.items.length}` : `${ml} ml${ml <= MINI_MAX_ML ? ' · Decant' : ''}`;
  $('#modalOrder').href = waLink(
    [
      `🛍️ *PEDIDO · ${STORE_NAME.toUpperCase()}*`,
      '',
      'Hola, quiero pedir:',
      '',
      `*${current.name}*${brand ? ` · ${brand}` : ''}`,
      `   ${size}`,
      isSet(current) ? `   Incluye: ${current.items.map((it) => `${it.name} (${it.ml} ml)`).join(', ')}` : null,
      `   ${qty} × ${fmt(unit)} = *${total}*`,
      '',
      '✅ Incluye Shipping Protection',
      '',
      '📍 Mi dirección es: ',
    ]
      .filter((x) => x !== null)
      .join('\n'),
  );
}

function closeModal() {
  if (!modal.open) return;
  modal.classList.remove('is-open');
  document.body.classList.remove('is-locked');
  setTimeout(() => modal.close(), reduceMotion ? 0 : 220);
}

// Aviso de Shipping Protection justo antes de confirmar el pedido (sin precio aparte: ya va incluido).
const protectionHTML = (open = false) => `
  <details class="protection" ${open ? 'open' : ''}>
    <summary>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6Z"/><path d="m8.8 12.2 2.2 2.2 4.4-4.6"/></svg>
      <span><strong>Shipping Protection incluido</strong><small>Tu pedido llega bien o lo resolvemos nosotros</small></span>
    </summary>
    <ul>
      <li>Nos aseguramos de que tu pedido llegue completo y en perfecto estado hasta tu puerta.</li>
      <li>Si llega roto, dañado, con fugas o se pierde en el camino, nos hacemos responsables: te lo reponemos sin costo o te devolvemos tu dinero.</li>
      <li>Empacamos cada perfume con protección especial y te damos seguimiento de tu envío.</li>
      <li>Solo envíanos fotos o un video por WhatsApp dentro de las 48 horas después de recibirlo.</li>
    </ul>
  </details>`;

let cart = null;

// Al agregar: una copia del frasco vuela girando en 3D hasta la bolsa del carrito.
export function flyToCart(fromEl) {
  const target = $('#cartBtn');
  if (reduceMotion || !fromEl || !target || !fromEl.animate) return;
  const a = fromEl.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  if (!a.width) return;
  const size = Math.min(a.width, a.height, 220);
  const ghost = document.createElement('div');
  ghost.className = 'fly-ghost';
  ghost.innerHTML = fromEl.innerHTML;
  Object.assign(ghost.style, { left: `${a.left + (a.width - size) / 2}px`, top: `${a.top + (a.height - size) / 2}px`, width: `${size}px`, height: `${size}px` });
  document.body.appendChild(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  ghost
    .animate(
      [
        { transform: 'perspective(800px) translate3d(0,0,0) rotateY(0) scale(1)', opacity: 1 },
        { transform: `perspective(800px) translate3d(${dx * 0.45}px, ${dy * 0.45 - 90}px, 120px) rotateY(200deg) scale(0.55)`, opacity: 1, offset: 0.55 },
        { transform: `perspective(800px) translate3d(${dx}px, ${dy}px, 0) rotateY(360deg) scale(0.08)`, opacity: 0.4 },
      ],
      { duration: 900, easing: 'cubic-bezier(0.5, 0, 0.3, 1)' },
    )
    .finished.finally(() => ghost.remove());
}

function bindModal() {
  modal = $('#modal');
  // Antes del pedido: aviso de protección, "Agregar al carrito" y, como opción, pedir solo este por WhatsApp.
  const order = $('#modalOrder');
  order.insertAdjacentHTML(
    'beforebegin',
    `${protectionHTML(false)}
    <div class="qty-pick"><span>Cantidad</span><div class="cart-qty" role="group" aria-label="Cantidad">
      <button type="button" data-mq="-1" aria-label="Quitar uno">−</button><span id="modalQty" aria-live="polite">1</span><button type="button" data-mq="1" aria-label="Agregar uno">+</button>
    </div></div>
    <button class="btn btn-block" id="modalAdd" type="button">Agregar al carrito</button>`,
  );
  order.classList.add('btn-ghost');
  $('.qty-pick', modal).addEventListener('click', (e) => {
    const b = e.target.closest('[data-mq]');
    if (!b) return;
    qty = Math.max(1, Math.min(20, qty + Number(b.dataset.mq)));
    $('#modalQty').textContent = qty;
    updateOrder();
  });
  $('#modalAdd').addEventListener('click', () => {
    if (current.inStock === false) return;
    const ml = Number($('input[name="size"]:checked', modal)?.value);
    flyToCart($('#modalVisual'));
    cart?.add(current.id, ml, qty);
    closeModal();
  });
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
  cart = createCart({
    products,
    productById,
    fmt,
    esc,
    visualFor,
    brandName,
    isSet,
    waLink,
    miniMax: MINI_MAX_ML,
    protectionHTML,
    reduceMotion,
    minPrice,
    sizesOf,
    familiesOf,
    fly: flyToCart,
  });
  mountSearch({ search: searchProducts, products, fmt, esc, visualFor, brandName, minPrice, isSet, shopUrl, reduceMotion });
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
}
