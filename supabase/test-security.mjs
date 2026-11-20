// Prueba las reglas de seguridad como un visitante cualquiera (sin cuenta).
// Uso: node supabase/test-security.mjs
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../src/config.js';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const check = (label, ok, extra = '') => console.log(`${ok ? 'OK   ' : 'FALLA'} ${label}${extra ? ` (${extra})` : ''}`);

const products = await sb.from('products').select('id');
check('ve el catálogo', !products.error && products.data.length > 0, `${products.data?.length} perfumes`);
const settings = await sb.from('settings').select('key, value');
check('ve marcas, familias y lanzamiento', settings.data?.length === 3);
const launchId = settings.data?.find((r) => r.key === 'upcoming')?.value.id;

const email = `prueba-${Date.now()}@ejemplo.com`;
let r = await sb.from('subscribers').insert({ email, launch_id: launchId });
check('se anota en "Avísame"', !r.error, r.error?.message);
r = await sb.from('subscribers').insert({ email: `otro-${Date.now()}@ejemplo.com`, launch_id: 'otro-lanzamiento' });
check('NO se anota a otro lanzamiento', !!r.error);
r = await sb.from('subscribers').insert({ email: 'no-es-correo', launch_id: launchId });
check('NO acepta correos inválidos', !!r.error);
r = await sb.from('subscribers').select('email');
check('NO puede leer la lista de correos', !!r.error || r.data.length === 0);

r = await sb.from('products').update({ visible: false }).eq('id', 'cedro-nocturno').select();
check('NO puede cambiar perfumes', !!r.error || r.data.length === 0);
r = await sb.from('products').insert({ id: 'hack', data: {} });
check('NO puede crear perfumes', !!r.error);
r = await sb.from('settings').update({ value: {} }).eq('key', 'brands').select();
check('NO puede cambiar marcas', !!r.error || r.data.length === 0);
r = await sb.from('admins').select('*');
check('NO ve las cuentas del panel', !!r.error || r.data.length === 0);
r = await sb.storage.from('fotos').upload(`hack-${Date.now()}.webp`, new Blob(['x'], { type: 'image/webp' }));
check('NO puede subir fotos', !!r.error);

console.log(`\nCorreo de prueba que quedó en la lista (bórralo desde el panel): ${email}`);
