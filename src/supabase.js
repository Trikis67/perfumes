import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabaseReady = !SUPABASE_URL.includes('TU-PROYECTO');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'anima-panel' },
});

// Dirección pública de las fotos: solo se aceptan rutas de nuestra carpeta "fotos".
export const PHOTO_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/fotos/`;
