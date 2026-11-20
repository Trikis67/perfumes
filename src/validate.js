// Validación de lo que se guarda desde el panel. Nada se guarda sin pasar por aquí.
export class ValidationError extends Error {}

const GENDERS = new Set(['Femenino', 'Masculino', 'Unisex']);
const SHAPES = ['classic', 'round', 'tall', 'facet', 'flask'];
const CAPS = ['gold', 'dark', 'light', 'wood'];

function text(v, field, { min = 0, max = 200 } = {}) {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  if (s.length < min) throw new ValidationError(`Falta ${field}.`);
  if (s.length > max) throw new ValidationError(`${field} es demasiado largo (máximo ${max} caracteres).`);
  // Los textos se muestran en la tienda: se rechazan los signos de etiquetas HTML.
  if (/[<>]/.test(s)) throw new ValidationError(`No uses los signos < o > en ${field}.`);
  return s;
}
function oneOf(v, set, field, fallback) {
  if (v == null || v === '') return fallback;
  if (!set.has(v)) throw new ValidationError(`${field} no es válido.`);
  return v;
}
function color(v, fallback) {
  if (v == null || v === '') return fallback;
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) throw new ValidationError('El color debe tener el formato #RRGGBB.');
  return v.toUpperCase();
}
function noteList(v, field) {
  const arr = (Array.isArray(v) ? v : String(v ?? '').split(','))
    .map((s) => String(s).trim())
    .filter(Boolean);
  if (arr.length > 6) throw new ValidationError(`Máximo 6 notas en ${field}.`);
  return arr.map((s) => text(s, field, { max: 40 }));
}
const notes = (v) => ({
  top: noteList(v?.top, '"al aplicarlo"'),
  heart: noteList(v?.heart, '"después de un rato"'),
  base: noteList(v?.base, '"al final del día"'),
});
function prices(v) {
  const out = {};
  for (const [ml, price] of Object.entries(v || {})) {
    const size = Number(ml);
    if (!Number.isInteger(size) || size < 1 || size > 1000) throw new ValidationError('Tamaño en ml no válido.');
    if (price === '' || price == null) continue;
    const value = Number(String(price).replace(/[.\s$]/g, ''));
    if (!Number.isFinite(value) || value < 0 || value > 50_000_000) throw new ValidationError('Precio no válido.');
    out[size] = Math.round(value);
  }
  if (!Object.keys(out).length) throw new ValidationError('Agrega al menos un precio.');
  return out;
}
function brandId(v, brands, fallback = null) {
  if (v === undefined) return fallback;
  if (v === null || v === '') return null;
  if (!brands.some((b) => b.id === v)) throw new ValidationError('La marca no es válida.');
  return v;
}

export function slugify(s) {
  return (
    String(s)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'perfume'
  );
}

// Forma y tapa del frasco provisional (mientras no hay foto): salen del nombre para que haya variedad.
function pickFromName(name, list) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return list[h % list.length];
}

export function cleanProduct(input, existing, { families, brands }) {
  const familyIds = new Set(families.map((f) => f.id));
  const name = text(input.name, 'el nombre', { min: 2, max: 60 });
  return {
    name,
    brand: brandId(input.brand, brands, existing.brand ?? null),
    family: oneOf(input.family, familyIds, 'La familia', existing.family || families[0]?.id),
    gender: oneOf(input.gender, GENDERS, 'El género', existing.gender || 'Unisex'),
    description: text(input.description, 'la descripción', { max: 400 }),
    tag: text(input.tag, 'la etiqueta', { max: 30 }) || null,
    notes: notes(input.notes),
    prices: prices(input.prices),
    liquid: color(input.liquid, existing.liquid || '#B58A4C'),
    shape: existing.shape || pickFromName(name, SHAPES),
    cap: existing.cap || pickFromName(`${name}·`, CAPS),
    photo: existing.photo ?? null,
  };
}

export function cleanUpcoming(input, existing, { families, brands }) {
  const launch = new Date(input.launch);
  if (Number.isNaN(launch.getTime())) throw new ValidationError('La fecha de lanzamiento no es válida.');
  const textColor = input.textColor === undefined ? (existing.textColor ?? null) : input.textColor ? color(input.textColor) : null;
  return {
    ...existing,
    name: text(input.name, 'el nombre', { min: 2, max: 60 }),
    edition: text(input.edition, 'el texto de la etiqueta', { max: 60 }),
    brand: brandId(input.brand, brands, existing.brand ?? null),
    family: oneOf(input.family, new Set(families.map((f) => f.id)), 'La familia', existing.family),
    gender: oneOf(input.gender, GENDERS, 'El género', existing.gender),
    description: text(input.description, 'la descripción', { max: 400 }),
    notes: notes(input.notes),
    launch: launch.toISOString(),
    liquid: color(input.liquid, existing.liquid),
    background: color(input.background, existing.background || '#0B0B0C'),
    textColor,
    silhouette: !!input.silhouette,
  };
}

export function cleanFamily(input, others) {
  const name = text(input.name, 'el nombre', { min: 2, max: 40 });
  if (others.some((f) => f.name.toLowerCase() === name.toLowerCase())) throw new ValidationError(`Ya existe una familia llamada "${name}".`);
  return { name, color: color(input.color, '#B58A4C'), text: text(input.text, 'la descripción', { max: 120 }) };
}

export function cleanBrand(input, others) {
  const name = text(input.name, 'el nombre', { min: 1, max: 40 });
  if (others.some((b) => b.name.toLowerCase() === name.toLowerCase())) throw new ValidationError(`Ya existe una marca llamada "${name}".`);
  return { name };
}

// Destacados: tarjeta con palabra grande al fondo, foto del frasco y a dónde lleva al tocarla.
const LINK_TYPES = new Set(['none', 'minis', 'full', 'brand', 'product']);
export function cleanSlide(input, existing, { fonts, brands, productIds }) {
  const word = text(input.word, 'la palabra', { min: 1, max: 28 });
  const type = oneOf(input.linkType, LINK_TYPES, 'El enlace', 'none');
  let linkId = null;
  if (type === 'brand') {
    if (!brands.some((b) => b.id === input.linkId)) throw new ValidationError('Elige la marca a la que lleva.');
    linkId = input.linkId;
  }
  if (type === 'product') {
    if (!productIds.has(input.linkId)) throw new ValidationError('Elige el perfume al que lleva.');
    linkId = input.linkId;
  }
  return {
    ...existing,
    word,
    font: oneOf(input.font, new Set(fonts), 'El tipo de letra', existing.font || fonts[0]),
    textColor: color(input.textColor, existing.textColor || '#1D1B19'),
    background: color(input.background, existing.background || '#D9D5CF'),
    linkType: type,
    linkId,
    visible: input.visible === undefined ? existing.visible !== false : !!input.visible,
    photo: existing.photo ?? null,
  };
}

export function cleanEmail(v) {
  const email = String(v ?? '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new ValidationError('Escribe un correo válido.');
  return email;
}
