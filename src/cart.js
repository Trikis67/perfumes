// Carrito: se guarda en el navegador del cliente y al final el pedido completo se envía por WhatsApp,
// con la foto de cada producto en el carrito y el enlace a su foto en el mensaje.
const KEY = 'anima-cart';
const MAX_QTY = 20;
const round2 = (n) => Math.round(Number(n) * 100) / 100;

const ICON_BAG =
  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8Z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const ICON_TRASH =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>';

// Recomendados: al azar entre la misma familia, la misma categoría o los más recientes del catálogo.
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
function pickRecommended(products, inCart, familiesOf, howMany = 6) {
  const taken = new Set(inCart.map((p) => p.id));
  const free = products.filter((p) => !taken.has(p.id));
  const families = new Set(inCart.flatMap(familiesOf));
  const cats = new Set(inCart.map((p) => p.category).filter(Boolean));
  const pools = [
    free.filter((p) => familiesOf(p).some((f) => families.has(f))), // misma familia
    free.filter((p) => cats.has(p.category)), // misma categoría
    free.slice(-8), // los más recientes (los últimos agregados en el panel)
  ].filter((pool) => pool.length);
  const out = [];
  // Cada lugar se llena desde un grupo elegido al azar; si se agotan, se completa con cualquiera.
  while (out.length < howMany && pools.some((pool) => pool.length)) {
    const live = pools.filter((pool) => pool.length);
    const pool = live[Math.floor(Math.random() * live.length)];
    const p = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    if (!out.includes(p)) out.push(p);
  }
  for (const p of shuffle(free)) if (out.length < howMany && !out.includes(p)) out.push(p);
  return out;
}

export function createCart({ products, productById, fmt, esc, visualFor, brandName, isSet, waLink, miniMax, protectionHTML, reduceMotion, minPrice, sizesOf, familiesOf }) {
  // Se leen solo los productos y tamaños que siguen existiendo (los precios siempre se toman del catálogo actual).
  const read = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY)) || [];
      return raw
        .filter((x) => productById[x.id]?.prices?.[x.ml] != null)
        .map((x) => ({ id: x.id, ml: Number(x.ml), qty: Math.max(1, Math.min(MAX_QTY, Number(x.qty) || 1)) }));
    } catch {
      return [];
    }
  };
  let lines = read();
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* sin almacenamiento: el carrito dura mientras la página esté abierta */
    }
  };
  const priceOf = (l) => productById[l.id].prices[l.ml];
  const count = () => lines.reduce((s, l) => s + l.qty, 0);
  const total = () => round2(lines.reduce((s, l) => s + priceOf(l) * l.qty, 0));
  const sizeLabel = (p, ml) => (isSet(p) ? `Set de ${p.items.length}` : `${ml} ml${ml <= miniMax ? ' · Decant' : ''}`);

  /* ---------- Botón en la barra y panel del carrito ---------- */
  document.querySelector('.nav-end')?.insertAdjacentHTML(
    'afterbegin',
    `<button class="cart-btn" id="cartBtn" type="button" aria-haspopup="dialog">${ICON_BAG}<span class="cart-count" id="cartCount" hidden></span></button>`,
  );
  document.body.insertAdjacentHTML(
    'beforeend',
    `<dialog class="cart" id="cart" aria-labelledby="cartTitle">
      <div class="cart-layout">
        <section class="cart-main">
          <div class="cart-head">
            <h2 id="cartTitle">Tu carrito</h2>
            <button class="icon-btn" id="cartClose" type="button" aria-label="Cerrar carrito">${ICON_CLOSE}</button>
          </div>
          <div class="cart-body" id="cartBody"></div>
          <div class="cart-foot" id="cartFoot"></div>
        </section>
        <aside class="cart-recs" aria-labelledby="recsTitle">
          <h3 id="recsTitle">Recomendados para ti</h3>
          <div class="recs-grid" id="cartRecs"></div>
        </aside>
      </div>
    </dialog>
    <div class="cart-toast" id="cartToast" role="status" aria-live="polite"></div>`,
  );
  const dialog = document.getElementById('cart');
  const btn = document.getElementById('cartBtn');

  function updateBadge() {
    const n = count();
    const badge = document.getElementById('cartCount');
    badge.textContent = n;
    badge.hidden = n === 0;
    btn.setAttribute('aria-label', n ? `Carrito, ${n} ${n === 1 ? 'producto' : 'productos'}` : 'Carrito vacío');
  }

  function render() {
    const body = document.getElementById('cartBody');
    const foot = document.getElementById('cartFoot');
    if (!lines.length) {
      body.innerHTML = `<div class="cart-empty">${ICON_BAG}<p><strong>Tu carrito está vacío</strong>Abre un perfume y toca "Agregar al carrito".</p><button class="btn" type="button" data-cart-close>Ver perfumes</button></div>`;
      foot.innerHTML = '';
      return;
    }
    body.innerHTML = `<ul class="cart-list">${lines
      .map((l, i) => {
        const p = productById[l.id];
        const brand = brandName(p.brand);
        return `
        <li class="cart-line">
          <span class="cart-thumb" style="--liq:${esc(p.liquid || '#B58A4C')}">${visualFor(p)}</span>
          <div class="cart-info">
            ${brand ? `<span class="cart-brand">${esc(brand)}</span>` : ''}
            <strong class="cart-name">${esc(p.name)}</strong>
            <span class="cart-size">${esc(sizeLabel(p, l.ml))}</span>
            ${isSet(p) ? `<span class="cart-set">${esc(p.items.map((it) => `${it.name} ${it.ml} ml`).join(' · '))}</span>` : ''}
            <div class="cart-qty" role="group" aria-label="Cantidad de ${esc(p.name)}">
              <button type="button" data-qty="${i}" data-d="-1" aria-label="Quitar uno" ${l.qty <= 1 ? 'disabled' : ''}>−</button>
              <span aria-live="polite">${l.qty}</span>
              <button type="button" data-qty="${i}" data-d="1" aria-label="Agregar uno" ${l.qty >= MAX_QTY ? 'disabled' : ''}>+</button>
            </div>
          </div>
          <div class="cart-side">
            <span class="cart-price">${fmt(round2(priceOf(l) * l.qty))}</span>
            ${l.qty > 1 ? `<small>${fmt(priceOf(l))} c/u</small>` : ''}
            <button class="icon-btn cart-remove" type="button" data-remove="${i}" aria-label="Quitar ${esc(p.name)} del carrito">${ICON_TRASH}</button>
          </div>
        </li>`;
      })
      .join('')}</ul>`;
    foot.innerHTML = `
      ${protectionHTML(false)}
      <div class="cart-total"><span>Total <small>(${count()} ${count() === 1 ? 'producto' : 'productos'})</small></span><strong>${fmt(total())}</strong></div>
      <a class="btn btn-block" id="cartSend" href="${esc(waLink(message()))}" target="_blank" rel="noopener">Enviar pedido por WhatsApp</a>
      <button class="cart-continue" type="button" data-cart-close>Seguir comprando</button>`;
  }

  // Tamaño que se agrega desde Recomendados: el mismo que viene marcado en el detalle (el más grande).
  const defaultMl = (p) => sizesOf(p).at(-1);
  let recs = [];
  function renderRecs(fresh = false) {
    if (fresh || !recs.length) recs = pickRecommended(products, lines.map((l) => productById[l.id]), familiesOf);
    else recs = recs.filter((p) => !lines.some((l) => l.id === p.id));
    const box = document.getElementById('cartRecs');
    box.closest('.cart-recs').hidden = !recs.length;
    box.innerHTML = recs
      .map((p) => {
        const brand = brandName(p.brand);
        return `
      <article class="rec">
        <button class="rec-stage" type="button" data-open="${esc(p.id)}" aria-label="Ver ${esc(p.name)}" style="--liq:${esc(p.liquid || '#B58A4C')}">${p.tag ? `<span class="card-tag">${esc(p.tag)}</span>` : ''}${visualFor(p)}</button>
        <div class="rec-info">
          ${brand ? `<span class="cart-brand">${esc(brand)}</span>` : ''}
          <button class="rec-name" type="button" data-open="${esc(p.id)}">${esc(p.name)}</button>
          <span class="rec-price">${isSet(p) ? `${fmt(minPrice(p))} · Set de ${p.items.length}` : `desde ${fmt(minPrice(p))}`}</span>
          <button class="rec-add" type="button" data-rec-add="${esc(p.id)}">Agregar ${isSet(p) ? 'set' : `${defaultMl(p)} ml`}</button>
        </div>
      </article>`;
      })
      .join('');
  }

  // Mensaje de WhatsApp con todo el pedido y el enlace a la foto de cada producto.
  function message() {
    const rows = lines.map((l, i) => {
      const p = productById[l.id];
      const brand = brandName(p.brand);
      const photos = isSet(p) ? p.items.map((it) => it.photo).filter(Boolean) : p.photo ? [p.photo] : [];
      return [
        `${i + 1}. ${p.name}${brand ? ` (${brand})` : ''} · ${sizeLabel(p, l.ml)} × ${l.qty} = ${fmt(round2(priceOf(l) * l.qty))}`,
        isSet(p) ? `   Incluye: ${p.items.map((it) => `${it.name} ${it.ml} ml`).join(', ')}` : null,
        ...photos.map((u) => `   Foto: ${u}`),
      ]
        .filter(Boolean)
        .join('\n');
    });
    return `Hola, quiero hacer este pedido:\n\n${rows.join('\n\n')}\n\nTotal: ${fmt(total())}\nIncluye Shipping Protection.\n\nMi nombre: \nMi dirección y ciudad: `;
  }

  function open() {
    render();
    renderRecs(true); // cada vez que se abre, recomendados nuevos al azar
    dialog.showModal();
    document.body.classList.add('is-locked');
    requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('is-open')));
    setTimeout(() => dialog.classList.add('is-open'), 60); // respaldo si la pestaña pausa las animaciones
  }
  function close() {
    if (!dialog.open) return;
    dialog.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    setTimeout(() => dialog.close(), reduceMotion ? 0 : 260);
  }
  let toastTimer;
  function toast(text) {
    const t = document.getElementById('cartToast');
    t.innerHTML = `<span>${esc(text)}</span><button type="button" data-cart-open>Ver carrito</button>`;
    t.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-visible'), 3500);
  }

  function add(id, ml, qty = 1) {
    const p = productById[id];
    if (!p || p.prices[ml] == null) return;
    const line = lines.find((l) => l.id === id && l.ml === Number(ml));
    if (line) line.qty = Math.min(MAX_QTY, line.qty + qty);
    else lines.push({ id, ml: Number(ml), qty });
    save();
    updateBadge();
    if (dialog.open) {
      render();
      renderRecs();
    }
    toast(`${p.name} agregado al carrito`);
    btn.classList.remove('is-bump');
    void btn.offsetWidth;
    btn.classList.add('is-bump');
  }

  btn.addEventListener('click', open);
  document.getElementById('cartClose').addEventListener('click', close);
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.closest('[data-cart-close]')) return close();
    const recAdd = e.target.closest('[data-rec-add]');
    if (recAdd) {
      const p = productById[recAdd.dataset.recAdd];
      return add(p.id, defaultMl(p));
    }
    const q = e.target.closest('[data-qty]');
    if (q) {
      const l = lines[Number(q.dataset.qty)];
      l.qty = Math.max(1, Math.min(MAX_QTY, l.qty + Number(q.dataset.d)));
    }
    const r = e.target.closest('[data-remove]');
    if (r) lines.splice(Number(r.dataset.remove), 1);
    if (q || r) {
      save();
      updateBadge();
      render();
    }
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-cart-open]')) {
      document.getElementById('cartToast').classList.remove('is-visible');
      open();
    }
  });
  // Si el carrito cambia en otra pestaña, se actualiza aquí también.
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    lines = read();
    updateBadge();
    if (dialog.open) render();
  });

  updateBadge();
  return { add, open };
}
