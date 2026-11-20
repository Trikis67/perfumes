// Genera supabase/seed.sql con el catálogo de ejemplo de src/data.js.
// Uso: npm run seed   (luego pega seed.sql en Supabase → SQL Editor, solo la primera vez)
import { writeFileSync } from 'node:fs';
import { products, upcoming, families, brands } from '../src/data.js';

const lit = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
const rows = products.map((p, i) => {
  const { id, ...data } = p;
  return `  ('${id}', ${lit({ ...data, photo: null })}, ${i}, true)`;
});
const sql = `-- Catálogo de ejemplo. Solo agrega lo que falta: no borra ni pisa lo que ya exista.
insert into public.settings (key, value) values
  ('upcoming', ${lit({ ...upcoming, photos: [], silhouette: true })}),
  ('families', ${lit(families)}),
  ('brands', ${lit(brands)})
on conflict (key) do nothing;

insert into public.products (id, data, sort, visible) values
${rows.join(',\n')}
on conflict (id) do nothing;
`;
writeFileSync(new URL('./seed.sql', import.meta.url), sql);
console.log(`seed.sql listo: ${products.length} perfumes, ${brands.length} marcas, ${families.length} familias.`);
