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
// Dinero en quetzales con centavos: "3.99", "Q1,250.50" o "1250". La coma es de miles, el punto de decimales.
export const round2 = (n) => Math.round(Number(n) * 100) / 100;
export function parseMoney(v) {
  const s = String(v ?? '').replace(/[\s,Qq$]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return round2(Number(s));
}
function prices(v) {
  const out = {};
  for (const [ml, price] of Object.entries(v || {})) {
    const size = Number(ml);
    if (!Number.isInteger(size) || size < 1 || size > 1000) throw new ValidationError('Tamaño en ml no válido.');
    if (price === '' || price == null) continue;
    const value = parseMoney(price);
    if (!Number.isFinite(value) || value > 50_000_000) throw new ValidationError(`El precio "${price}" no es válido. Escríbelo así: 350 o 3.99`);
    out[size] = value;
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

// Familias de un perfume (los guardados antes de este cambio solo tienen "family").
export const familiesOf = (p) => (Array.isArray(p?.families) && p.families.length ? p.families : p?.family ? [p.family] : []);

function categoryId(v, categories, fallback = null) {
  if (v === undefined) return fallback;
  if (v === null || v === '') return null;
  if (!categories.some((c) => c.id === v)) throw new ValidationError('La categoría no es válida.');
  return v;
}

// Sets: de 2 a 6 perfumes, cada uno con su nombre, tamaño, color y foto propia (opcional).
export const SET_MIN = 2;
export const SET_MAX = 6;
// Foto por link: debe ser una dirección https (por ejemplo la de una imagen en internet).
export function photoUrl(v, what = 'La foto de un perfume del set') {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (s.length > 600 || !/^https:\/\/[^\s"'<>]+$/.test(s)) throw new ValidationError(`${what} no es un link válido. Debe empezar con https://`);
  return s;
}
function setItems(v) {
  const list = Array.isArray(v) ? v : [];
  if (list.length < SET_MIN) throw new ValidationError(`Un set necesita al menos ${SET_MIN} perfumes.`);
  if (list.length > SET_MAX) throw new ValidationError(`Un set puede tener máximo ${SET_MAX} perfumes.`);
  return list.map((it, i) => {
    const n = i + 1;
    const ml = Number(it?.ml);
    if (!Number.isInteger(ml) || ml < 1 || ml > 1000) throw new ValidationError(`Escribe los ml del perfume ${n} del set (entre 1 y 1000).`);
    return {
      name: text(it?.name, `el nombre del perfume ${n} del set`, { min: 1, max: 60 }),
      ml,
      liquid: color(it?.liquid, '#B58A4C'),
      photo: photoUrl(it?.photo),
      ownPhoto: !!it?.ownPhoto && !!it?.photo, // la foto se subió solo para este set (se borra con él)
      productId: typeof it?.productId === 'string' && /^[a-z0-9-]{1,60}$/.test(it.productId) ? it.productId : null,
    };
  });
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

export function cleanProduct(input, existing, { families, brands, categories = [] }) {
  const familyIds = new Set(families.map((f) => f.id));
  const name = text(input.name, 'el nombre', { min: 2, max: 60 });
  const kind = input.kind === 'set' ? 'set' : 'perfume';
  let items = null;
  let priceList;
  if (kind === 'set') {
    items = setItems(input.items);
    // Un set tiene un solo precio; se guarda con el total de ml para que la tienda lo trate como un tamaño.
    const total = Math.min(1000, items.reduce((s, it) => s + it.ml, 0));
    if (input.setPrice === '' || input.setPrice == null) throw new ValidationError('Escribe el precio del set.');
    priceList = prices({ [total]: input.setPrice });
  } else {
    priceList = prices(input.prices);
  }
  // Varias familias por perfume (por ejemplo Amaderado y Ámbar). "family" guarda la primera, para lo que solo usa una.
  const askedFamilies = Array.isArray(input.families) ? input.families : input.family ? [input.family] : null;
  let familyList = askedFamilies ? [...new Set(askedFamilies.filter(Boolean))] : existing.families || (existing.family ? [existing.family] : []);
  if (familyList.some((id) => !familyIds.has(id))) throw new ValidationError('Una de las familias no es válida.');
  if (familyList.length > 5) throw new ValidationError('Elige máximo 5 familias por perfume.');
  if (!familyList.length) {
    if (askedFamilies) throw new ValidationError('Elige al menos una familia.');
    familyList = families[0] ? [families[0].id] : [];
  }
  return {
    name,
    kind,
    items,
    brand: brandId(input.brand, brands, existing.brand ?? null),
    category: categoryId(input.category, categories, existing.category ?? null),
    families: familyList,
    family: familyList[0] || null,
    gender: oneOf(input.gender, GENDERS, 'El género', existing.gender || 'Unisex'),
    description: text(input.description, 'la descripción', { max: 400 }),
    tag: text(input.tag, 'la etiqueta', { max: 30 }) || null,
    notes: notes(input.notes),
    prices: priceList,
    liquid: color(input.liquid, existing.liquid || '#B58A4C'),
    // En existencia (listo para enviar) o agotado. Si no se dice nada, queda como estaba (por defecto, en existencia).
    inStock: input.inStock === undefined ? existing.inStock !== false : !!input.inStock,
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

// Ajustes de la tienda. protectionFee: quetzales de Shipping Protection que se suman a cada precio.
export const DEFAULT_PROTECTION_FEE = 5;
export function cleanShop(input, existing = {}) {
  const fee = parseMoney(input?.protectionFee);
  if (!Number.isFinite(fee) || fee > 1000) throw new ValidationError('Escribe un monto de protección entre Q0 y Q1,000, por ejemplo 5 o 4.99.');
  return { ...existing, protectionFee: fee };
}

export function cleanCategory(input, others) {
  const name = text(input.name, 'el nombre', { min: 1, max: 40 });
  if (others.some((c) => c.name.toLowerCase() === name.toLowerCase())) throw new ValidationError(`Ya existe una categoría llamada "${name}".`);
  return { name };
}

// Destacados: tarjeta con palabra grande al fondo, foto del frasco y a dónde lleva al tocarla.
const LINK_TYPES = new Set(['none', 'minis', 'full', 'brand', 'product']);
export function cleanSlide(input, existing, { fonts, brands, productIds }) {
  const word = text(input.word, 'la palabra', { min: 1, max: 40 });
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
