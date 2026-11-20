// Tarjeta de "Destacados": palabra gigante al fondo, frasco al frente, luz de ventana y piso con reflejo.
// La usan la tienda y la vista previa del panel, así se ven exactamente igual.
import './showcase.css';
import { SHOWCASE_FONTS, DEFAULT_FONT, loadFonts } from './fonts.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// "nuevos / ingresos" se muestra en dos líneas.
export const wordLines = (word) =>
  String(word || '')
    .split('/')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4);

export function slideHTML(slide, { placeholder = '' } = {}) {
  const font = SHOWCASE_FONTS[slide.font] || SHOWCASE_FONTS[DEFAULT_FONT];
  const lines = wordLines(slide.word);
  loadFonts([slide.font || DEFAULT_FONT]);
  return `
    <span class="sc-card" style="--bg:${esc(slide.background || '#D9D5CF')};--fg:${esc(slide.textColor || '#1D1B19')};--font:${esc(font.family)}">
      <span class="sc-light" aria-hidden="true"></span>
      <span class="sc-word" aria-hidden="true">${lines.map((l) => `<span>${esc(l)}</span>`).join('')}</span>
      ${slide.photo ? `<img class="sc-photo" src="${esc(slide.photo)}" alt="" loading="lazy" decoding="async">` : placeholder}
      <span class="sc-floor" aria-hidden="true"></span>
    </span>`;
}
