// Catálogo de ejemplo. Reemplazar con los productos reales del cliente.
// Número de WhatsApp en formato internacional, sin "+" ni espacios (ej. 573001234567).
export const WHATSAPP_NUMBER = '570000000000';
export const STORE_NAME = 'Ánima';

export const families = [
  {
    id: 'amaderado',
    name: 'Amaderados',
    color: '#8A5A3B',
    text: 'Cedro, sándalo y vetiver. Cálidos, secos, con presencia.',
  },
  {
    id: 'floral',
    name: 'Florales',
    color: '#C77B8B',
    text: 'Rosa, jazmín y flor de azahar. Suaves o intensos.',
  },
  {
    id: 'citrico',
    name: 'Cítricos',
    color: '#D9A93A',
    text: 'Bergamota, limón y neroli. Luminosos para el día.',
  },
  {
    id: 'ambar',
    name: 'Ámbar y especias',
    color: '#A8541F',
    text: 'Vainilla, canela y resinas. Envolventes para la noche.',
  },
  {
    id: 'fresco',
    name: 'Frescos',
    color: '#5E9A9A',
    text: 'Notas marinas, té y hierbas. Limpios y ligeros.',
  },
];

// Portada: el próximo lanzamiento.
export const upcoming = {
  id: 'musgo-lunar',
  name: 'Musgo Lunar',
  family: 'amaderado',
  gender: 'Unisex',
  liquid: '#5F7A5A',
  shape: 'flask',
  cap: 'dark',
  edition: 'Llega en diciembre',
  launch: '2026-12-05T10:00:00-05:00',
  notes: { top: ['Hoja de violeta', 'Pera verde'], heart: ['Musgo de roble', 'Iris'], base: ['Pachulí', 'Almizcle gris'] },
  description: 'Un bosque húmedo de noche, justo después de la lluvia. Verde, oscuro y muy suave.',
};

export const products = [
  {
    id: 'cedro-nocturno',
    name: 'Cedro Nocturno',
    family: 'amaderado',
    gender: 'Unisex',
    liquid: '#9C6233',
    shape: 'classic',
    cap: 'dark',
    prices: { 50: 189000, 100: 289000 },
    notes: { top: ['Pimienta rosa', 'Cardamomo'], heart: ['Cedro del Atlas', 'Iris'], base: ['Vetiver', 'Cuero suave'] },
    description: 'Un amaderado seco y elegante que se siente como una chaqueta de lana en una noche fría.',
    tag: 'Más vendido',
  },
  {
    id: 'rosa-oscura',
    name: 'Rosa Oscura',
    family: 'floral',
    gender: 'Femenino',
    liquid: '#B0465E',
    shape: 'round',
    cap: 'gold',
    prices: { 50: 209000, 100: 319000 },
    notes: { top: ['Frambuesa', 'Azafrán'], heart: ['Rosa de Damasco', 'Peonía'], base: ['Oud', 'Pachulí'] },
    description: 'Rosa profunda con un fondo de oud. Intensa, para ocasiones en que quieres ser recordada.',
  },
  {
    id: 'neroli-de-mayo',
    name: 'Neroli de Mayo',
    family: 'citrico',
    gender: 'Unisex',
    liquid: '#E3C15A',
    shape: 'tall',
    cap: 'light',
    prices: { 50: 159000, 100: 239000 },
    notes: { top: ['Bergamota', 'Limón de Amalfi'], heart: ['Neroli', 'Flor de azahar'], base: ['Almizcle blanco'] },
    description: 'Luz de mañana en un frasco. Fresco, limpio y fácil de llevar todos los días.',
  },
  {
    id: 'ambar-salvaje',
    name: 'Ámbar Salvaje',
    family: 'ambar',
    gender: 'Unisex',
    liquid: '#B8601F',
    shape: 'facet',
    cap: 'gold',
    prices: { 50: 219000, 100: 329000 },
    notes: { top: ['Canela', 'Mandarina'], heart: ['Ámbar gris', 'Labdanum'], base: ['Vainilla de Madagascar', 'Benjuí'] },
    description: 'Cálido y especiado, con una estela de vainilla que dura hasta el día siguiente.',
    tag: 'Nuevo',
  },
  {
    id: 'lluvia-de-sal',
    name: 'Lluvia de Sal',
    family: 'fresco',
    gender: 'Masculino',
    liquid: '#7FB3B5',
    shape: 'flask',
    cap: 'dark',
    prices: { 50: 169000, 100: 249000 },
    notes: { top: ['Sal marina', 'Pomelo'], heart: ['Salvia', 'Algas'], base: ['Madera de deriva', 'Ambroxán'] },
    description: 'La brisa del mar en la piel. Ligero, mineral y muy limpio.',
  },
  {
    id: 'higo-blanco',
    name: 'Higo Blanco',
    family: 'fresco',
    gender: 'Unisex',
    liquid: '#A9C08E',
    shape: 'classic',
    cap: 'light',
    prices: { 50: 179000, 100: 269000 },
    notes: { top: ['Hoja de higuera', 'Bergamota'], heart: ['Leche de higo', 'Coco'], base: ['Cedro blanco'] },
    description: 'Verde y cremoso a la vez. Huele a una tarde de verano bajo una higuera.',
  },
  {
    id: 'tabaco-y-miel',
    name: 'Tabaco y Miel',
    family: 'ambar',
    gender: 'Masculino',
    liquid: '#8E4A1C',
    shape: 'tall',
    cap: 'wood',
    prices: { 50: 229000, 100: 349000 },
    notes: { top: ['Ron', 'Clavo'], heart: ['Hoja de tabaco', 'Miel'], base: ['Haba tonka', 'Cacao'] },
    description: 'Dulce, ahumado y adictivo. Un clásico de noche para el frío.',
    tag: 'Edición limitada',
  },
  {
    id: 'jazmin-de-noche',
    name: 'Jazmín de Noche',
    family: 'floral',
    gender: 'Femenino',
    liquid: '#E8C9A8',
    shape: 'facet',
    cap: 'gold',
    prices: { 50: 199000, 100: 299000 },
    notes: { top: ['Pera', 'Mandarina'], heart: ['Jazmín sambac', 'Tuberosa'], base: ['Sándalo', 'Almizcle'] },
    description: 'Floral blanco, luminoso y sensual. Para quien quiere dejar estela.',
  },
  {
    id: 'vetiver-azul',
    name: 'Vetiver Azul',
    family: 'amaderado',
    gender: 'Masculino',
    liquid: '#4F6E86',
    shape: 'flask',
    cap: 'dark',
    prices: { 50: 189000, 100: 289000 },
    notes: { top: ['Limón', 'Jengibre'], heart: ['Lavanda', 'Geranio'], base: ['Vetiver de Haití', 'Musgo'] },
    description: 'Elegante y versátil, funciona en la oficina y en una cena.',
  },
  {
    id: 'te-verde',
    name: 'Té Verde',
    family: 'citrico',
    gender: 'Unisex',
    liquid: '#C4CE74',
    shape: 'round',
    cap: 'light',
    prices: { 50: 149000, 100: 219000 },
    notes: { top: ['Té verde', 'Lima'], heart: ['Menta', 'Jazmín'], base: ['Almizcle', 'Ámbar claro'] },
    description: 'Ligero y relajante. Una ducha fría convertida en perfume.',
  },
  {
    id: 'sandalo-rojo',
    name: 'Sándalo Rojo',
    family: 'amaderado',
    gender: 'Unisex',
    liquid: '#A2402E',
    shape: 'round',
    cap: 'wood',
    prices: { 50: 239000, 100: 359000 },
    notes: { top: ['Cereza', 'Pimienta negra'], heart: ['Sándalo', 'Rosa'], base: ['Cuero', 'Vainilla'] },
    description: 'Cremoso, oscuro y especiado. Una fragancia con mucha personalidad.',
  },
  {
    id: 'flor-de-sal',
    name: 'Flor de Sal',
    family: 'floral',
    gender: 'Femenino',
    liquid: '#D9A6B4',
    shape: 'classic',
    cap: 'gold',
    prices: { 50: 179000, 100: 269000 },
    notes: { top: ['Bergamota', 'Sal'], heart: ['Peonía', 'Magnolia'], base: ['Almizcle blanco', 'Cedro'] },
    description: 'Una flor fresca con un toque salino. Delicada y moderna.',
  },
];

// Marcas de ejemplo (nombres inventados). El cliente crea las reales desde el panel.
export const brands = [
  { id: 'maison-lumiere', name: 'Maison Lumière' },
  { id: 'atelier-sol', name: 'Atelier Sol' },
  { id: 'casa-ambar', name: 'Casa Ámbar' },
];

// Ejemplo: reparte las marcas y agrega minis (5 y 10 ml, perfume original rellenado en frasco pequeño).
// Cualquier tamaño de 15 ml o menos se muestra en la tienda como "mini".
products.forEach((p, i) => {
  p.brand = brands[i % brands.length].id;
  if (i % 3 !== 2) {
    const base = p.prices[50] ?? Object.values(p.prices)[0];
    p.prices = { 5: Math.round((base * 0.16) / 1000) * 1000, 10: Math.round((base * 0.28) / 1000) * 1000, ...p.prices };
  }
});
upcoming.brand = brands[0].id;
