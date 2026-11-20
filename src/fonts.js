// Tipos de letra para las palabras grandes de "Destacados".
// Se cargan de Google Fonts solo los que de verdad se usan.
export const SHOWCASE_FONTS = {
  bodoni: { label: 'Bodoni (clásica de moda)', family: "'Bodoni Moda', serif", css: 'Bodoni+Moda:opsz,wght@6..96,500' },
  playfair: { label: 'Playfair (elegante)', family: "'Playfair Display', serif", css: 'Playfair+Display:wght@500' },
  dmserif: { label: 'DM Serif (revista)', family: "'DM Serif Display', serif", css: 'DM+Serif+Display' },
  gloock: { label: 'Gloock (editorial)', family: "'Gloock', serif", css: 'Gloock' },
  abril: { label: 'Abril (gruesa)', family: "'Abril Fatface', serif", css: 'Abril+Fatface' },
  cormorant: { label: 'Cormorant (fina)', family: "'Cormorant Garamond', serif", css: 'Cormorant+Garamond:wght@600' },
  italiana: { label: 'Italiana (delgada)', family: "'Italiana', serif", css: 'Italiana' },
  cinzel: { label: 'Cinzel (romana)', family: "'Cinzel', serif", css: 'Cinzel:wght@500' },
  jost: { label: 'Jost (moderna)', family: "'Jost', sans-serif", css: 'Jost:wght@300' },
};
export const DEFAULT_FONT = 'gloock';

// Agrega a la página la hoja de Google Fonts con las fuentes pedidas (una sola vez cada una).
const loaded = new Set();
export function loadFonts(ids) {
  const fresh = [...new Set(ids)].filter((id) => SHOWCASE_FONTS[id] && !loaded.has(id));
  if (!fresh.length) return;
  fresh.forEach((id) => loaded.add(id));
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${fresh.map((id) => `family=${SHOWCASE_FONTS[id].css}`).join('&')}&display=swap`;
  document.head.appendChild(link);
}
