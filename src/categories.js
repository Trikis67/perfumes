// Categorías automáticas: se llenan solas según una regla (los más baratos, los más recientes, con cierta etiqueta…).
// Una categoría también puede tener perfumes elegidos a mano (los que la tienen marcada en el panel).

export const RULES = {
  cheapest: { label: 'Los más baratos', value: 'number', hint: 'Cuántos perfumes mostrar', def: 8 },
  price_max: { label: 'Hasta cierto precio', value: 'money', hint: 'Precio máximo en quetzales', def: 100 },
  newest: { label: 'Los más recientes', value: 'number', hint: 'Cuántos perfumes mostrar', def: 8 },
  tag: { label: 'Con una etiqueta', value: 'text', hint: 'La etiqueta del perfume, por ejemplo "Más vendido"', def: 'Más vendido' },
  decants: { label: 'Solo decants (15 ml o menos)', value: null },
  sets: { label: 'Solo sets de perfumes', value: null },
};

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
const minPriceOf = (p) => Math.min(...Object.values(p.prices || {}).map(Number));
const isSetP = (p) => p?.kind === 'set' && Array.isArray(p.items) && p.items.length > 0;

// Devuelve una función que dice si un perfume está en una categoría (a mano o por su regla).
// "products" va en el orden del catálogo: los últimos son los más recientes.
export function categoryMatcher(products, miniMax = 15) {
  const cache = new Map();
  const ruleIds = (c) => {
    if (cache.has(c.id)) return cache.get(c.id);
    const r = c.rule;
    let ids = null;
    if (r?.type === 'cheapest') ids = [...products].sort((a, b) => minPriceOf(a) - minPriceOf(b)).slice(0, r.value).map((p) => p.id);
    else if (r?.type === 'newest') ids = products.slice(-r.value).map((p) => p.id);
    ids = ids && new Set(ids);
    cache.set(c.id, ids);
    return ids;
  };
  return (p, c) => {
    if (!c) return false;
    const manual = Array.isArray(p.categories) && p.categories.length ? p.categories : p.category ? [p.category] : [];
    if (manual.includes(c.id)) return true; // elegido a mano
    const r = c.rule;
    if (!r?.type) return false;
    if (r.type === 'cheapest' || r.type === 'newest') return ruleIds(c).has(p.id);
    if (r.type === 'price_max') return minPriceOf(p) <= Number(r.value);
    if (r.type === 'tag') return !!p.tag && norm(p.tag) === norm(r.value);
    if (r.type === 'decants') return isSetP(p) ? p.items.every((it) => it.ml <= miniMax) : Object.keys(p.prices || {}).some((ml) => Number(ml) <= miniMax);
    if (r.type === 'sets') return isSetP(p);
    return false;
  };
}

// Texto corto que explica la regla, para el panel.
export function ruleText(rule, fmt = (n) => `Q${n}`) {
  if (!rule?.type || !RULES[rule.type]) return 'Manual: tú eliges los perfumes';
  if (rule.type === 'cheapest') return `Automática: los ${rule.value} más baratos`;
  if (rule.type === 'newest') return `Automática: los ${rule.value} más recientes`;
  if (rule.type === 'price_max') return `Automática: hasta ${fmt(rule.value)}`;
  if (rule.type === 'tag') return `Automática: con la etiqueta "${rule.value}"`;
  return `Automática: ${RULES[rule.type].label.toLowerCase()}`;
}
