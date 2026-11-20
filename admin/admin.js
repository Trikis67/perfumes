import { request, login, logout, sessionStatus, changePassword, ApiError } from './backend.js';
import { NOTIFY_ENABLED } from '../src/config.js';
import { slideHTML } from '../src/showcase.js';
import { SHOWCASE_FONTS, DEFAULT_FONT, loadFonts } from '../src/fonts.js';

// Familias olfativas: vienen del servidor (el dueño las crea y edita en la pestaña Familias).
let families = [];
const loadFamilies = async () => (families = await api('/api/admin/families'));
// Marcas: las crea el dueño en la pestaña Catálogo (Dior, Creed, su propia línea…).
let brands = [];
const loadBrands = async () => (brands = await api('/api/admin/brands'));

/* =========================================================
   Utilidades
   ========================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-CO');
const familyName = (id) => families.find((f) => f.id === id)?.name || '';
const brandName = (id) => brands.find((b) => b.id === id)?.name || '';
// 15 ml o menos = mini: perfume original rellenado en un frasco pequeño.
const MINI_MAX_ML = 15;
const dateShort = (t) => new Date(t).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
const toLocalInput = (iso) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const daysUntil = (iso) => Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 86400000));
const visualFor = (p) =>
  p.photo ? `<img src="${esc(p.photo)}" alt="">` : noPhoto();

const ICON = {
  spotlight:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M8 15.5h8"/><path d="M7 11c1.5-2.5 3.2-2.5 5 0s3.5 2.5 5 0"/></svg>',
  key: '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M7.5 11V8.5a4.5 4.5 0 0 1 9 0V11"/><path d="M12 14.5v2"/><rect x="5" y="11" width="14" height="10" rx="2.5"/></svg>',
  finger:
    '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.8A7 7 0 0 1 19 11v1.5"/><path d="M5 10.5V12a10 10 0 0 0 1.2 4.8"/><path d="M9 11a3 3 0 0 1 6 0v2a12 12 0 0 1-1.4 5.6"/><path d="M12 11v2.5a15 15 0 0 1-2.5 7"/><path d="M17.5 15.5a17 17 0 0 1-1 3.6"/></svg>',
  launch:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3l2.2 5.3L20 9l-4.4 3.8L17 18.5 12 15.6 7 18.5l1.4-5.7L4 9l5.8-.7Z"/></svg>',
  bottle:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="9" y="2.5" width="6" height="4" rx="1"/><path d="M10 6.5v2M14 6.5v2"/><rect x="5.5" y="8.5" width="13" height="13" rx="3"/></svg>',
  camera:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5Z"/><circle cx="12" cy="12.5" r="3.5"/></svg>',
  drop: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3.5c3.5 4.2 6 7.6 6 10.6a6 6 0 0 1-12 0c0-3 2.5-6.4 6-10.6Z"/></svg>',
  up: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 10 6 6 6-6"/></svg>',
  mail: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg>',
  device:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
  store:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>',
  logout:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16l-4-4 4-4M6 12h10"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" class="add-icon"><path d="M12 5v14M5 12h14"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  trash:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
  info: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/></svg>',
};

async function api(path, opts) {
  try {
    return await request(path, opts);
  } catch (e) {
    if (e.status === 401) {
      toast('Tu sesión terminó. Vuelve a entrar.', true);
      renderLogin();
    }
    throw e;
  }
}

/* ---------- Avisos y confirmación ---------- */
let toastTimer;
function toast(msg, error = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('is-error', error);
  t.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-visible'), 3200);
}
function confirmDialog({ title, text, ok = 'Confirmar', danger = false }) {
  const d = $('#confirm');
  $('#confirmTitle').textContent = title;
  $('#confirmText').textContent = text;
  $('#confirmOk').textContent = ok;
  d.classList.toggle('is-danger', danger);
  d.returnValue = '';
  d.showModal();
  requestAnimationFrame(() => d.classList.add('is-open'));
  return new Promise((resolve) => {
    d.addEventListener(
      'close',
      () => {
        d.classList.remove('is-open');
        resolve(d.returnValue === 'ok');
      },
      { once: true },
    );
  });
}
async function withLoading(btn, fn) {
  btn?.classList.add('is-loading');
  try {
    return await fn();
  } finally {
    btn?.classList.remove('is-loading');
  }
}
/* =========================================================
   Acceso
   ========================================================= */
function renderLogin() {
  app.innerHTML = `
  <main class="gate">
    <div class="gate-card">
      <div class="gate-logo">Ánima</div>
      <p class="gate-sub">Panel de administración</p>
      <div class="gate-key">${ICON.key}</div>
      <h1>Hola de nuevo</h1>
      <p class="lead">Entra con tu usuario y contraseña.</p>
      <form id="pwForm" class="gate-form" novalidate>
        <div class="gate-field">
          <label for="pwUser">Usuario</label>
          <input id="pwUser" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required>
        </div>
        <div class="gate-field">
          <label for="pwPass">Contraseña</label>
          <div class="pw-wrap">
            <input id="pwPass" name="password" type="password" autocomplete="current-password" required>
            <button type="button" class="pw-toggle" id="pwToggle" aria-label="Mostrar contraseña" aria-pressed="false">Ver</button>
          </div>
        </div>
        <button class="btn btn-light" type="submit">Entrar</button>
        <p class="gate-error" id="pwError" role="alert"></p>
      </form>
    </div>
  </main>`;

  $('#pwToggle').addEventListener('click', (e) => {
    const input = $('#pwPass');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    e.currentTarget.textContent = show ? 'Ocultar' : 'Ver';
    e.currentTarget.setAttribute('aria-pressed', String(show));
    e.currentTarget.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
  $('#pwForm').addEventListener('submit', (e) => {
    e.preventDefault();
    withLoading(e.submitter, async () => {
      const err = $('#pwError');
      err.textContent = '';
      try {
        await login($('#pwUser').value, $('#pwPass').value);
        renderShell();
      } catch (e2) {
        err.textContent = e2.message;
        $('#pwPass').select();
      }
    });
  });
}

/* =========================================================
   Estructura del panel
   ========================================================= */
const VIEWS = {
  lanzamiento: { label: 'Lanzamiento', icon: ICON.launch, render: renderLaunch },
  productos: { label: 'Productos', icon: ICON.bottle, render: renderProducts },
  destacados: { label: 'Destacados', icon: ICON.spotlight, render: renderShowcase },
  familias: { label: 'Catálogo', icon: ICON.drop, render: renderFamilies },
  ...(NOTIFY_ENABLED ? { avisos: { label: 'Avisos', icon: ICON.mail, render: renderSubscribers } } : {}),
  dispositivos: { label: 'Acceso', icon: ICON.device, render: renderDevices },
};
let currentView = null;
let dirtyGuard = null; // función que devuelve true si hay cambios sin guardar

function renderShell() {
  app.innerHTML = `
  <div class="shell">
    <header class="topbar">
      <a class="logo" href="#lanzamiento">Ánima<small>Panel</small></a>
      <div class="topbar-actions">
        <a class="icon-btn" href="../" target="_blank" rel="noopener" aria-label="Ver la tienda">${ICON.store}</a>
        <button class="icon-btn" id="logoutBtn" aria-label="Salir">${ICON.logout}</button>
      </div>
    </header>
    <nav class="tabbar" aria-label="Secciones">
      ${Object.entries(VIEWS)
        .map(([id, v]) => `<button data-view="${id}">${v.icon}<span>${v.label}</span></button>`)
        .join('')}
    </nav>
    <main id="view"></main>
  </div>`;
  $('.tabbar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (b) location.hash = b.dataset.view;
  });
  $('#logoutBtn').addEventListener('click', async () => {
    if (dirtyGuard?.() && !(await confirmDialog({ title: '¿Salir sin guardar?', text: 'Tienes cambios que no se han guardado.', ok: 'Salir' }))) return;
    await logout().catch(() => {});
    dirtyGuard = null;
    renderLogin();
  });
  route();
}

async function route() {
  if (!$('#view')) return;
  const id = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'lanzamiento';
  if (currentView && currentView !== id && dirtyGuard?.()) {
    const leave = await confirmDialog({ title: '¿Salir sin guardar?', text: 'Tienes cambios en esta sección que se perderán.', ok: 'Salir sin guardar' });
    if (!leave) {
      history.replaceState(null, '', `#${currentView}`);
      return;
    }
  }
  dirtyGuard = null;
  currentView = id;
  $$('.tabbar [data-view]').forEach((b) => (b.dataset.view === id ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  const view = $('#view');
  view.innerHTML = '<div class="loading">Cargando…</div>';
  window.scrollTo(0, 0);
  try {
    await VIEWS[id].render(view);
  } catch (e) {
    if (e.status !== 401) view.innerHTML = `<div class="view"><div class="empty"><strong>No se pudo cargar</strong>${esc(e.message)}</div></div>`;
  }
}
window.addEventListener('hashchange', route);
window.addEventListener('beforeunload', (e) => {
  if (dirtyGuard?.()) e.preventDefault();
});

/* ---------- Piezas de formulario ---------- */
const familyOptions = (sel) => families.map((f) => `<option value="${f.id}" ${f.id === sel ? 'selected' : ''}>${esc(f.name)}</option>`).join('');
const brandOptions = (sel) =>
  `<option value="" ${sel ? '' : 'selected'}>Sin marca</option>` +
  [...brands].sort((a, b) => a.name.localeCompare(b.name, 'es')).map((b) => `<option value="${b.id}" ${b.id === sel ? 'selected' : ''}>${esc(b.name)}</option>`).join('');
const genderOptions = (sel) => ['Unisex', 'Femenino', 'Masculino'].map((g) => `<option ${g === sel ? 'selected' : ''}>${g}</option>`).join('');
const notesFields = (n = {}) => `
  <div class="field full"><label for="nTop">Huele a… al aplicarlo</label><input id="nTop" name="notes.top" value="${esc((n.top || []).join(', '))}" placeholder="Limón, Pimienta rosa"><span class="hint">Lo primero que se siente. Separa cada aroma con una coma.</span></div>
  <div class="field"><label for="nHeart">Después de un rato</label><input id="nHeart" name="notes.heart" value="${esc((n.heart || []).join(', '))}" placeholder="Rosa, Jazmín"></div>
  <div class="field"><label for="nBase">Al final del día</label><input id="nBase" name="notes.base" value="${esc((n.base || []).join(', '))}" placeholder="Vainilla, Madera"></div>`;
/* ---------- Selector de color junto a la foto ---------- */
// Fondos oscuros para la portada (el texto es claro) y tonos para el aura y las tarjetas.
const BG_COLORS = ['#0C1D19', '#101A2B', '#2A1220', '#1E1813', '#221A2E', '#121416', '#16261F', '#2B2118'];
const AURA_COLORS = ['#5F7A5A', '#B58A4C', '#C77B8B', '#7E6178', '#4F6E86', '#A8541F', '#5E9A9A', '#D9A93A'];
const TEXT_COLORS = ['#F4F2F6', '#FFFFFF', '#E3C9A0', '#16302A', '#111111'];
// Igual que en la tienda: decide letras claras u oscuras según el fondo.
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const heroColors = (bg, textColor) => {
  const light = luminance(bg) > 0.3;
  return { fg: textColor || (light ? '#16302A' : '#F4F2F6'), accent: light ? '#8A6430' : '#E3C9A0' };
};
const swatchBtn = (c) => `<button type="button" class="swatch" style="--c:${c}" data-color="${c}" role="radio" aria-checked="false" aria-label="Color ${c}"></button>`;

function colorPicker({ name, value, label, hint, swatches, suggestFrom = 'raw' }) {
  return `
  <div class="color-field" data-suggest="${suggestFrom}">
    <span class="label">${label}</span>
    <div class="swatches swatches-suggested" hidden><span class="swatch-caption">De la foto</span></div>
    <div class="swatches" role="radiogroup" aria-label="${esc(label)}">
      ${swatches.map(swatchBtn).join('')}
      <label class="swatch swatch-custom" title="Elegir otro color"><input type="color" name="${name}" value="${esc((value || swatches[0]).toLowerCase())}" aria-label="Otro color">+</label>
    </div>
    ${hint ? `<span class="hint">${hint}</span>` : ''}
  </div>`;
}
function syncSwatches(root = document) {
  $$('.color-field', root).forEach((field) => {
    const v = $('input[type=color]', field).value.toUpperCase();
    $$('[data-color]', field).forEach((s) => s.setAttribute('aria-checked', String(s.dataset.color.toUpperCase() === v)));
  });
}
document.addEventListener('click', (e) => {
  const s = e.target.closest('.color-field [data-color]');
  if (!s) return;
  const input = $('input[type=color]', s.closest('.color-field'));
  input.value = s.dataset.color.toLowerCase();
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
});
document.addEventListener('input', (e) => {
  if (e.target.matches('.color-field input[type=color]')) syncSwatches(e.target.closest('.color-field').parentElement);
});

// Colores dominantes de una foto (se calcula en el teléfono, no se envía nada).
async function photoPalette(src, count = 5) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const w = 48;
  const h = Math.max(1, Math.round((w * img.naturalHeight) / img.naturalWidth));
  const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const g = canvas.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  const data = g.getImageData(0, 0, w, h).data;
  const bins = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const [r, gr, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 200) continue; // transparente
    const max = Math.max(r, gr, b);
    const min = Math.min(r, gr, b);
    if (min > 232 || max < 16) continue; // casi blanco o casi negro
    const key = ((r >> 4) << 8) | ((gr >> 4) << 4) | (b >> 4);
    const bin = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    bin.n++;
    bin.r += r;
    bin.g += gr;
    bin.b += b;
    bins.set(key, bin);
  }
  const picked = [];
  for (const bin of [...bins.values()].sort((a, b) => b.n - a.n)) {
    const c = [bin.r / bin.n, bin.g / bin.n, bin.b / bin.n];
    if (picked.every((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) > 48)) picked.push(c);
    if (picked.length >= count) break;
  }
  return picked;
}
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
// Para el fondo de la portada se oscurecen los tonos de la foto (el texto encima es claro).
const deepen = ([r, g, b]) => [r * 0.2 + 6, g * 0.2 + 8, b * 0.2 + 8];

async function fillSuggestions(root, src) {
  const fields = $$('.color-field', root);
  if (!src) {
    fields.forEach((f) => ($('.swatches-suggested', f).hidden = true));
    return;
  }
  let palette = [];
  try {
    palette = await photoPalette(src);
  } catch {
    /* si la foto no se puede leer, simplemente no hay sugerencias */
  }
  fields.forEach((f) => {
    const row = $('.swatches-suggested', f);
    const colors = palette.map((c) => toHex(f.dataset.suggest === 'deep' ? deepen(c) : c));
    row.innerHTML = '<span class="swatch-caption">De la foto</span>' + colors.map(swatchBtn).join('');
    row.hidden = !colors.length;
  });
  syncSwatches(root);
}
// Ejemplos de etiqueta que el dueño puede tocar para usarlos tal cual.
const TAG_EXAMPLES = ['Más vendido', 'Nuevo', 'Últimas unidades', 'Casi agotado', 'Edición limitada', 'Oferta', 'Favorito', 'Ideal para regalar', 'Vuelve pronto'];

// Sin foto: un espacio neutro con un ícono de cámara (los frascos dibujados solo existen en la tienda).
const noPhoto = (label = '') =>
  `<span class="no-photo">${ICON.camera}${label ? `<small>${label}</small>` : ''}</span>`;

function readForm(form) {
  const out = { notes: {} };
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'radio' && !el.checked) continue; // en un grupo de opciones solo vale la marcada
    const v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.name.startsWith('notes.')) out.notes[el.name.slice(6)] = v.split(',').map((s) => s.trim()).filter(Boolean);
    else if (el.name.startsWith('prices.')) (out.prices ||= {})[el.name.slice(7)] = v === '' ? '' : Number(String(v).replace(/\D/g, ''));
    else out[el.name] = v;
  }
  return out;
}
function bindCounters(root) {
  $$('textarea[maxlength]', root).forEach((t) => {
    const c = t.parentElement.querySelector('.counter');
    const update = () => c && (c.textContent = `${t.value.length}/${t.maxLength}`);
    t.addEventListener('input', update);
    update();
  });
}

/* =========================================================
   Próximo lanzamiento (interfaz dedicada)
   ========================================================= */
async function renderLaunch(view) {
  let [u] = await Promise.all([api('/api/admin/upcoming'), loadFamilies(), loadBrands()]);
  view.innerHTML = `
  <div class="view">
    <div class="view-head">
      <div><h1>Próximo lanzamiento</h1><p>Esto es lo que se ve en la portada de la tienda.</p></div>
    </div>

    <section class="preview" id="lPreview" aria-label="Vista previa de la portada"></section>

    <div class="stats">
      <div class="stat"><strong id="sDays"></strong><span>días para el lanzamiento</span></div>
      ${NOTIFY_ENABLED ? `<div class="stat"><strong>${u.subscribers}</strong><span>personas esperan el aviso</span></div>` : ''}
      <div class="stat"><strong id="sPhotos"></strong><span>fotos subidas</span></div>
    </div>

    <form id="launchForm" novalidate>
      <section class="card">
        <h2>Fotos y colores</h2>
        <p class="help">La primera foto es la principal y aparece en la portada. Puedes tomarla con la cámara del teléfono.</p>
        <div class="gallery" id="gallery"></div>
        <div class="color-pair" id="launchColors">
          ${colorPicker({ name: 'background', value: u.background || '#0C1D19', label: 'Fondo de la portada', hint: 'Claro u oscuro: las letras se adaptan solas.', swatches: [...BG_COLORS, '#F4F2F6', '#EFE7DC'], suggestFrom: 'deep' })}
          <div class="text-field">
            <span class="label">Color de las letras</span>
            <div class="swatches" role="radiogroup" aria-label="Color de las letras">
              <button type="button" class="swatch-auto" data-text="" role="radio" aria-checked="false">Automático</button>
              ${TEXT_COLORS.map((c) => `<button type="button" class="swatch" style="--c:${c}" data-text="${c}" role="radio" aria-checked="false" aria-label="Letras ${c}"></button>`).join('')}
              <label class="swatch swatch-custom" title="Elegir otro color"><input type="color" data-text-custom value="${esc((u.textColor || '#F4F2F6').toLowerCase())}" aria-label="Otro color de letras">+</label>
            </div>
            <input type="hidden" name="textColor" value="${esc(u.textColor || '')}">
            <span class="hint" id="contrastHint"></span>
          </div>
          ${colorPicker({ name: 'liquid', value: u.liquid, label: 'Aura del perfume', hint: 'El brillo que rodea la foto.', swatches: AURA_COLORS })}
        </div>
        <label class="switch">
          <span class="switch-text"><strong>Mostrar como silueta</strong><span>Oculta el frasco y muestra solo su contorno dorado, para crear expectativa. Funciona mejor con fotos de fondo transparente (PNG).</span></span>
          <input type="checkbox" name="silhouette" ${u.silhouette ? 'checked' : ''}><span class="switch-track"></span>
        </label>
      </section>

      <section class="card">
        <h2>Datos del perfume</h2>
        <p class="help">Los cambios no se publican hasta que toques Guardar.</p>
        <div class="fields">
          <div class="field full"><label for="lName">Nombre</label><input id="lName" name="name" value="${esc(u.name)}" maxlength="60" required></div>
          <div class="field"><label for="lEdition">Texto de la etiqueta</label><input id="lEdition" name="edition" value="${esc(u.edition)}" maxlength="60" placeholder="Llega en diciembre"></div>
          <div class="field"><label for="lLaunch">Fecha y hora del lanzamiento</label><input id="lLaunch" type="datetime-local" name="launch" value="${toLocalInput(u.launch)}" required></div>
          <div class="field"><label for="lBrand">Marca</label><select id="lBrand" name="brand">${brandOptions(u.brand)}</select></div>
          <div class="field"><label for="lFamily">Familia</label><select id="lFamily" name="family">${familyOptions(u.family)}</select></div>
          <div class="field"><label for="lGender">Para</label><select id="lGender" name="gender">${genderOptions(u.gender)}</select></div>
          <div class="field full"><label for="lDesc">Descripción</label><textarea id="lDesc" name="description" maxlength="400">${esc(u.description)}</textarea><span class="counter"></span></div>
          ${notesFields(u.notes)}
        </div>
      </section>
    </form>

    <section class="card">
      <h2>Nuevo lanzamiento</h2>
      <p class="help">Cuando este perfume ya esté a la venta, empieza el siguiente. Se borran las fotos actuales y la lista de avisos empieza vacía.</p>
      <button class="btn btn-danger" id="newLaunch">Empezar un lanzamiento nuevo</button>
    </section>
  </div>
  <div class="savebar" id="savebar" role="region" aria-label="Cambios sin guardar">
    <span>Cambios sin guardar</span>
    <div class="actions"><button class="btn btn-ghost btn-sm" id="discard">Descartar</button><button class="btn btn-light btn-sm" id="save">Guardar</button></div>
  </div>`;

  const form = $('#launchForm');
  bindCounters(form);
  syncSwatches(form);

  // Color de letras: "Automático" guarda vacío; un color guarda su código.
  const textInput = $('input[name=textColor]', form);
  const setText = (value) => {
    textInput.value = value;
    textInput.dispatchEvent(new Event('input', { bubbles: true }));
  };
  $('.text-field', form).addEventListener('click', (e) => {
    const b = e.target.closest('[data-text]');
    if (b) setText(b.dataset.text);
  });
  $('[data-text-custom]', form).addEventListener('input', (e) => setText(e.target.value.toUpperCase()));
  let baseline = JSON.stringify(readForm(form));
  const isDirty = () => JSON.stringify(readForm(form)) !== baseline;
  dirtyGuard = isDirty;

  function renderPreview() {
    const d = readForm(form);
    const launch = d.launch ? new Date(d.launch) : new Date(u.launch);
    const days = Math.max(0, Math.ceil((launch - Date.now()) / 86400000));
    const pv = $('#lPreview');
    pv.style.setProperty('--liq', d.liquid);
    pv.style.setProperty('--bg', d.background);
    const { fg, accent } = heroColors(d.background, d.textColor);
    pv.style.setProperty('--fg', fg);
    pv.style.setProperty('--accent', accent);
    // Letras: marca la opción elegida y avisa si cuesta leer
    $$('.text-field [data-text]', form).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.text.toUpperCase() === (d.textColor || '').toUpperCase())));
    const ratio = contrast(fg, d.background);
    $('#contrastHint').textContent =
      ratio < 3
        ? `Poco contraste (${ratio.toFixed(1)}:1): las letras costarán leerse sobre este fondo. Prueba "Automático".`
        : d.textColor
          ? 'Las letras usarán este color.'
          : `Automático: letras ${luminance(d.background) > 0.3 ? 'oscuras' : 'claras'} según el fondo.`;
    $('#contrastHint').classList.toggle('is-warning', ratio < 3);
    pv.classList.toggle('is-silhouette', !!d.silhouette);
    pv.innerHTML = `
      <div>
        <p class="preview-label">Vista previa</p>
        <span class="preview-badge">Próximamente</span>
        <h2>${esc(d.name || 'Sin nombre')}</h2>
        <p class="edition">${esc(d.edition)}</p>
        <p class="count">${days}<small>días</small></p>
      </div>
      <div class="preview-visual">${u.photos[0] ? `<img src="${esc(u.photos[0])}" alt="">` : noPhoto('Sube una foto')}</div>`;
    $('#sDays').textContent = days;
    $('#sPhotos').textContent = u.photos.length;
  }

  function renderGallery() {
    $('#gallery').innerHTML =
      u.photos
        .map(
          (url, i) => `
        <div class="photo">
          <img src="${esc(url)}" alt="Foto ${i + 1}" loading="lazy">
          ${i === 0 ? '<span class="chip">Principal</span>' : ''}
          <div class="photo-actions">
            ${i > 0 ? `<button type="button" data-main="${esc(url)}">Principal</button>` : ''}
            <button type="button" data-remove="${esc(url)}" aria-label="Quitar foto ${i + 1}">Quitar</button>
          </div>
        </div>`,
        )
        .join('') +
      (u.photos.length < 8
        ? `<label class="add-photo" id="addPhoto">${ICON.plus}<span>Agregar foto</span><input type="file" accept="image/*" aria-label="Agregar foto"></label>`
        : '');
    renderPreview();
    fillSuggestions($('#launchColors'), u.photos[0]);
  }

  const updateSavebar = () => $('#savebar').classList.toggle('is-shown', isDirty());
  form.addEventListener('input', () => {
    renderPreview();
    updateSavebar();
  });
  form.addEventListener('change', () => {
    renderPreview();
    updateSavebar();
  });

  $('#gallery').addEventListener('change', async (e) => {
    const input = e.target.closest('input[type=file]');
    if (!input?.files[0]) return;
    const tile = $('#addPhoto');
    tile.classList.add('is-uploading');
    tile.querySelector('span').textContent = 'Subiendo…';
    const fd = new FormData();
    fd.append('photo', input.files[0]);
    try {
      u = { ...u, ...(await api('/api/admin/upcoming/photos', { method: 'POST', form: fd })) };
      toast('Foto agregada');
    } catch (err) {
      toast(err.message, true);
    }
    renderGallery();
  });

  $('#gallery').addEventListener('click', async (e) => {
    const main = e.target.closest('[data-main]');
    const remove = e.target.closest('[data-remove]');
    try {
      if (main) {
        const url = main.dataset.main;
        u = { ...u, ...(await api('/api/admin/upcoming/photos', { method: 'PUT', body: { photos: [url, ...u.photos.filter((p) => p !== url)] } })) };
        toast('Foto principal cambiada');
        renderGallery();
      } else if (remove) {
        if (!(await confirmDialog({ title: '¿Quitar esta foto?', text: 'Se borrará de la tienda.', ok: 'Quitar', danger: true }))) return;
        u = { ...u, ...(await api('/api/admin/upcoming/photos', { method: 'DELETE', body: { url: remove.dataset.remove } })) };
        toast('Foto quitada');
        renderGallery();
      }
    } catch (err) {
      toast(err.message, true);
    }
  });

  $('#save').addEventListener('click', (e) =>
    withLoading(e.currentTarget, async () => {
      const d = readForm(form);
      try {
        const saved = await api('/api/admin/upcoming', { method: 'PUT', body: { ...d, launch: new Date(d.launch).toISOString() } });
        u = { ...u, ...saved };
        baseline = JSON.stringify(readForm(form));
        updateSavebar();
        toast('Lanzamiento guardado. Ya se ve en la tienda.');
      } catch (err) {
        toast(err.message, true);
      }
    }),
  );
  $('#discard').addEventListener('click', () => {
    dirtyGuard = null;
    route();
  });
  $('#newLaunch').addEventListener('click', async (e) => {
    const ok = await confirmDialog({
      title: '¿Empezar un lanzamiento nuevo?',
      text: `Se borrarán las fotos de "${u.name}" y la lista de avisos empezará vacía. Esto no se puede deshacer.`,
      ok: 'Empezar nuevo',
      danger: true,
    });
    if (!ok) return;
    await withLoading(e.currentTarget, async () => {
      try {
        await api('/api/admin/upcoming/new', { method: 'POST', body: {} });
        dirtyGuard = null;
        toast('Listo. Completa los datos del nuevo perfume.');
        route();
      } catch (err) {
        toast(err.message, true);
      }
    });
  });

  renderGallery();
}

/* =========================================================
   Productos
   ========================================================= */
async function renderProducts(view) {
  let [list] = await Promise.all([api('/api/admin/products'), loadFamilies(), loadBrands()]);
  view.innerHTML = `
  <div class="view">
    <div class="view-head">
      <div><h1>Productos</h1><p id="pCount"></p></div>
      <button class="btn btn-primary" id="newProduct">${ICON.plus}Nuevo</button>
    </div>
    <div class="toolbar">
      <label class="search">${ICON.search}<input type="search" id="pSearch" placeholder="Buscar perfume o marca" aria-label="Buscar perfume o marca"></label>
    </div>
    <div class="plist" id="plist"></div>
  </div>`;

  function draw() {
    const q = $('#pSearch').value.trim().toLowerCase();
    const items = list.filter((p) => !q || [p.name, familyName(p.family), brandName(p.brand)].some((t) => t.toLowerCase().includes(q)));
    const hidden = list.filter((p) => !p.visible).length;
    $('#pCount').textContent = `${list.length} perfumes${hidden ? `, ${hidden} ocultos` : ''}`;
    $('#plist').innerHTML = items.length
      ? items
          .map((p) => {
            const min = Math.min(...Object.values(p.prices));
            return `
        <button class="prow${p.visible ? '' : ' is-hidden'}" data-id="${esc(p.id)}" style="--liq:${esc(p.liquid)}">
          <span class="thumb${p.photo ? ' has-photo' : ''}">${visualFor(p)}</span>
          <span class="prow-text"><span class="prow-name">${esc(p.name)}</span><span class="prow-meta">${esc([brandName(p.brand), familyName(p.family)].filter(Boolean).join(' · '))}${Object.keys(p.prices).some((ml) => ml <= MINI_MAX_ML) ? ' · con minis' : ''}</span></span>
          <span class="prow-side">${fmt(min)}${!p.visible ? '<span class="chip chip-muted">Oculto</span>' : !p.photo ? '<span class="chip chip-gold">Sin foto</span>' : ''}</span>
        </button>`;
          })
          .join('')
      : `<div class="empty"><strong>Nada por aquí</strong>No hay perfumes que coincidan con "${esc(q)}".</div>`;
  }
  draw();
  $('#pSearch').addEventListener('input', draw);
  $('#plist').addEventListener('click', (e) => {
    const row = e.target.closest('[data-id]');
    if (row) openProductEditor(list.find((p) => p.id === row.dataset.id), onChange);
  });
  $('#newProduct').addEventListener('click', () => openProductEditor(null, onChange));

  function onChange(updated, removedId) {
    if (removedId) list = list.filter((p) => p.id !== removedId);
    else if (list.some((p) => p.id === updated.id)) list = list.map((p) => (p.id === updated.id ? updated : p));
    else list = [...list, updated];
    draw();
  }
}

function openProductEditor(product, onChange) {
  const isNew = !product;
  const p = product || { name: '', brand: null, family: families[0]?.id, gender: 'Unisex', description: '', notes: {}, prices: { 50: '', 100: '' }, liquid: '#B58A4C', shape: 'classic', cap: 'gold', visible: true, photo: null };
  let pendingFile = null;
  let pendingUrl = null;
  let photo = p.photo;
  // Tamaños del perfume: se pueden agregar (comunes o a mano) y quitar.
  const COMMON_SIZES = [2, 5, 10, 30, 50, 75, 100, 125, 200];
  const MAX_SIZES = 8;
  let sizes = Object.keys(p.prices).map(Number).sort((a, b) => a - b);
  if (!sizes.length) sizes = [50, 100];
  const priceValues = { ...p.prices };

  const sheet = document.createElement('dialog');
  sheet.className = 'sheet';
  sheet.setAttribute('aria-labelledby', 'sheetTitle');
  sheet.innerHTML = `
    <div class="sheet-head">
      <h2 id="sheetTitle">${isNew ? 'Nuevo perfume' : esc(p.name)}</h2>
      <button class="icon-btn" data-close aria-label="Cerrar">${ICON.close}</button>
    </div>
    <form class="sheet-body" id="pForm" novalidate>
      <div class="photo-editor" style="--liq:${esc(p.liquid)}">
        <span class="thumb" id="pThumb"></span>
        <div class="btns">
          <label class="btn btn-primary btn-sm file-btn"><span id="photoLabel"></span><input type="file" accept="image/*" id="pPhoto" aria-label="Elegir foto"></label>
          <button type="button" class="btn btn-ghost btn-sm" id="pRemovePhoto">Quitar foto</button>
          <span class="hint" style="font-size:13px;color:var(--muted)">JPG, PNG o foto del teléfono. Se optimiza sola.</span>
        </div>
      </div>
      <div id="pColors">
        ${colorPicker({ name: 'liquid', value: p.liquid, label: 'Color de fondo de su tarjeta', hint: 'Mira la foto de arriba y elige el tono que mejor la acompañe.', swatches: AURA_COLORS })}
      </div>
      <label class="switch">
        <span class="switch-text"><strong>Visible en la tienda</strong><span>Si lo apagas, el perfume se oculta pero no se borra.</span></span>
        <input type="checkbox" name="visible" ${p.visible ? 'checked' : ''}><span class="switch-track"></span>
      </label>
      <div class="fields">
        <div class="field full"><label for="pName">Nombre</label><input id="pName" name="name" value="${esc(p.name)}" maxlength="60" required></div>
        <div class="field full"><label for="pBrand">Marca</label><select id="pBrand" name="brand">${brandOptions(p.brand)}</select><span class="hint">Créalas en la pestaña Catálogo.</span></div>
        <div class="field"><label for="pFamily">Familia</label><select id="pFamily" name="family">${familyOptions(p.family)}</select></div>
        <div class="field"><label for="pGender">Para</label><select id="pGender" name="gender">${genderOptions(p.gender)}</select></div>
        <div class="field full sizes-editor">
          <span class="label">Tamaños y precios</span>
          <span class="hint">Agrega los tamaños en que vendes este perfume. Los de 15 ml o menos salen en la tienda como <strong>mini</strong> (perfume original en frasco pequeño).</span>
          <div class="size-rows" id="sizeRows"></div>
          <div class="size-add">
            <div class="tag-examples" id="sizeChips" aria-label="Tamaños comunes"></div>
            <div class="size-custom">
              <input type="number" id="customMl" min="1" max="1000" inputmode="numeric" placeholder="Otro tamaño (ml)" aria-label="Otro tamaño en ml">
              <button type="button" class="btn btn-ghost btn-sm" id="addCustomSize">Agregar</button>
            </div>
          </div>
        </div>
        <div class="field full"><label for="pDesc">Descripción</label><textarea id="pDesc" name="description" maxlength="400">${esc(p.description)}</textarea><span class="counter"></span></div>
        ${notesFields(p.notes)}
        <div class="field full">
          <label for="pTag">Etiqueta (opcional)</label>
          <input id="pTag" name="tag" value="${esc(p.tag || '')}" maxlength="30" placeholder="Escribe una o elige un ejemplo">
          <span class="hint">Un aviso corto que aparece sobre la foto en la tienda para llamar la atención. Déjala vacía si no hace falta.</span>
          <div class="tag-examples" role="group" aria-label="Ejemplos de etiqueta">
            ${TAG_EXAMPLES.map((t) => `<button type="button" class="tag-example" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}
          </div>
        </div>
      </div>
    </form>
    <div class="sheet-foot">
      ${isNew ? '' : `<button class="btn btn-danger" id="pDelete" aria-label="Eliminar perfume">${ICON.trash}</button>`}
      <button class="btn btn-primary" id="pSave">${isNew ? 'Crear perfume' : 'Guardar cambios'}</button>
    </div>`;
  document.body.appendChild(sheet);
  const form = $('#pForm', sheet);
  bindCounters(form);

  function renderSizes() {
    $$('#sizeRows input', sheet).forEach((i) => (priceValues[i.dataset.ml] = i.value));
    $('#sizeRows', sheet).innerHTML = sizes
      .map(
        (ml) => `
      <div class="size-row">
        <span class="size-ml">${ml} ml${ml <= MINI_MAX_ML ? '<small>Mini</small>' : ''}</span>
        <div class="money"><input name="prices.${ml}" data-ml="${ml}" inputmode="numeric" value="${esc(priceValues[ml] ?? '')}" placeholder="Precio" aria-label="Precio de ${ml} ml"></div>
        <button type="button" class="icon-btn" data-remove-size="${ml}" aria-label="Quitar ${ml} ml" ${sizes.length === 1 ? 'disabled' : ''}>${ICON.trash}</button>
      </div>`,
      )
      .join('');
    const full = sizes.length >= MAX_SIZES;
    $('#sizeChips', sheet).innerHTML = full
      ? '<span class="hint">Máximo 8 tamaños por perfume.</span>'
      : COMMON_SIZES.filter((s) => !sizes.includes(s))
          .map((s) => `<button type="button" class="tag-example" data-add-size="${s}">+ ${s} ml</button>`)
          .join('');
    $('.size-custom', sheet).hidden = full;
  }
  function addSize(ml) {
    if (!Number.isInteger(ml) || ml < 1 || ml > 1000) return toast('Escribe un tamaño entre 1 y 1000 ml.', true);
    if (sizes.includes(ml)) return toast(`Ya tienes ${ml} ml.`, true);
    if (sizes.length >= MAX_SIZES) return;
    renderSizes(); // guarda lo escrito antes de redibujar
    sizes = [...sizes, ml].sort((a, b) => a - b);
    renderSizes();
    $(`#sizeRows input[data-ml="${ml}"]`, sheet)?.focus();
  }
  renderSizes();
  sheet.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add-size]');
    if (add) return addSize(Number(add.dataset.addSize));
    const remove = e.target.closest('[data-remove-size]');
    if (remove) {
      renderSizes();
      sizes = sizes.filter((s) => s !== Number(remove.dataset.removeSize));
      return renderSizes();
    }
    if (e.target.closest('#addCustomSize')) {
      const input = $('#customMl', sheet);
      addSize(Number(input.value));
      input.value = '';
    }
  });
  $('#customMl', sheet).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      $('#addCustomSize', sheet).click();
    }
  });

  function drawThumb() {
    const d = readForm(form);
    const thumb = $('#pThumb', sheet);
    if (!pendingFile) pendingUrl = null;
    const src = pendingFile ? (pendingUrl ||= URL.createObjectURL(pendingFile)) : photo;
    thumb.classList.toggle('has-photo', !!src);
    thumb.parentElement.style.setProperty('--liq', d.liquid);
    const prevSrc = thumb.dataset.src || '';
    if (prevSrc !== (src || '')) {
      thumb.innerHTML = src ? `<img src="${esc(src)}" alt="">` : noPhoto('Sin foto');
      thumb.dataset.src = src || '';
      fillSuggestions($('#pColors', sheet), src); // tonos sacados de la foto
    }
    $('#photoLabel', sheet).textContent = src ? 'Cambiar foto' : 'Subir foto';
    $('#pRemovePhoto', sheet).hidden = !src;
  }
  drawThumb();
  syncSwatches(sheet);
  form.addEventListener('change', drawThumb);
  form.addEventListener('input', drawThumb); // el fondo de la miniatura cambia al instante con el color
  $('.tag-examples', sheet).addEventListener('click', (e) => {
    const b = e.target.closest('[data-tag]');
    if (!b) return;
    const input = $('#pTag', sheet);
    input.value = input.value === b.dataset.tag ? '' : b.dataset.tag;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    $$('.tag-example', sheet).forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.tag === input.value)));
  });
  $$('.tag-example', sheet).forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.tag === p.tag)));
  let baseline = JSON.stringify(readForm(form));
  const dirty = () => pendingFile !== null || JSON.stringify(readForm(form)) !== baseline;

  $('#pPhoto', sheet).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (isNew) {
      pendingFile = file; // se sube después de crear el perfume
      pendingUrl = null;
      drawThumb();
      return;
    }
    const label = e.target.closest('.file-btn');
    await withLoading(label, async () => {
      const fd = new FormData();
      fd.append('photo', file);
      try {
        const updated = await api(`/api/admin/products/${encodeURIComponent(p.id)}/photo`, { method: 'POST', form: fd });
        photo = updated.photo;
        Object.assign(p, updated);
        onChange(updated);
        toast('Foto actualizada');
      } catch (err) {
        toast(err.message, true);
      }
    });
    e.target.value = '';
    drawThumb();
  });

  $('#pRemovePhoto', sheet).addEventListener('click', async () => {
    if (pendingFile) {
      pendingFile = null;
      return drawThumb();
    }
    if (!(await confirmDialog({ title: '¿Quitar la foto?', text: 'Se mostrará el frasco dibujado en su lugar.', ok: 'Quitar', danger: true }))) return;
    try {
      const updated = await api(`/api/admin/products/${encodeURIComponent(p.id)}/photo`, { method: 'DELETE', body: {} });
      photo = null;
      onChange(updated);
      drawThumb();
      toast('Foto quitada');
    } catch (err) {
      toast(err.message, true);
    }
  });

  $('#pSave', sheet).addEventListener('click', (e) =>
    withLoading(e.currentTarget, async () => {
      try {
        const body = readForm(form);
        let saved = isNew
          ? await api('/api/admin/products', { method: 'POST', body })
          : await api(`/api/admin/products/${encodeURIComponent(p.id)}`, { method: 'PUT', body });
        if (pendingFile) {
          const fd = new FormData();
          fd.append('photo', pendingFile);
          saved = await api(`/api/admin/products/${encodeURIComponent(saved.id)}/photo`, { method: 'POST', form: fd });
          pendingFile = null;
        }
        onChange(saved);
        baseline = JSON.stringify(readForm(form));
        toast(isNew ? 'Perfume creado. Ya está en la tienda.' : 'Cambios guardados');
        close(true);
      } catch (err) {
        toast(err.message, true);
      }
    }),
  );

  $('#pDelete', sheet)?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: `¿Eliminar ${p.name}?`,
      text: 'Se borra de la tienda junto con su foto. Si solo quieres esconderlo, apaga "Visible en la tienda".',
      ok: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/admin/products/${encodeURIComponent(p.id)}`, { method: 'DELETE', body: {} });
      onChange(null, p.id);
      toast('Perfume eliminado');
      close(true);
    } catch (err) {
      toast(err.message, true);
    }
  });

  async function close(force = false) {
    if (!force && dirty() && !(await confirmDialog({ title: '¿Cerrar sin guardar?', text: 'Los cambios de este perfume se perderán.', ok: 'Cerrar' }))) return;
    sheet.classList.remove('is-open');
    setTimeout(() => {
      sheet.close();
      sheet.remove();
    }, 300);
  }
  sheet.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet || e.target.closest('[data-close]')) close();
  });

  sheet.showModal();
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('is-open')));
}

/* =========================================================
   Destacados
   ========================================================= */
const SC_BG = ['#D9D5CF', '#E6E1DA', '#CFC9C1', '#D7D2CB', '#E8DFD3', '#C9CFD3', '#1E1C1A', '#2A2622'];
const SC_TEXT = ['#1D1B19', '#3A332C', '#F4EFE8', '#8A6430', '#FFFFFF'];
const scPlaceholder = '<span class="sc-empty">' + ICON.camera + '<span>Sube la foto del frasco</span></span>';

async function renderShowcase(view) {
  let list = await api('/api/admin/showcase');
  view.innerHTML = `
  <div class="view">
    <div class="view-head">
      <div><h1>Destacados</h1><p>Tarjetas grandes con una palabra de fondo y un frasco al frente. Se muestran en la tienda debajo de la portada.</p></div>
      <button class="btn btn-primary" id="newSlide">${ICON.plus}Nuevo</button>
    </div>
    <div class="notice">${ICON.info}<span>Solo aparecen en la tienda las tarjetas <strong>visibles y con foto</strong>. Si no hay ninguna, la sección no se muestra.</span></div>
    <div class="sc-list" id="scList"></div>
  </div>`;

  function draw() {
    $('#scList').innerHTML = list.length
      ? list
          .map(
            (x, i) => `
        <div class="sc-row${x.visible === false || !x.photo ? ' is-off' : ''}">
          <button class="sc-thumb" data-edit="${esc(x.id)}" aria-label="Editar ${esc(x.word)}">${slideHTML(x, { placeholder: scPlaceholder })}</button>
          <div class="sc-row-info">
            <strong>${esc(x.word)}</strong>
            <span>${esc(SHOWCASE_FONTS[x.font]?.label || '')}</span>
            ${!x.photo ? '<span class="chip chip-gold">Sin foto</span>' : x.visible === false ? '<span class="chip chip-muted">Oculto</span>' : '<span class="chip chip-ok">En la tienda</span>'}
          </div>
          <div class="frow-order">
            <button class="icon-btn" data-move="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">${ICON.up}</button>
            <button class="icon-btn" data-move="${i}" data-dir="1" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Bajar">${ICON.down}</button>
          </div>
        </div>`,
          )
          .join('')
      : '<div class="empty"><strong>Todavía no hay destacados</strong>Crea el primero con el botón Nuevo. Mientras no haya ninguno, esta sección no aparece en la tienda.</div>';
  }
  draw();

  const onChange = async () => {
    list = await api('/api/admin/showcase');
    draw();
  };
  $('#newSlide').addEventListener('click', () => openSlideEditor(null, onChange));
  $('#scList').addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-edit]');
    if (edit) return openSlideEditor(list.find((x) => x.id === edit.dataset.edit), onChange);
    const move = e.target.closest('[data-move]');
    if (!move) return;
    const i = Number(move.dataset.move);
    const j = i + Number(move.dataset.dir);
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    const prev = list;
    list = next;
    draw();
    try {
      await api('/api/admin/showcase/order', { method: 'PUT', body: { ids: next.map((x) => x.id) } });
    } catch (err) {
      list = prev;
      draw();
      toast(err.message, true);
    }
  });
}

async function openSlideEditor(slide, onChange) {
  const isNew = !slide;
  const [allProducts] = await Promise.all([api('/api/admin/products'), loadBrands()]);
  const x = slide || { word: 'Nuevos', font: DEFAULT_FONT, textColor: '#1D1B19', background: '#D9D5CF', linkType: 'none', linkId: null, visible: true, photo: null };
  let pendingFile = null;
  let photo = x.photo;
  loadFonts(Object.keys(SHOWCASE_FONTS)); // para que cada opción se vea con su letra
  const linkValue = x.linkType === 'brand' || x.linkType === 'product' ? `${x.linkType}:${x.linkId}` : x.linkType || 'none';
  const opt = (v, label) => `<option value="${esc(v)}" ${v === linkValue ? 'selected' : ''}>${esc(label)}</option>`;

  const sheet = document.createElement('dialog');
  sheet.className = 'sheet';
  sheet.setAttribute('aria-labelledby', 'scTitle');
  sheet.innerHTML = `
    <div class="sheet-head">
      <h2 id="scTitle">${isNew ? 'Nuevo destacado' : esc(x.word)}</h2>
      <button class="icon-btn" data-close aria-label="Cerrar">${ICON.close}</button>
    </div>
    <form class="sheet-body" id="scForm" novalidate>
      <div class="sc-preview" id="scPreview"></div>
      <div class="btns sc-photo-btns">
        <label class="btn btn-primary btn-sm file-btn"><span id="scPhotoLabel"></span><input type="file" accept="image/*" id="scPhoto" aria-label="Elegir foto"></label>
        <button type="button" class="btn btn-ghost btn-sm" id="scRemovePhoto">Quitar foto</button>
      </div>
      <p class="hint" style="margin:6px 0 18px">Se ve mejor una foto del frasco <strong>sin fondo</strong> (PNG).</p>
      <div class="fields">
        <div class="field full">
          <label for="scWord">Palabra de fondo</label>
          <input id="scWord" name="word" value="${esc(x.word)}" maxlength="40" required>
          <span class="hint">Se escribe grande; si es larga sigue en la línea de abajo, detrás del frasco. Para cortar la línea donde quieras usa una barra: <strong>nuevos / ingresos</strong></span>
        </div>
        <div class="field full">
          <span class="label">Tipo de letra</span>
          <div class="font-picks" role="radiogroup" aria-label="Tipo de letra">
            ${Object.entries(SHOWCASE_FONTS)
              .map(
                ([id, ft]) => `<label class="font-pick"><input type="radio" name="font" value="${id}" ${id === (x.font || DEFAULT_FONT) ? 'checked' : ''}><span style="font-family:${esc(ft.family)}">Aa</span><small>${esc(ft.label)}</small></label>`,
              )
              .join('')}
          </div>
        </div>
      </div>
      <div id="scColors" class="color-pair">
        ${colorPicker({ name: 'background', value: x.background, label: 'Color de fondo', hint: 'Grises cálidos dan el efecto de estudio con luz de ventana.', swatches: SC_BG })}
        ${colorPicker({ name: 'textColor', value: x.textColor, label: 'Color de la palabra', swatches: SC_TEXT })}
      </div>
      <div class="fields">
        <div class="field full">
          <label for="scLink">Al tocar la tarjeta, lleva a…</label>
          <select id="scLink" name="link">
            ${opt('none', 'Nada (solo decorativa)')}
            ${opt('minis', 'Los minis')}
            ${opt('full', 'Los frascos completos')}
            <optgroup label="Una marca">${[...brands].sort((a, b) => a.name.localeCompare(b.name, 'es')).map((b) => opt(`brand:${b.id}`, b.name)).join('')}</optgroup>
            <optgroup label="Un perfume">${allProducts.map((p) => opt(`product:${p.id}`, p.name)).join('')}</optgroup>
          </select>
        </div>
      </div>
      <label class="switch">
        <span class="switch-text"><strong>Visible en la tienda</strong><span>Si lo apagas, se guarda pero no se muestra.</span></span>
        <input type="checkbox" name="visible" ${x.visible !== false ? 'checked' : ''}><span class="switch-track"></span>
      </label>
    </form>
    <div class="sheet-foot">
      ${isNew ? '' : `<button class="btn btn-danger" id="scDelete" aria-label="Eliminar destacado">${ICON.trash}</button>`}
      <button class="btn btn-primary" id="scSave">${isNew ? 'Crear destacado' : 'Guardar cambios'}</button>
    </div>`;
  document.body.appendChild(sheet);
  const form = $('#scForm', sheet);
  form.addEventListener('submit', (e) => e.preventDefault()); // Enter no debe recargar la página

  const read = () => {
    const d = readForm(form);
    const [linkType, linkId = null] = String(d.link || 'none').split(':');
    return { word: d.word, font: d.font, background: d.background, textColor: d.textColor, visible: !!d.visible, linkType, linkId };
  };
  let pendingUrl = null;
  function draw() {
    const d = read();
    const src = pendingFile ? (pendingUrl ||= URL.createObjectURL(pendingFile)) : photo;
    $('#scPreview', sheet).innerHTML = slideHTML({ ...d, word: d.word || ' ', photo: src }, { placeholder: scPlaceholder });
    $('#scPhotoLabel', sheet).textContent = src ? 'Cambiar foto' : 'Subir foto';
    $('#scRemovePhoto', sheet).hidden = !src;
  }
  draw();
  syncSwatches(sheet);
  fillSuggestions($('#scColors', sheet), photo);
  form.addEventListener('input', draw);
  form.addEventListener('change', draw);
  const baseline = JSON.stringify(read());
  const dirty = () => pendingFile !== null || JSON.stringify(read()) !== baseline;

  $('#scPhoto', sheet).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (isNew) {
      pendingFile = file;
      pendingUrl = null;
      draw();
      return;
    }
    await withLoading(e.target.closest('.file-btn'), async () => {
      const fd = new FormData();
      fd.append('photo', file);
      try {
        photo = (await api(`/api/admin/showcase/${encodeURIComponent(x.id)}/photo`, { method: 'POST', form: fd })).photo;
        draw();
        fillSuggestions($('#scColors', sheet), photo);
        onChange();
        toast('Foto actualizada');
      } catch (err) {
        toast(err.message, true);
      }
    });
  });
  $('#scRemovePhoto', sheet).addEventListener('click', async () => {
    if (pendingFile) {
      pendingFile = null;
      return draw();
    }
    if (!(await confirmDialog({ title: '¿Quitar la foto?', text: 'Sin foto, esta tarjeta no aparece en la tienda.', ok: 'Quitar', danger: true }))) return;
    try {
      await api(`/api/admin/showcase/${encodeURIComponent(x.id)}/photo`, { method: 'DELETE', body: {} });
      photo = null;
      draw();
      onChange();
    } catch (err) {
      toast(err.message, true);
    }
  });

  $('#scSave', sheet).addEventListener('click', (e) =>
    withLoading(e.currentTarget, async () => {
      try {
        let saved = isNew
          ? await api('/api/admin/showcase', { method: 'POST', body: read() })
          : await api(`/api/admin/showcase/${encodeURIComponent(x.id)}`, { method: 'PUT', body: read() });
        if (pendingFile) {
          const fd = new FormData();
          fd.append('photo', pendingFile);
          saved = await api(`/api/admin/showcase/${encodeURIComponent(saved.id)}/photo`, { method: 'POST', form: fd });
          pendingFile = null;
        }
        await onChange();
        toast(saved.photo ? 'Guardado. Ya está en la tienda.' : 'Guardado. Sube una foto para que aparezca en la tienda.');
        close(true);
      } catch (err) {
        toast(err.message, true);
      }
    }),
  );
  $('#scDelete', sheet)?.addEventListener('click', async () => {
    if (!(await confirmDialog({ title: `¿Eliminar "${x.word}"?`, text: 'Se borra la tarjeta y su foto.', ok: 'Eliminar', danger: true }))) return;
    try {
      await api(`/api/admin/showcase/${encodeURIComponent(x.id)}`, { method: 'DELETE', body: {} });
      await onChange();
      toast('Destacado eliminado');
      close(true);
    } catch (err) {
      toast(err.message, true);
    }
  });

  async function close(force = false) {
    if (!force && dirty() && !(await confirmDialog({ title: '¿Cerrar sin guardar?', text: 'Los cambios de esta tarjeta se perderán.', ok: 'Cerrar' }))) return;
    sheet.classList.remove('is-open');
    setTimeout(() => {
      sheet.close();
      sheet.remove();
    }, 300);
  }
  sheet.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet || e.target.closest('[data-close]')) close();
  });
  sheet.showModal();
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('is-open')));
}

/* =========================================================
   Familias olfativas
   ========================================================= */
const FAMILY_COLORS = ['#8A5A3B', '#C77B8B', '#D9A93A', '#A8541F', '#5E9A9A', '#5F7A5A', '#7E6178', '#4F6E86', '#B58A4C', '#2F2A33'];
const perfumes = (n) => `${n} ${n === 1 ? 'perfume' : 'perfumes'}`;

async function renderFamilies(view) {
  await Promise.all([loadFamilies(), loadBrands()]);
  view.innerHTML = `
  <div class="view">
    <div class="view-head">
      <div><h1>Marcas</h1><p>Las marcas que vendes. Aparecen en cada perfume y en el menú de la tienda.</p></div>
    </div>
    <form class="brand-add" id="brandAdd">
      <input name="name" maxlength="40" placeholder="Nueva marca, por ejemplo Dior" aria-label="Nombre de la nueva marca" autocomplete="off">
      <button class="btn btn-primary" type="submit">${ICON.plus}Agregar</button>
    </form>
    <div class="plist" id="blist"></div>

    <div class="view-head" style="margin-top:36px">
      <div><h1>Familias</h1><p>El tipo de aroma de cada perfume. Se muestra en el detalle de cada perfume.</p></div>
      <button class="btn btn-primary" id="newFamily">${ICON.plus}Nueva</button>
    </div>
    <div class="plist" id="flist"></div>
    <p class="help" style="margin-top:14px;font-size:13px;color:var(--muted)">Usa las flechas para cambiar el orden en que aparecen en la tienda.</p>
  </div>`;

  function drawBrands() {
    const sorted = [...brands].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    $('#blist').innerHTML = sorted.length
      ? sorted
          .map(
            (b) => `
      <div class="frow brow">
        <button class="frow-main" data-brand="${esc(b.id)}">
          <span class="bmark" aria-hidden="true">${esc(b.name.slice(0, 1).toUpperCase())}</span>
          <span class="prow-text"><span class="prow-name">${esc(b.name)}</span></span>
          <span class="chip ${b.products ? '' : 'chip-muted'}">${perfumes(b.products)}</span>
        </button>
      </div>`,
          )
          .join('')
      : '<div class="empty"><strong>Aún no hay marcas</strong>Escribe la primera arriba.</div>';
  }
  drawBrands();
  $('#brandAdd').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.name;
    await withLoading(form.querySelector('button'), async () => {
      try {
        await api('/api/admin/brands', { method: 'POST', body: { name: input.value } });
        input.value = '';
        await loadBrands();
        drawBrands();
        toast('Marca agregada');
      } catch (err) {
        toast(err.message, true);
      }
    });
  });
  $('#blist').addEventListener('click', (e) => {
    const b = e.target.closest('[data-brand]');
    if (!b) return;
    openBrandEditor(brands.find((x) => x.id === b.dataset.brand), async () => {
      await loadBrands();
      drawBrands();
    });
  });

  function draw() {
    $('#flist').innerHTML = families
      .map(
        (f, i) => `
      <div class="frow" style="--c:${esc(f.color)}">
        <button class="frow-main" data-edit="${esc(f.id)}">
          <span class="fdrop" aria-hidden="true"></span>
          <span class="prow-text"><span class="prow-name">${esc(f.name)}</span><span class="prow-meta">${esc(f.text || 'Sin descripción')}</span></span>
          <span class="chip ${f.products ? '' : 'chip-muted'}">${perfumes(f.products)}</span>
        </button>
        <div class="frow-order">
          <button class="icon-btn" data-move="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir ${esc(f.name)}">${ICON.up}</button>
          <button class="icon-btn" data-move="${i}" data-dir="1" ${i === families.length - 1 ? 'disabled' : ''} aria-label="Bajar ${esc(f.name)}">${ICON.down}</button>
        </div>
      </div>`,
      )
      .join('');
  }
  draw();

  $('#newFamily').addEventListener('click', () => openFamilyEditor(null, onChange));
  $('#flist').addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-edit]');
    if (edit) return openFamilyEditor(families.find((f) => f.id === edit.dataset.edit), onChange);
    const move = e.target.closest('[data-move]');
    if (!move) return;
    const i = Number(move.dataset.move);
    const j = i + Number(move.dataset.dir);
    const next = [...families];
    [next[i], next[j]] = [next[j], next[i]];
    const prev = families;
    families = next;
    draw(); // se ve al instante; si falla, se revierte
    try {
      await api('/api/admin/families/order', { method: 'PUT', body: { ids: next.map((f) => f.id) } });
    } catch (err) {
      families = prev;
      draw();
      toast(err.message, true);
    }
  });

  async function onChange() {
    await loadFamilies();
    draw();
  }
}

function openBrandEditor(brand, onChange) {
  const sheet = document.createElement('dialog');
  sheet.className = 'sheet';
  sheet.setAttribute('aria-labelledby', 'bTitle');
  sheet.innerHTML = `
    <div class="sheet-head">
      <h2 id="bTitle">${esc(brand.name)}</h2>
      <button class="icon-btn" data-close aria-label="Cerrar">${ICON.close}</button>
    </div>
    <form class="sheet-body" id="bForm" novalidate>
      <div class="fields">
        <div class="field full"><label for="bName">Nombre de la marca</label><input id="bName" name="name" value="${esc(brand.name)}" maxlength="40" required></div>
      </div>
      <section class="card" style="margin-top:20px">
        <h2>Borrar marca</h2>
        <p class="help">${brand.products ? `Sus ${perfumes(brand.products)} no se borran: quedan "sin marca".` : 'Ningún perfume usa esta marca.'}</p>
        <button type="button" class="btn btn-danger" id="bDelete" style="margin-top:12px">Borrar marca</button>
      </section>
    </form>
    <div class="sheet-foot"><button class="btn btn-primary" id="bSave">Guardar cambios</button></div>`;
  document.body.appendChild(sheet);
  const close = () => {
    sheet.classList.remove('is-open');
    setTimeout(() => {
      sheet.close();
      sheet.remove();
    }, 300);
  };
  $('#bForm', sheet).addEventListener('submit', (e) => {
    e.preventDefault();
    $('#bSave', sheet).click();
  });
  $('#bSave', sheet).addEventListener('click', (e) =>
    withLoading(e.currentTarget, async () => {
      try {
        await api(`/api/admin/brands/${encodeURIComponent(brand.id)}`, { method: 'PUT', body: { name: $('#bName', sheet).value } });
        await onChange();
        toast('Marca guardada');
        close();
      } catch (err) {
        toast(err.message, true);
      }
    }),
  );
  $('#bDelete', sheet).addEventListener('click', async () => {
    if (!(await confirmDialog({ title: `¿Borrar ${brand.name}?`, text: 'Los perfumes de esta marca se quedan en la tienda, sin marca.', ok: 'Borrar', danger: true }))) return;
    try {
      await api(`/api/admin/brands/${encodeURIComponent(brand.id)}`, { method: 'DELETE', body: {} });
      await onChange();
      toast('Marca borrada');
      close();
    } catch (err) {
      toast(err.message, true);
    }
  });
  sheet.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet || e.target.closest('[data-close]')) close();
  });
  sheet.showModal();
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('is-open')));
}

function openFamilyEditor(family, onChange) {
  const isNew = !family;
  const f = family || { name: '', text: '', color: FAMILY_COLORS.find((c) => !families.some((x) => x.color.toUpperCase() === c)) || '#B58A4C', products: 0, upcoming: false };
  const others = families.filter((x) => x.id !== f.id);
  const inUse = f.products > 0 || f.upcoming;

  const sheet = document.createElement('dialog');
  sheet.className = 'sheet';
  sheet.setAttribute('aria-labelledby', 'fTitle');
  sheet.innerHTML = `
    <div class="sheet-head">
      <h2 id="fTitle">${isNew ? 'Nueva familia' : esc(f.name)}</h2>
      <button class="icon-btn" data-close aria-label="Cerrar">${ICON.close}</button>
    </div>
    <form class="sheet-body" id="fForm" novalidate>
      <div class="family-preview" id="fPreview">
        <span class="fdrop fdrop-lg" aria-hidden="true"></span>
        <div><strong id="fpName"></strong><span id="fpText"></span></div>
      </div>
      <div class="fields">
        <div class="field full"><label for="fName">Nombre</label><input id="fName" name="name" value="${esc(f.name)}" maxlength="40" placeholder="Gourmand, Acuáticos, Orientales…" required></div>
        <div class="field full"><label for="fText">Descripción corta</label><textarea id="fText" name="text" maxlength="120" placeholder="Qué notas tiene y cuándo se usa.">${esc(f.text)}</textarea><span class="counter"></span></div>
        <div class="field full">
          <span class="label">Color</span>
          <div class="swatches" role="radiogroup" aria-label="Color de la familia">
            ${FAMILY_COLORS.map((c) => `<button type="button" class="swatch" style="--c:${c}" data-color="${c}" role="radio" aria-checked="false" aria-label="Color ${c}"></button>`).join('')}
            <label class="swatch swatch-custom" aria-label="Otro color"><input type="color" name="color" value="${esc(f.color)}">+</label>
          </div>
        </div>
      </div>
      ${
        isNew
          ? ''
          : `<section class="card danger-zone">
          <h2>Borrar familia</h2>
          ${
            inUse
              ? `<p class="help">Esta familia tiene ${perfumes(f.products)}${f.upcoming ? ' y el próximo lanzamiento' : ''}. Elige a qué familia pasan antes de borrarla.</p>
                 <div class="field"><label for="fMove">Mover a</label><select id="fMove">${others.map((o) => `<option value="${esc(o.id)}">${esc(o.name)}</option>`).join('')}</select></div>`
              : '<p class="help">No tiene perfumes, se puede borrar sin afectar nada.</p>'
          }
          <button type="button" class="btn btn-danger" id="fDelete" style="margin-top:12px" ${others.length ? '' : 'disabled'}>Borrar familia</button>
        </section>`
      }
    </form>
    <div class="sheet-foot">
      <button class="btn btn-primary" id="fSave">${isNew ? 'Crear familia' : 'Guardar cambios'}</button>
    </div>`;
  document.body.appendChild(sheet);
  const form = $('#fForm', sheet);
  const colorInput = $('input[name=color]', sheet);
  bindCounters(form);

  function drawPreview() {
    const d = readForm(form);
    $('#fPreview', sheet).style.setProperty('--c', d.color);
    $('#fpName', sheet).textContent = d.name || 'Nombre de la familia';
    $('#fpText', sheet).textContent = d.text || 'Descripción corta';
    $$('.swatch[data-color]', sheet).forEach((s) => s.setAttribute('aria-checked', String(s.dataset.color.toUpperCase() === d.color.toUpperCase())));
  }
  drawPreview();
  form.addEventListener('input', drawPreview);
  $('.swatches', sheet).addEventListener('click', (e) => {
    const s = e.target.closest('[data-color]');
    if (!s) return;
    colorInput.value = s.dataset.color.toLowerCase();
    drawPreview();
  });

  const baseline = JSON.stringify(readForm(form));
  const dirty = () => JSON.stringify(readForm(form)) !== baseline;

  $('#fSave', sheet).addEventListener('click', (e) =>
    withLoading(e.currentTarget, async () => {
      try {
        const body = readForm(form);
        delete body.notes;
        if (isNew) await api('/api/admin/families', { method: 'POST', body });
        else await api(`/api/admin/families/${encodeURIComponent(f.id)}`, { method: 'PUT', body });
        toast(isNew ? 'Familia creada. Ya puedes asignarla a tus perfumes.' : 'Familia guardada');
        await onChange();
        close(true);
      } catch (err) {
        toast(err.message, true);
      }
    }),
  );

  $('#fDelete', sheet)?.addEventListener('click', async () => {
    const moveTo = $('#fMove', sheet)?.value;
    const target = others.find((o) => o.id === moveTo);
    const ok = await confirmDialog({
      title: `¿Borrar ${f.name}?`,
      text: inUse ? `Sus perfumes pasarán a "${target?.name}". Esto no se puede deshacer.` : 'Esto no se puede deshacer.',
      ok: 'Borrar',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/admin/families/${encodeURIComponent(f.id)}`, { method: 'DELETE', body: { moveTo } });
      toast('Familia borrada');
      await onChange();
      close(true);
    } catch (err) {
      toast(err.message, true);
    }
  });

  async function close(force = false) {
    if (!force && dirty() && !(await confirmDialog({ title: '¿Cerrar sin guardar?', text: 'Los cambios de esta familia se perderán.', ok: 'Cerrar' }))) return;
    sheet.classList.remove('is-open');
    setTimeout(() => {
      sheet.close();
      sheet.remove();
    }, 300);
  }
  sheet.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet || e.target.closest('[data-close]')) close();
  });
  sheet.showModal();
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('is-open')));
}

/* =========================================================
   Avisos de lanzamiento
   ========================================================= */
async function renderSubscribers(view) {
  const data = await api('/api/admin/subscribers');
  const pending = data.list.filter((s) => !s.notified_at);
  view.innerHTML = `
  <div class="view">
    <div class="view-head">
      <div><h1>Avisos</h1><p>Personas que pidieron que les avisaras de ${esc(data.launch.name)}.</p></div>
    </div>
    <div class="stats">
      <div class="stat"><strong>${data.list.length}</strong><span>en la lista</span></div>
      <div class="stat"><strong>${pending.length}</strong><span>sin avisar todavía</span></div>
    </div>
    <div class="notice">${ICON.info}<span>Cuando el perfume ya se pueda comprar: toca <strong>Copiar correos</strong>, abre Gmail, pégalos en <strong>CCO</strong> (copia oculta) y envía el aviso. Después toca <strong>Marcar como avisados</strong>.</span></div>
    <section class="card">
      <div class="toolbar" style="flex-wrap:wrap">
        <button class="btn btn-primary" id="copyAll" ${pending.length ? '' : 'disabled'}>Copiar ${pending.length} ${pending.length === 1 ? 'correo' : 'correos'}</button>
        <button class="btn btn-ghost" id="markAll" ${pending.length ? '' : 'disabled'}>Marcar como avisados</button>
        <button class="btn btn-ghost" id="csv" ${data.list.length ? '' : 'disabled'}>Descargar lista</button>
      </div>
      <div class="rows" id="subs">
        ${
          data.list.length
            ? data.list
                .map(
                  (s) => `
          <div class="row">
            <div class="row-main"><strong>${esc(s.email)}</strong><span>Se anotó el ${dateShort(s.created_at)}</span></div>
            ${s.notified_at ? '<span class="chip chip-ok">Avisado</span>' : '<span class="chip">Pendiente</span>'}
            <button class="icon-btn" data-remove="${esc(s.email)}" aria-label="Quitar ${esc(s.email)}">${ICON.trash}</button>
          </div>`,
                )
                .join('')
            : '<div class="empty"><strong>Todavía nadie</strong>Cuando alguien escriba su correo en "Avísame cuando llegue", aparecerá aquí.</div>'
        }
      </div>
    </section>
  </div>`;

  $('#copyAll').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pending.map((s) => s.email).join(', '));
      toast('Correos copiados. Pégalos en CCO en Gmail.');
    } catch {
      toast('No se pudo copiar. Descarga la lista.', true);
    }
  });
  $('#markAll').addEventListener('click', async (e) => {
    const ok = await confirmDialog({ title: '¿Marcar todos como avisados?', text: 'Hazlo después de enviar el correo.', ok: 'Marcar' });
    if (!ok) return;
    await withLoading(e.currentTarget, async () => {
      try {
        await api('/api/admin/subscribers/notified', { method: 'PUT', body: {} });
        toast('Listo');
        route();
      } catch (err) {
        toast(err.message, true);
      }
    });
  });
  $('#csv').addEventListener('click', () => {
    const rows = data.list.map((s) => `${s.email},${new Date(s.created_at).toISOString()},${s.notified_at ? 'si' : 'no'}`);
    const blob = new Blob([`\ufeffcorreo,fecha,avisado\n${rows.join('\n')}\n`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'avisos.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $('#subs').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-remove]');
    if (!b) return;
    if (!(await confirmDialog({ title: '¿Quitar este correo?', text: b.dataset.remove, ok: 'Quitar', danger: true }))) return;
    try {
      await api(`/api/admin/subscribers/${encodeURIComponent(b.dataset.remove)}`, { method: 'DELETE', body: {} });
      toast('Correo quitado');
      route();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

/* =========================================================
   Acceso
   ========================================================= */
async function renderDevices(view) {
  const admins = await api('/api/admin/admins');
  view.innerHTML = `
  <div class="view">
    <div class="view-head">
      <div><h1>Acceso</h1><p>Quién puede entrar al panel.</p></div>
    </div>
    <section class="card">
      <h2>Cuentas del panel</h2>
      <div class="rows">
        ${admins
          .map(
            (u) => `
          <div class="row">
            <span class="device-icon">${esc(u.name.slice(0, 1).toUpperCase())}</span>
            <div class="row-main"><strong>${esc(u.name)}</strong><span>@${esc(u.username)}</span></div>
          </div>`,
          )
          .join('')}
      </div>
      <p class="help" style="margin-top:12px">Las cuentas nuevas se crean desde Supabase (lo explica la guía PUBLICAR.md).</p>
    </section>
    <section class="card">
      <h2>Cambiar mi contraseña</h2>
      <form id="pwChange" novalidate>
        <div class="fields">
          <div class="field full"><label for="newPass">Contraseña nueva</label><input id="newPass" type="password" minlength="10" autocomplete="new-password" placeholder="Mínimo 10 caracteres" required></div>
        </div>
        <button class="btn btn-primary" type="submit" style="margin-top:12px">Guardar contraseña</button>
      </form>
    </section>
  </div>`;
  $('#pwChange').addEventListener('submit', (e) => {
    e.preventDefault();
    withLoading(e.submitter, async () => {
      try {
        await changePassword($('#newPass').value);
        $('#newPass').value = '';
        toast('Contraseña cambiada');
      } catch (err) {
        toast(err.message, true);
      }
    });
  });
}

/* =========================================================
   Inicio
   ========================================================= */
(async function boot() {
  app.innerHTML = '<div class="loading">Cargando…</div>';
  try {
    const s = await sessionStatus();
    if (s.loggedIn) renderShell();
    else renderLogin();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) renderLogin();
    else app.innerHTML = `<div class="loading">${esc(e.message)}</div>`;
  }
})();
