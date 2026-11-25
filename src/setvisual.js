// Imagen de un set: todos los perfumes del set juntos, uno al lado del otro.
// Cada perfume usa su foto; si no tiene, se dibuja un frasco con su color.
import { bottleSVG } from './bottle.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const SHAPES = ['classic', 'tall', 'round', 'facet', 'flask'];
const CAPS = ['gold', 'dark', 'light', 'wood'];

export const isSet = (p) => p?.kind === 'set' && Array.isArray(p.items) && p.items.length > 0;

export function setVisualHTML(items = [], { lazy = true } = {}) {
  const list = items.slice(0, 6);
  const mid = (list.length - 1) / 2;
  return `<span class="set-visual" style="--n:${list.length}" role="img" aria-label="${esc(list.map((it) => it.name).filter(Boolean).join(', '))}">${list
    .map((it, i) => {
      const depth = Math.abs(i - mid); // los del centro van al frente y un poco más grandes
      const inner = it.photo
        ? `<img class="product-photo" src="${esc(it.photo)}" alt="" ${lazy ? 'loading="lazy"' : ''} decoding="async">`
        : bottleSVG({ liquid: it.liquid || '#B58A4C', shape: SHAPES[i % SHAPES.length], cap: CAPS[i % CAPS.length], fill: 0.72 });
      // --o: posición respecto al centro (negativa a la izquierda), para abrirlos en abanico al pasar el mouse.
      return `<span class="set-item" style="--d:${depth.toFixed(2)};--o:${(i - mid).toFixed(2)};--z:${10 - Math.round(depth * 2)}">${inner}</span>`;
    })
    .join('')}</span>`;
}
