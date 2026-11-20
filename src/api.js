// Conexión de la tienda con Supabase.
import { supabase, supabaseReady } from './supabase.js';

const withTimeout = (promise, ms = 6000) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('tiempo')), ms))]);

// Catálogo vivo. Si Supabase no responde, la tienda sigue funcionando con el catálogo de respaldo.
export async function loadCatalog(fallback) {
  if (!supabaseReady) return fallback;
  try {
    const [products, settings] = await withTimeout(
      Promise.all([
        supabase.from('products').select('id, data, sort').eq('visible', true).order('sort'),
        supabase.from('settings').select('key, value'),
      ]),
    );
    if (products.error || settings.error) throw products.error || settings.error;
    const s = Object.fromEntries(settings.data.map((r) => [r.key, r.value]));
    if (!s.upcoming) throw new Error('sin lanzamiento');
    return {
      products: products.data.map((r) => ({ ...r.data, id: r.id })),
      brands: s.brands || [],
      families: s.families || [],
      showcase: s.showcase || [],
      upcoming: { ...s.upcoming, photos: s.upcoming.photos || [] },
    };
  } catch {
    return fallback;
  }
}

// "Avísame cuando llegue": guarda el correo en la lista del lanzamiento.
export async function subscribeToLaunch(email, launchId) {
  if (!supabaseReady) return { ok: false, error: 'La tienda todavía no está conectada.' };
  try {
    const { error } = await withTimeout(supabase.from('subscribers').insert({ email: email.trim().toLowerCase(), launch_id: launchId }));
    if (!error || error.code === '23505') return { ok: true }; // 23505: ya estaba anotado
    if (error.code === '42501') return { ok: false, error: 'Este lanzamiento cambió. Recarga la página e inténtalo de nuevo.' };
    if (error.code === '23514') return { ok: false, error: 'Escribe un correo válido, por ejemplo nombre@gmail.com.' };
    return { ok: false };
  } catch {
    return { ok: false, error: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.' };
  }
}
