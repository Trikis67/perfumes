import { products as seedProducts, families as seedFamilies, brands as seedBrands, upcoming as seedUpcoming, WHATSAPP_NUMBER } from './data.js';
import { bottleSVG } from './bottle.js';
import { loadCatalog, subscribeToLaunch } from './api.js';
import { NOTIFY_ENABLED } from './config.js';

// Catálogo vivo desde el panel; si el servidor no responde, se usa el de respaldo.
const catalog = await loadCatalog({
  brands: seedBrands,
  families: seedFamilies,
  products: seedProducts,
  upcoming: { ...seedUpcoming, photos: [], silhouette: true },
});
const { products, upcoming } = catalog;
const brands = catalog.brands || [];
const families = catalog.families || [];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n) => '$' + Number(n).toLocaleString('es-CO');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// 15 ml o menos = mini (perfume original rellenado en frasco pequeño).
const MINI_MAX_ML = 15;
const sizesOf = (p) => Object.keys(p.prices).map(Number).sort((a, b) => a - b);
const hasMinis = (p) => sizesOf(p).some((ml) => ml <= MINI_MAX_ML);
const hasFull = (p) => sizesOf(p).some((ml) => ml > MINI_MAX_ML);
const minPrice = (p) => Math.min(...Object.values(p.prices));

const brandName = (id) => brands.find((b) => b.id === id)?.name || '';
const familyName = (id) => families.find((f) => f.id === id)?.name || '';
const productById = Object.fromEntries(products.map((p) => [p.id, p]));

// La foto subida desde el panel; mientras no exista, un frasco dibujado provisional.
const bottleFor = (p, extra = {}) => bottleSVG({ liquid: p.liquid, shape: p.shape, cap: p.cap, ...extra });
const visualFor = (p, { lazy = true } = {}) =>
  p.photo ? `<img class="product-photo" src="${esc(p.photo)}" alt="${esc(p.name)}" ${lazy ? 'loading="lazy"' : ''} decoding="async">` : bottleFor(p);

/* ---------- WhatsApp ---------- */
const waLink = (text) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
$$('[data-whatsapp]').forEach((a) => {
  a.href = waLink('Hola, quiero información sobre sus perfumes.');
  a.target = '_blank';
  a.rel = 'noopener';
});

/* =========================================================
   Próximamente
   ========================================================= */
const hero = $('#hero');

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
// Fondo editable en el panel: si es claro, las letras se vuelven oscuras (salvo que el dueño elija un color).
function applyHeroColors(background, textColor) {
  const valid = (c) => /^#[0-9a-f]{6}$/i.test(c || '');
  const bg = valid(background) ? background : '#0B0B0C';
  const light = luminance(bg) > 0.3;
  hero.style.setProperty('--hero-bg', bg);
  hero.style.setProperty('--hero-fg', valid(textColor) ? textColor : light ? '#151515' : '#F5F1EA');
  hero.dataset.tone = light ? 'light' : 'dark';
}

function renderHero() {
  const d = upcoming;
  hero.style.setProperty('--hero-liq', d.liquid || '#B08A4E');
  applyHeroColors(d.background, d.textColor);
  const brand = brandName(d.brand);
  $('#heroKicker').innerHTML = ['Próximamente', brand].filter(Boolean).map(esc).join('<i aria-hidden="true">·</i>');
  $('#heroName').textContent = d.name;
  $('#heroDesc').textContent = d.edition || d.description;

  const bottle = $('#heroBottle');
  hero.dataset.silhouette = String(d.silhouette !== false);
  bottle.innerHTML = d.photos?.[0]
    ? `<img class="hero-photo" src="${esc(d.photos[0])}" alt="" decoding="async" fetchpriority="high">`
    : bottleFor(d, { fill: 0.7 });
  bottle.setAttribute('aria-label', `${d.name}, todavía no disponible`);
  bottle.addEventListener('click', () => {
    bottle.classList.remove('is-wobbling');
    void bottle.offsetWidth;
    bottle.classList.add('is-wobbling');
  });

  tick();
  const timer = setInterval(() => tick() || clearInterval(timer), 1000);
  if (NOTIFY_ENABLED) bindNotify(d);
  else $('#notifyForm').remove();
  // Entrada de la portada. El temporizador es de respaldo: algunos navegadores pausan
  // requestAnimationFrame y la portada nunca debe quedarse invisible.
  const show = () => hero.classList.add('is-in');
  requestAnimationFrame(show);
  setTimeout(show, 120);
}

// Devuelve false cuando ya llegó la fecha (para detener el reloj).
function tick() {
  const diff = new Date(upcoming.launch).getTime() - Date.now();
  if (diff <= 0) {
    $('#countdown').innerHTML = '<div><strong>Ya</strong><span>disponible</span></div>';
    return false;
  }
  const s = Math.floor(diff / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const set = (id, v) => {
    const el = $(id);
    if (el && el.textContent !== v) el.textContent = v;
  };
  set('#cdD', pad(Math.floor(s / 86400)));
  set('#cdH', pad(Math.floor((s % 86400) / 3600)));
  set('#cdM', pad(Math.floor((s % 3600) / 60)));
  set('#cdS', pad(s % 60));
  return true;
}

function bindNotify(d) {
  const form = $('#notifyForm');
  const input = $('#notifyEmail');
  const msg = $('#notifyMsg');
  const button = $('button', form);
  const defaultMsg = msg.textContent;
  const launchDate = new Date(d.launch).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });

  input.addEventListener('input', () => {
    if (form.dataset.state !== 'error') return;
    form.dataset.state = '';
    msg.textContent = defaultMsg;
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.dataset.state === 'sending') return;
    const email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      form.dataset.state = 'error';
      msg.textContent = 'Escribe un correo válido, por ejemplo nombre@gmail.com.';
      input.focus();
      return;
    }
    form.dataset.state = 'sending';
    button.textContent = 'Enviando…';
    try {
      const res = await subscribeToLaunch(email, d.id);
      if (!res.ok) throw new Error(res.error || '');
      form.dataset.state = 'done';
      form.innerHTML = `<p class="notify-done" role="status"><strong>Listo, estás en la lista.</strong> Te escribiremos a ${esc(email)} el ${launchDate}.</p>`;
    } catch (err) {
      form.dataset.state = 'error';
      button.textContent = 'Avísame';
      msg.textContent = err.message || 'No pudimos guardar tu correo. Inténtalo de nuevo en un momento.';
    }
  });
}

/* =========================================================
   Colección
   ========================================================= */
const grid = $('#grid');
let kind = 'all';
let brandFilter = null;

function cardHTML(p) {
  const brand = brandName(p.brand);
  const minis = hasMinis(p);
  return `
  <article class="card">
    <button class="card-stage" data-open="${esc(p.id)}" aria-label="Ver ${esc(p.name)}" style="--liq:${esc(p.liquid)}">
      ${p.tag ? `<span class="card-tag">${esc(p.tag)}</span>` : ''}
      ${visualFor(p)}
    </button>
    <div class="card-info">
      ${brand ? `<p class="card-brand">${esc(brand)}</p>` : ''}
      <h3 class="card-name"><button data-open="${esc(p.id)}">${esc(p.name)}</button></h3>
      <p class="card-price">desde ${fmt(minPrice(p))}${minis ? '<span>· Mini</span>' : ''}</p>
    </div>
  </article>`;
}

function renderGrid() {
  const list = products.filter(
    (p) => (kind === 'all' || (kind === 'minis' ? hasMinis(p) : hasFull(p))) && (!brandFilter || p.brand === brandFilter),
  );
  grid.innerHTML = list.map(cardHTML).join('');
  $('#gridEmpty').hidden = list.length > 0;
  $('#brandFilter').hidden = !brandFilter;
  if (brandFilter) $('#brandFilterLabel').textContent = `Mostrando ${brandName(brandFilter)}`;
  revealCards();
}

function setKind(next) {
  kind = next;
  $$('#tabs [data-kind]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === kind)));
  swap(renderGrid);
}
function setBrand(id) {
  brandFilter = id;
  swap(renderGrid);
}
// Cambio suave del contenido de la grilla.
function swap(fn) {
  if (document.startViewTransition && !reduceMotion) document.startViewTransition(fn);
  else fn();
}

$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-kind]');
  if (b && b.dataset.kind !== kind) setKind(b.dataset.kind);
});
$('#brandClear').addEventListener('click', () => setBrand(null));
$$('[data-jump="minis"]').forEach((a) => a.addEventListener('click', () => setKind('minis')));

// Las tarjetas aparecen una vez al entrar en pantalla.
const cardObserver = new IntersectionObserver(
  (entries) => {
    entries
      .filter((en) => en.isIntersecting)
      .forEach((en, i) => {
        en.target.style.setProperty('--d', `${Math.min(i, 4) * 60}ms`);
        en.target.classList.add('is-in');
        cardObserver.unobserve(en.target);
      });
  },
  { rootMargin: '0px 0px -6% 0px' },
);
function revealCards() {
  $$('.card', grid).forEach((c) => (reduceMotion ? c.classList.add('is-in') : cardObserver.observe(c)));
}

/* ---------- Marcas ---------- */
const usedBrands = brands
  .filter((b) => products.some((p) => p.brand === b.id))
  .sort((a, b) => a.name.localeCompare(b.name, 'es'));
$('#marcas').hidden = !usedBrands.length;
$('#brandList').innerHTML = usedBrands.map((b) => `<li><button data-brand="${esc(b.id)}">${esc(b.name)}</button></li>`).join('');
$('#brandList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-brand]');
  if (!b) return;
  setBrand(b.dataset.brand);
  $('#coleccion').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
});

/* =========================================================
   Detalle del perfume
   ========================================================= */
const modal = $('#modal');
let current = null;

function openModal(id) {
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
          .map(
            (ml) => `<label class="size"><input type="radio" name="size" value="${ml}"><span><strong>${ml} ml</strong>${fmt(p.prices[ml])}</span></label>`,
          )
          .join('')}</fieldset>`
      : '';
  $('#modalSizes').innerHTML =
    group('Mini', sizes.filter((ml) => ml <= MINI_MAX_ML)) + group('Frasco completo', sizes.filter((ml) => ml > MINI_MAX_ML));
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
  $('#modalOrder').href = waLink(
    `Hola, quiero pedir ${kindLabel}${current.name}${brand ? ` de ${brand}` : ''} en ${ml} ml (${fmt(current.prices[ml])}). Mi ciudad es: `,
  );
}
$('#modalSizes').addEventListener('change', updateOrder);

function closeModal() {
  if (!modal.open) return;
  modal.classList.remove('is-open');
  document.body.classList.remove('is-locked');
  setTimeout(() => modal.close(), reduceMotion ? 0 : 220);
}
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
{
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

/* =========================================================
   Menú del teléfono
   ========================================================= */
const menu = $('#menu');
const menuBtn = $('#menuBtn');
function setMenu(open) {
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
}
menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', (e) => {
  if (e.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false);
});

/* ---------- Inicio ---------- */
$('#year').textContent = new Date().getFullYear();
renderHero();
renderGrid();
