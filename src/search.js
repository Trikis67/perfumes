// Buscador de perfumes que entiende errores de escritura ("1 milion blak" → 1 Million Black)
// y, si no encuentra nada, sugiere lo que la persona pudo haber querido buscar ("¿Quisiste decir…?").

// Minúsculas, sin acentos ni signos: "Ámbar  Rosa!" → "ambar rosa".
export const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();

// Cuántas letras hay que cambiar para pasar de una palabra a otra (incluye letras intercambiadas: "mlilion").
function distance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}
// Parecido entre 0 y 1. Lo que empieza igual cuenta casi como acierto ("lat" → "lattafa").
function similar(q, w) {
  if (!q || !w) return 0;
  if (q === w) return 1;
  if (w.startsWith(q)) return q.length >= 2 ? 0.95 : 0.6;
  const cut = w.slice(0, Math.max(q.length, Math.min(w.length, q.length + 1)));
  const best = Math.min(distance(q, w), distance(q, cut));
  return 1 - best / Math.max(q.length, Math.min(w.length, q.length + 2));
}

export function createSearch({ products, brandName, familyName, categoryNamesOf, familiesOf }) {
  // Lo que se puede buscar de cada perfume: nombre y marca pesan más; familias, categoría y notas también cuentan.
  const index = products.map((p) => {
    const strong = norm(`${p.name} ${brandName(p.brand)}`);
    const notes = ['top', 'heart', 'base'].flatMap((k) => p.notes?.[k] || []);
    const set = p.kind === 'set' ? (p.items || []).map((it) => it.name) : [];
    const weak = norm([...categoryNamesOf(p), ...familiesOf(p).map(familyName), ...notes, ...set, p.gender].join(' '));
    return { p, strong, weak, strongWords: strong.split(' '), weakWords: weak.split(' ').filter(Boolean), joined: strong.replace(/ /g, '') };
  });
  // Palabras "bonitas" para sugerir: nombres de perfume, marcas, familias, categorías y notas tal como se escriben.
  const vocab = new Map();
  const addTerm = (label, kind) => {
    const key = norm(label);
    if (key && !vocab.has(key)) vocab.set(key, { label, kind, key });
  };
  for (const { p } of index) {
    addTerm(p.name, 'perfume');
    if (brandName(p.brand)) addTerm(brandName(p.brand), 'marca');
    familiesOf(p).forEach((f) => familyName(f) && addTerm(familyName(f), 'familia'));
    categoryNamesOf(p).forEach((n) => addTerm(n, 'categoría'));
    ['top', 'heart', 'base'].flatMap((k) => p.notes?.[k] || []).forEach((n) => addTerm(n, 'nota'));
  }

  function scoreOf(entry, q, words) {
    if (entry.strong.includes(q)) return 3; // aparece tal cual en el nombre o la marca
    if (entry.joined.includes(q.replace(/ /g, ''))) return 2.8; // "1million" = "1 million"
    // Palabra por palabra, con tolerancia a errores. El nombre y la marca pesan más que notas o familias.
    let strongSum = 0;
    let total = 0;
    for (const w of words) {
      const s = Math.max(0, ...entry.strongWords.map((x) => similar(w, x)));
      const weak = Math.max(0, ...entry.weakWords.map((x) => similar(w, x))) * 0.85;
      const best = Math.max(s, weak);
      if (best < 0.6) return entry.weak.includes(q) ? 1.9 : 0; // una palabra que no se parece a nada
      strongSum += s;
      total += best;
    }
    const fuzzy = total / words.length;
    const nameLike = strongSum / words.length;
    // Muy parecido al nombre o la marca ("ambr" → Ámbar Salvaje) va antes que una nota exacta.
    return Math.max(nameLike >= 0.75 ? nameLike * 2.7 : 0, entry.weak.includes(q) ? 1.9 : 0, fuzzy);
  }
  // Palabras que no ayudan a encontrar ("perfume de oud" busca "oud").
  const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'con', 'para', 'un', 'una', 'perfume', 'perfumes', 'fragancia', 'colonia', 'the', 'of']);

  // Devuelve los perfumes encontrados y, si hace falta, sugerencias de lo que quiso escribir.
  function search(query, limit = 40) {
    const full = norm(query);
    if (!full) return { q: full, results: [], exact: true, suggestions: [] };
    const kept = full.split(' ').filter((w) => !STOP.has(w));
    const q = kept.length ? kept.join(' ') : full; // si solo escribió "perfume", se busca tal cual
    const words = q.split(' ');
    const scored = index
      .map((e) => ({ p: e.p, score: scoreOf(e, q, words) }))
      .filter((x) => x.score >= 0.62)
      .sort((a, b) => b.score - a.score);
    const exact = scored.some((x) => x.score >= 2);
    let suggestions = [];
    if (!exact) {
      // "¿Quisiste decir…?": términos del catálogo que se parecen a lo escrito.
      suggestions = [...vocab.values()]
        .map((t) => {
          const tw = t.key.split(' ');
          const perWord = words.map((w) => Math.max(...tw.map((x) => similar(w, x))));
          const whole = 1 - distance(q, t.key) / Math.max(q.length, t.key.length);
          // Con varias palabras, también cuenta que una sola se parezca mucho ("canella negra" → Canela).
          const one = words.length > 1 && tw.length === 1 ? Math.max(...perWord) * 0.9 : 0;
          return { ...t, score: Math.max(whole, perWord.reduce((a, b) => a + b, 0) / words.length, one) };
        })
        .filter((t) => t.score >= 0.62 && t.key !== q)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
    }
    return { q, results: scored.slice(0, limit).map((x) => x.p), exact, suggestions };
  }
  return search;
}

const ICON_SEARCH = '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

// Lupa en la barra + panel de búsqueda con resultados mientras se escribe.
export function mountSearch({ search, products, fmt, esc, visualFor, brandName, minPrice, isSet, shopUrl, reduceMotion }) {
  document.querySelector('.nav-end')?.insertAdjacentHTML(
    'afterbegin',
    `<button class="search-btn" id="searchBtn" type="button" aria-label="Buscar perfumes" aria-haspopup="dialog">${ICON_SEARCH}</button>`,
  );
  document.body.insertAdjacentHTML(
    'beforeend',
    `<dialog class="search-panel" id="searchPanel" aria-label="Buscar perfumes">
      <form class="search-bar" id="searchForm" role="search">
        ${ICON_SEARCH}
        <input id="searchInput" type="search" placeholder="Busca un perfume, marca o aroma" aria-label="Buscar" autocomplete="off" enterkeyhint="search">
        <button class="icon-btn" type="button" id="searchClose" aria-label="Cerrar búsqueda">${ICON_CLOSE}</button>
      </form>
      <div class="search-body" id="searchBody" aria-live="polite"></div>
    </dialog>`,
  );
  const panel = document.getElementById('searchPanel');
  const input = document.getElementById('searchInput');
  const body = document.getElementById('searchBody');
  const chip = (label, kind = '') => `<button type="button" class="search-chip" data-term="${esc(label)}">${esc(label)}${kind ? `<small>${esc(kind)}</small>` : ''}</button>`;
  const brandsUsed = [...new Set(products.map((p) => brandName(p.brand)).filter(Boolean))].slice(0, 8);

  function row(p) {
    const brand = brandName(p.brand);
    return `<li><button type="button" class="search-row" data-open="${esc(p.id)}">
      <span class="search-thumb" style="--liq:${esc(p.liquid || '#B58A4C')}">${visualFor(p)}</span>
      <span class="search-text">${brand ? `<small>${esc(brand)}</small>` : ''}<strong>${esc(p.name)}</strong></span>
      <span class="search-price">${isSet(p) ? '' : 'desde '}${fmt(minPrice(p))}</span>
    </button></li>`;
  }
  function render() {
    const { q, results, exact, suggestions } = search(input.value);
    if (!q) {
      body.innerHTML = brandsUsed.length ? `<p class="search-label">Marcas</p><div class="search-chips">${brandsUsed.map((b) => chip(b)).join('')}</div>` : '';
      return;
    }
    const didYouMean = suggestions.length
      ? `<p class="search-label">¿Quisiste decir…?</p><div class="search-chips">${suggestions.map((s) => chip(s.label, s.kind)).join('')}</div>`
      : '';
    if (!results.length) {
      body.innerHTML = `<p class="search-empty">No encontramos "${esc(input.value.trim())}".</p>${didYouMean || '<p class="search-hint">Prueba con el nombre de la marca o un aroma, por ejemplo "vainilla".</p>'}`;
      return;
    }
    body.innerHTML = `
      ${didYouMean}
      <p class="search-label">${exact ? 'Perfumes' : 'Resultados parecidos'}</p>
      <ul class="search-list">${results.slice(0, 8).map(row).join('')}</ul>
      ${results.length > 8 ? `<a class="search-all" href="${esc(shopUrl({ q: input.value.trim() }))}">Ver los ${results.length} resultados</a>` : ''}`;
  }

  let t;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(render, 70);
  });
  document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (v) location.href = shopUrl({ q: v });
  });
  body.addEventListener('click', (e) => {
    const c = e.target.closest('[data-term]');
    if (c) {
      input.value = c.dataset.term;
      render();
      input.focus();
    }
    if (e.target.closest('[data-open]')) close(); // el detalle se abre encima
  });

  function open() {
    render();
    panel.showModal();
    document.body.classList.add('is-locked');
    requestAnimationFrame(() => panel.classList.add('is-open'));
    setTimeout(() => panel.classList.add('is-open'), 60);
    input.focus();
    input.select();
  }
  function close() {
    if (!panel.open) return;
    panel.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    setTimeout(() => panel.close(), reduceMotion ? 0 : 220);
  }
  document.getElementById('searchBtn').addEventListener('click', open);
  document.getElementById('searchClose').addEventListener('click', close);
  panel.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  panel.addEventListener('click', (e) => {
    if (e.target === panel) close();
  });
  // Atajo: tecla "/" para buscar (en computadora).
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable]') && !document.querySelector('dialog[open]')) {
      e.preventDefault();
      open();
    }
  });
}
