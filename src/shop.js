// Página Tienda: todos los perfumes con filtros (tipo, marca, para quién, familia, precio) y orden.
// Los filtros viven en la dirección (?tipo=minis&marca=...) para que los enlaces del menú lleguen ya filtrados.
import {
  products,
  usedBrands,
  families,
  $,
  $$,
  esc,
  hasMinis,
  hasFull,
  minPrice,
  brandName,
  cardHTML,
  revealCards,
  swap,
  initPage,
} from './store.js';

initPage();

const form = $('#filters');
const grid = $('#grid');
const FIELDS = ['tipo', 'marca', 'para', 'familia', 'precio', 'orden'];

// Opciones que dependen del catálogo.
$('#fMarca').insertAdjacentHTML('beforeend', usedBrands.map((b) => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join(''));
const usedFamilies = families.filter((f) => products.some((p) => p.family === f.id));
$('#fFamilia').insertAdjacentHTML('beforeend', usedFamilies.map((f) => `<option value="${esc(f.id)}">${esc(f.name)}</option>`).join(''));

// Lee los filtros de la dirección y los pone en el formulario (ignora valores que no existen).
function readUrl() {
  const q = new URLSearchParams(location.search);
  for (const name of FIELDS) {
    const sel = form.elements[name];
    const v = q.get(name) || '';
    sel.value = [...sel.options].some((o) => o.value === v) ? v : '';
  }
}
const state = () => Object.fromEntries(FIELDS.map((n) => [n, form.elements[n].value]));

function titleFor(s) {
  if (s.marca) return brandName(s.marca);
  if (s.tipo === 'minis') return 'Minis';
  if (s.tipo === 'completo') return 'Frascos completos';
  if (s.para === 'Femenino') return 'Para ella';
  if (s.para === 'Masculino') return 'Para él';
  if (s.para === 'Unisex') return 'Unisex';
  return 'Tienda';
}

function render() {
  const s = state();
  const [min, max] = (s.precio || '-').split('-').map((v) => (v === '' ? null : Number(v)));
  let list = products.filter(
    (p) =>
      (!s.tipo || (s.tipo === 'minis' ? hasMinis(p) : hasFull(p))) &&
      (!s.marca || p.brand === s.marca) &&
      (!s.para || p.gender === s.para) &&
      (!s.familia || p.family === s.familia) &&
      (min == null || minPrice(p) >= min) &&
      (max == null || minPrice(p) <= max),
  );
  if (s.orden === 'precio-asc') list = [...list].sort((a, b) => minPrice(a) - minPrice(b));
  if (s.orden === 'precio-desc') list = [...list].sort((a, b) => minPrice(b) - minPrice(a));
  if (s.orden === 'nombre') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'));

  grid.innerHTML = list.map(cardHTML).join('');
  revealCards(grid);
  const title = titleFor(s);
  $('#shopTitle').textContent = title;
  $('#crumbHere').textContent = title;
  document.title = `${title} · Ánima`;
  $('#shopCount').textContent = `${list.length} ${list.length === 1 ? 'perfume' : 'perfumes'}`;
  $('#gridEmpty').hidden = list.length > 0;
  const filtered = FIELDS.some((n) => n !== 'orden' && s[n]);
  $('#clearFilters').hidden = !filtered;
  $$('.filters .select').forEach((l) => l.classList.toggle('is-set', !!$('select', l).value && $('select', l).name !== 'orden'));
}

function syncUrl() {
  const q = new URLSearchParams(Object.entries(state()).filter(([, v]) => v)).toString();
  history.replaceState(null, '', q ? `?${q}` : location.pathname);
}

form.addEventListener('change', () => {
  syncUrl();
  swap(render);
});
form.addEventListener('submit', (e) => e.preventDefault());
const clear = () => {
  FIELDS.forEach((n) => (form.elements[n].value = ''));
  syncUrl();
  swap(render);
};
$('#clearFilters').addEventListener('click', clear);
$('#clearFilters2').addEventListener('click', clear);

// Los enlaces "Tienda" y "Minis" dentro de esta misma página solo cambian los filtros (sin recargar).
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="./"], a[href^="../tienda/"]');
  if (!a) return;
  const url = new URL(a.href, location.href);
  if (url.pathname !== location.pathname) return;
  e.preventDefault();
  history.replaceState(null, '', url.search || location.pathname);
  readUrl();
  swap(render);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

readUrl();
render();
