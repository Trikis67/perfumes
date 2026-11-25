// Tarjeta de "Destacados": palabra gigante al fondo, frasco al frente, luz de ventana y piso con reflejo.
// La usan la tienda y la vista previa del panel, así se ven exactamente igual.
import './showcase.css';
import { SHOWCASE_FONTS, DEFAULT_FONT, loadFonts } from './fonts.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// "nuevos / ingresos" se muestra en dos líneas tal como lo pide el dueño.
// Sin "/", las palabras se reparten solas en líneas parejas (nunca se corta una palabra a la mitad).
export const wordLines = (word) => {
  const text = String(word || '').trim();
  if (text.includes('/'))
    return text
      .split('/')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 4);
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words;
  const total = words.join(' ').length;
  const longest = Math.max(...words.map((w) => w.length));
  const count = Math.min(4, words.length, Math.max(1, Math.round(total / Math.max(8, longest))));
  const target = Math.max(longest, Math.ceil(total / count));
  const lines = [];
  for (const w of words) {
    const last = lines.at(-1);
    // Si ya se usaron todas las líneas, se tolera que la última sea un poco más larga.
    const room = lines.length >= count ? target + 3 : target;
    if (last && `${last} ${w}`.length <= room) lines[lines.length - 1] = `${last} ${w}`;
    else lines.push(w);
  }
  return lines.slice(0, 4);
};

// Tamaño de la letra para que la línea más larga quepa a lo ancho y todas quepan a lo alto
// (la tarjeta mide 100 de ancho por 125 de alto; la palabra usa como máximo 96 × 74).
const wordSize = (lines, maxHeight = 74) => {
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const byWidth = 96 / (longest * 0.56);
  const byHeight = maxHeight / (lines.length * 0.88);
  return Math.min(34, byWidth, byHeight).toFixed(2);
};

// Dónde va la palabra: detrás del frasco, encima de la imagen, arriba o abajo.
export const WORD_POSITIONS = {
  behind: { label: 'Detrás del frasco', height: 74 },
  front: { label: 'Encima de la imagen', height: 74 },
  top: { label: 'Arriba', height: 27 },
  bottom: { label: 'Abajo', height: 24 },
};

// Tamaño de la palabra: "auto" llena el espacio (y se achica un poco si hay varios frascos).
export const WORD_SIZES = {
  auto: { label: 'Automático', factor: 1 },
  s: { label: 'Pequeño', factor: 0.55 },
  m: { label: 'Mediano', factor: 0.75 },
  l: { label: 'Grande', factor: 1 },
};
// Cuántos frascos se muestran como máximo cuando la tarjeta usa una categoría.
export const MAX_LINEUP = 5;

// Varios frascos sin fondo, uno al lado del otro: el del medio al frente y un poco más grande.
function lineupHTML(photos) {
  const list = photos.slice(0, MAX_LINEUP);
  const mid = (list.length - 1) / 2;
  return `<span class="sc-lineup" style="--n:${list.length}">${list
    .map((src, i) => {
      const d = Math.abs(i - mid);
      return `<img class="sc-lineup-img" src="${esc(src)}" alt="" loading="lazy" decoding="async" style="--d:${d.toFixed(2)};--o:${(i - mid).toFixed(2)};--z:${10 - Math.round(d * 2)}">`;
    })
    .join('')}</span>`;
}

// photos: si la tarjeta usa una categoría, las fotos de sus perfumes (se las pasa la tienda o el panel).
export function slideHTML(slide, { placeholder = '', photos = null } = {}) {
  const font = SHOWCASE_FONTS[slide.font] || SHOWCASE_FONTS[DEFAULT_FONT];
  const lines = wordLines(slide.word);
  const pos = WORD_POSITIONS[slide.wordPos] ? slide.wordPos : 'behind';
  const many = Array.isArray(photos) && photos.length > 0;
  const sizeKey = WORD_SIZES[slide.wordSize] ? slide.wordSize : 'auto';
  // Automático: con varios frascos la palabra se achica un poco para que se vean todos.
  const factor = sizeKey === 'auto' ? (many && photos.length > 1 && pos !== 'top' && pos !== 'bottom' ? 0.82 : 1) : WORD_SIZES[sizeKey].factor;
  const fs = (wordSize(lines, WORD_POSITIONS[pos].height) * factor).toFixed(2);
  loadFonts([slide.font || DEFAULT_FONT]);
  const image = many
    ? lineupHTML(photos)
    : slide.photo
      ? `<img class="sc-photo" src="${esc(slide.photo)}" alt="" loading="lazy" decoding="async">`
      : placeholder;
  return `
    <span class="sc-card sc-pos-${pos}${many ? ' has-lineup' : ''}" style="--bg:${esc(slide.background || '#D9D5CF')};--fg:${esc(slide.textColor || '#1D1B19')};--font:${esc(font.family)}">
      <span class="sc-light" aria-hidden="true"></span>
      <span class="sc-word" aria-hidden="true" style="--fs:${fs}cqw">${lines.map((l) => `<span>${esc(l)}</span>`).join('')}</span>
      ${image}
      <span class="sc-floor" aria-hidden="true"></span>
    </span>`;
}
