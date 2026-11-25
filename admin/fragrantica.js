// Importar "acordes principales" de Fragrantica como familias.
// El dueño abre el perfume en Fragrantica y toca el botón "Copiar a Olorosos" de su barra de marcadores:
// ese botón lee los acordes de la página que está viendo y los copia. Luego, en el panel, "Pegar de Fragrantica".
// Nada se descarga desde el servidor: todo pasa en el navegador del dueño, en la página que él abrió.

export const MARK = 'OLOROSOS-FRAGRANTICA';

// Código del botón (marcador). Se lee la sección "main accords / acordes principales": cada barra tiene
// el nombre, su color y su ancho (la importancia).
const BOOKMARKLET_SRC = `(()=>{const h=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6,b,strong,div,span,p')].find(e=>e.children.length===0&&/^(main accords|acordes principales|acuerdos principales|accords principaux|accordi principali|acordes principais|hauptakkorde)$/i.test(e.textContent.trim()));if(!h){alert('Olorosos: abre la página de un perfume en Fragrantica y vuelve a tocar el botón.');return}const bars=[...h.parentElement.querySelectorAll('[style*="width"]')].filter(e=>e.textContent.trim());const hex=c=>{const m=(c||'').match(/\\d+/g);return m?'#'+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join(''):''};const a=bars.map(e=>({n:e.textContent.trim(),c:hex(e.style.background||e.style.backgroundColor),w:Math.round(parseFloat(e.style.width)||0)}));if(!a.length){alert('Olorosos: no encontré los acordes en esta página.');return}const p=(document.querySelector('h1')||{}).textContent||'';const d='${MARK}'+JSON.stringify({p:p.replace(/\\s+/g,' ').trim(),u:location.href,a});const ok=()=>alert('Copiado para Olorosos: '+a.slice(0,5).map(x=>x.n).join(', ')+'.\\nAhora, en el panel, abre el perfume y toca "Pegar de Fragrantica".');navigator.clipboard?navigator.clipboard.writeText(d).then(ok,()=>prompt('Copia este texto (Ctrl+C):',d)):prompt('Copia este texto (Ctrl+C):',d)})()`;
export const BOOKMARKLET = `javascript:${encodeURIComponent(BOOKMARKLET_SRC)}`;

// Fragrantica en inglés → nombre en español para la familia.
const ES = {
  sweet: 'Dulce', 'warm spicy': 'Cálido y especiado', 'fresh spicy': 'Fresco y especiado', 'soft spicy': 'Especiado suave', vanilla: 'Vainilla',
  cinnamon: 'Canela', 'white floral': 'Floral blanco', 'yellow floral': 'Floral amarillo', floral: 'Floral', powdery: 'Polvoriento', aromatic: 'Aromático',
  citrus: 'Cítrico', musky: 'Almizclado', amber: 'Ámbar', woody: 'Amaderado', fruity: 'Afrutado', fresh: 'Fresco', green: 'Verde', aquatic: 'Acuático',
  marine: 'Marino', ozonic: 'Ozónico', earthy: 'Terroso', balsamic: 'Balsámico', honey: 'Miel', caramel: 'Caramelo', chocolate: 'Chocolate', cacao: 'Cacao',
  coffee: 'Café', lactonic: 'Lactónico', coconut: 'Coco', tropical: 'Tropical', herbal: 'Herbal', lavender: 'Lavanda', iris: 'Iris', violet: 'Violeta',
  rose: 'Rosa', tuberose: 'Nardo', patchouli: 'Pachulí', animalic: 'Animal', mossy: 'Musgoso', leather: 'Cuero', smoky: 'Ahumado', tobacco: 'Tabaco',
  oud: 'Oud', almond: 'Almendra', cherry: 'Cereza', nutty: 'Nueces', whiskey: 'Whisky', rum: 'Ron', boozy: 'Licoroso', gourmand: 'Gourmand',
  salty: 'Salado', metallic: 'Metálico', mineral: 'Mineral', beeswax: 'Cera de abejas', anis: 'Anís', tuberous: 'Nardo', camphor: 'Alcanforado',
  sour: 'Ácido', bitter: 'Amargo', 'fresh woody': 'Amaderado fresco', spicy: 'Especiado', sand: 'Arena', wine: 'Vino', 'mossy woody': 'Musgoso',
  vinyl: 'Vinilo', plastic: 'Plástico', 'cannabis': 'Cannabis', soapy: 'Jabonoso', 'clean': 'Limpio', 'ozonic marine': 'Marino',
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();

// Lo que pegó el dueño: lo que copió el botón, o (por si acaso) el texto copiado a mano de la lista.
export function parsePaste(text) {
  const t = String(text || '').trim();
  const i = t.indexOf(MARK);
  if (i >= 0) {
    try {
      const d = JSON.parse(t.slice(i + MARK.length));
      const acordes = (d.a || []).filter((x) => x?.n).map((x) => ({ name: String(x.n).trim(), color: /^#[0-9a-f]{6}$/i.test(x.c) ? x.c.toUpperCase() : null, weight: Number(x.w) || 0 }));
      return { perfume: String(d.p || ''), url: String(d.u || ''), acordes };
    } catch {
      return null;
    }
  }
  // Texto a mano: un acorde por línea (se ignoran números, porcentajes y títulos).
  const acordes = t
    .split(/\n|,/)
    .map((l) => l.replace(/\d+(\.\d+)?\s*%?/g, '').trim())
    .filter((l) => l && l.length <= 30 && !/acordes|acuerdos|accords/i.test(l))
    .map((name, i, all) => ({ name, color: null, weight: 100 - (i * 50) / Math.max(1, all.length) }));
  return acordes.length ? { perfume: '', url: '', acordes } : null;
}

// Nombre en español (si venía en inglés) y con mayúscula inicial.
export const spanishName = (name) => ES[norm(name)] || cap(String(name).trim());

// ¿Ya existe una familia parecida? "vainilla" ≈ "Avainillado", "cálido y especiado" = "Cálido y especiado".
export function matchFamily(name, families) {
  const n = norm(name);
  const exact = families.find((f) => norm(f.name) === n);
  if (exact) return exact;
  if (n.length < 4) return null;
  const stem = n.slice(0, Math.min(6, n.length));
  return (
    families.find((f) => {
      const fn = norm(f.name);
      return fn.length >= 4 && (fn.includes(n) || n.includes(fn) || fn.includes(stem) || fn.startsWith(n.slice(0, 5)));
    }) || null
  );
}
