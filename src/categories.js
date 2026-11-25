// Categorías: todas son manuales. Un perfume está en una categoría solo si se marcó en el panel.

// Devuelve una función que dice si un perfume está en una categoría.
export function categoryMatcher() {
  return (p, c) => {
    if (!c) return false;
    const manual = Array.isArray(p.categories) && p.categories.length ? p.categories : p.category ? [p.category] : [];
    return manual.includes(c.id);
  };
}
