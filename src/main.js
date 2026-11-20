// Portada: Próximamente, Destacados, minis, marcas y preguntas. Los perfumes en venta están en la página Tienda.
import { subscribeToLaunch } from './api.js';
import { NOTIFY_ENABLED } from './config.js';
import { slideHTML } from './showcase.js';
import {
  products,
  upcoming,
  showcase,
  usedBrands,
  $,
  $$,
  esc,
  reduceMotion,
  brandName,
  familyName,
  bottleFor,
  openModal,
  shopUrl,
  initPage,
} from './store.js';

initPage();

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
  // El nombre entra letra por letra (los lectores de pantalla leen el nombre completo).
  const nameEl = $('#heroName');
  nameEl.setAttribute('aria-label', d.name);
  let n = 0;
  nameEl.innerHTML = d.name
    .split(' ')
    .map((w) => `<span class="hw" aria-hidden="true">${[...w].map((ch) => `<span class="hc" style="--c:${n++}">${esc(ch)}</span>`).join('')}</span>`)
    .join(' ');
  $('#heroLead').textContent = d.edition || 'Muy pronto.';
  $('#heroDesc').textContent = [familyName(d.family), d.gender].filter(Boolean).join(' · ');
  $('.hero-btn').href = shopUrl();

  // Escenario: solo el Próximamente. La foto principal al centro y, si el dueño subió más fotos
  // del lanzamiento, se acomodan a los lados.
  const side = (d.photos || []).slice(1, 5);
  const sideHTML = (src, cls) => `<span class="lineup-side ${cls}"><img class="product-photo" src="${esc(src)}" alt="" decoding="async"></span>`;
  $('#heroLineup').innerHTML = [
    side[2] && sideHTML(side[2], 'is-far'),
    side[0] && sideHTML(side[0], 'is-near'),
    `<button class="hero-bottle" id="heroBottle" type="button"></button>`,
    side[1] && sideHTML(side[1], 'is-near'),
    side[3] && sideHTML(side[3], 'is-far'),
  ]
    .filter(Boolean)
    .join('');

  const bottle = $('#heroBottle');
  hero.dataset.silhouette = String(d.silhouette !== false);
  bottle.innerHTML = d.photos?.[0] ? `<img class="hero-photo" src="${esc(d.photos[0])}" alt="" decoding="async" fetchpriority="high">` : bottleFor(d, { fill: 0.7 });
  bottle.setAttribute('aria-label', `${d.name}, todavía no disponible`);
  bottle.addEventListener('click', () => {
    bottle.classList.remove('is-wobbling');
    void bottle.offsetWidth;
    bottle.classList.add('is-wobbling');
  });

  bindHeroDepth();
  tick();
  const timer = setInterval(() => tick() || clearInterval(timer), 1000);
  if (NOTIFY_ENABLED) bindNotify(d);
  else $('#notifyForm').remove();
  // El temporizador es de respaldo: algunos navegadores pausan requestAnimationFrame
  // y la portada nunca debe quedarse invisible.
  const show = () => hero.classList.add('is-in');
  requestAnimationFrame(show);
  setTimeout(show, 120);
}

// Profundidad de la portada: el frasco gira apenas siguiendo el mouse (3D) y, al bajar,
// el escenario se aleja más lento que el texto. Todo con transform/opacity para que sea fluido.
function bindHeroDepth() {
  if (reduceMotion) return;
  const stage = $('.hero-stage');
  const copy = $('.hero-copy');
  let raf = 0;
  let mx = 0;
  let my = 0;
  const apply = () => {
    raf = 0;
    const y = Math.min(window.scrollY, innerHeight);
    const p = y / innerHeight;
    stage.style.setProperty('--sy', `${(y * 0.18).toFixed(1)}px`);
    stage.style.setProperty('--sc', (1 - p * 0.06).toFixed(3));
    copy.style.setProperty('--cy', `${(y * 0.32).toFixed(1)}px`);
    copy.style.setProperty('--co', (1 - p * 1.1).toFixed(3));
    hero.style.setProperty('--rx', `${(-my * 7).toFixed(2)}deg`);
    hero.style.setProperty('--ry', `${(mx * 12).toFixed(2)}deg`);
  };
  const queue = () => (raf ||= requestAnimationFrame(apply));
  window.addEventListener('scroll', queue, { passive: true });
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      my = (e.clientY - r.top) / r.height - 0.5;
      queue();
    });
    hero.addEventListener('pointerleave', () => {
      mx = my = 0;
      queue();
    });
  }
  apply();
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
  // Solo el número que cambia hace un pequeño salto.
  const set = (id, v) => {
    const el = $(id);
    if (!el || el.textContent === v) return;
    el.textContent = v;
    if (reduceMotion) return;
    el.classList.remove('flip');
    void el.offsetWidth;
    el.classList.add('flip');
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
   Destacados: carrusel de tarjetas grandes (solo si el dueño creó alguna con foto)
   ========================================================= */
const slides = showcase.filter((x) => x.visible !== false && x.photo);
const scSection = $('#destacados');
if (!slides.length) scSection.remove();
else {
  const track = $('#scTrack');
  const linkOf = (x) =>
    x.linkType === 'minis'
      ? shopUrl({ tipo: 'minis' })
      : x.linkType === 'full'
        ? shopUrl({ tipo: 'completo' })
        : x.linkType === 'brand' && x.linkId
          ? shopUrl({ marca: x.linkId })
          : null;
  track.innerHTML = slides
    .map((x) => {
      const inner = slideHTML(x);
      const label = esc(x.word.replace(/\//g, ' '));
      if (x.linkType === 'product' && x.linkId) return `<li class="sc-slide"><button data-open="${esc(x.linkId)}" aria-label="${label}">${inner}</button></li>`;
      const href = linkOf(x);
      return `<li class="sc-slide">${href ? `<a href="${esc(href)}" aria-label="${label}">${inner}</a>` : `<div role="img" aria-label="${label}">${inner}</div>`}</li>`;
    })
    .join('');

  // La tarjeta más cercana al centro se ve más grande, como en una vitrina.
  const items = $$('.sc-slide', track);
  let raf = 0;
  const markCenter = () => {
    raf = 0;
    const mid = track.getBoundingClientRect().left + track.clientWidth / 2;
    let best = null;
    let bestD = Infinity;
    for (const it of items) {
      const r = it.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bestD) [best, bestD] = [it, d];
    }
    const ci = items.indexOf(best);
    items.forEach((it, i) => {
      it.classList.toggle('is-center', i === ci);
      it.classList.toggle('is-left', i < ci);
      it.classList.toggle('is-right', i > ci);
    });
  };
  track.addEventListener('scroll', () => (raf ||= requestAnimationFrame(markCenter)), { passive: true });
  window.addEventListener('resize', markCenter);
  markCenter();
  setTimeout(markCenter, 200);
  // Empieza en la del medio cuando hay varias.
  if (items.length > 2) {
    const midItem = items[Math.floor(items.length / 2)];
    track.scrollLeft = midItem.offsetLeft - (track.clientWidth - midItem.offsetWidth) / 2;
  }
  const step = (dir) => {
    const cur = items.findIndex((it) => it.classList.contains('is-center'));
    const next = items[Math.max(0, Math.min(items.length - 1, cur + dir))];
    track.scrollTo({ left: next.offsetLeft - (track.clientWidth - next.offsetWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  $('#scPrev').addEventListener('click', () => step(-1));
  $('#scNext').addEventListener('click', () => step(1));
  $('.sc-nav', scSection).hidden = items.length < 2;
}

/* ---------- Marcas: cada una lleva a la Tienda filtrada ---------- */
$('#marcas .brand-col').hidden = !usedBrands.length;
$('#brandList').innerHTML = usedBrands
  .map((b) => {
    const n = products.filter((p) => p.brand === b.id).length;
    return `<li><a href="${esc(shopUrl({ marca: b.id }))}"><span><strong>${esc(b.name)}</strong><small>${n} ${n === 1 ? 'perfume' : 'perfumes'}</small></span><i aria-hidden="true">→</i></a></li>`;
  })
  .join('');

// Si la portada se abre con #perfume-id (por ejemplo desde un Destacado), se abre su detalle.
const fromHash = decodeURIComponent(location.hash.slice(1));
if (fromHash && products.some((p) => p.id === fromHash)) openModal(fromHash);

renderHero();
