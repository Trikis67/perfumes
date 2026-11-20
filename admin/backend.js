// El "servidor" del panel, ahora sobre Supabase: el panel le pide rutas como antes
// (/api/admin/products, etc.) y aquí se convierten en consultas a la base de datos.
// La seguridad real está en las reglas de la base de datos (supabase/schema.sql):
// aunque alguien cambie este código, sin ser admin no puede escribir nada.
import { supabase, supabaseReady, PHOTO_PREFIX } from '../src/supabase.js';
import { PANEL_EMAIL_DOMAIN } from '../src/config.js';
import { cleanProduct, cleanUpcoming, cleanFamily, cleanBrand, cleanSlide, slugify, ValidationError } from '../src/validate.js';
import { SHOWCASE_FONTS } from '../src/fonts.js';

export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export { supabaseReady };

/* ---------- Errores de Supabase en palabras simples ---------- */
function fail(error) {
  if (!error) return;
  if (error.code === 'PGRST301' || error.status === 401 || /JWT/i.test(error.message || '')) throw new ApiError('Sesión terminada', 401);
  if (error.code === '42501') throw new ApiError('Tu cuenta no tiene permiso para hacer esto.', 403);
  if (/fetch|network/i.test(error.message || '')) throw new ApiError('Sin conexión. Revisa tu internet.', 0);
  throw new ApiError(error.message || 'Algo salió mal. Inténtalo de nuevo.');
}
const run = async (q) => {
  const { data, error } = await q;
  fail(error);
  return data;
};

/* ---------- Sesión ---------- */
const toEmail = (u) => {
  const s = String(u || '').trim().toLowerCase();
  return s.includes('@') ? s : `${s}@${PANEL_EMAIL_DOMAIN}`;
};

export async function sessionStatus() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { loggedIn: false };
  const me = await run(supabase.from('admins').select('username, name').eq('user_id', data.session.user.id).maybeSingle());
  return { loggedIn: !!me, me };
}

export async function login(username, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: toEmail(username), password: String(password || '') });
  if (error) {
    if (error.status === 429) throw new ApiError('Demasiados intentos. Espera unos minutos.', 429);
    throw new ApiError('Usuario o contraseña incorrectos.', 401);
  }
  const s = await sessionStatus();
  if (!s.loggedIn) {
    await supabase.auth.signOut();
    throw new ApiError('Esta cuenta no tiene acceso al panel.', 403);
  }
  return s;
}

export const logout = () => supabase.auth.signOut();

export async function changePassword(password) {
  const p = String(password || '');
  if (p.length < 10) throw new ApiError('La contraseña debe tener al menos 10 caracteres.');
  const { error } = await supabase.auth.updateUser({ password: p });
  if (error) throw new ApiError(error.message);
}

/* ---------- Fotos ---------- */
// Se achica en el navegador (máx. 1600 px), se gira según la cámara y se guarda como WebP sin datos de ubicación.
async function prepareImage(file) {
  if (!file || !/^image\//.test(file.type || 'image/')) throw new ApiError('El archivo no es una imagen.');
  if (file.size > 25 * 1024 * 1024) throw new ApiError('La foto pesa demasiado (máximo 25 MB).');
  let bmp;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ApiError('No se pudo leer la foto. Usa JPG, PNG o WebP.');
  }
  if (bmp.width < 300 || bmp.height < 300) throw new ApiError('La foto es muy pequeña. Usa una de al menos 300 × 300 px.');
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.84));
  if (!blob) throw new ApiError('No se pudo preparar la foto.');
  return blob;
}
async function saveImage(file) {
  const blob = await prepareImage(file);
  const name = `${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from('fotos').upload(name, blob, { contentType: blob.type, cacheControl: '31536000' });
  fail(error);
  return PHOTO_PREFIX + name;
}
async function removeImage(url) {
  if (!url || !url.startsWith(PHOTO_PREFIX)) return;
  await supabase.storage.from('fotos').remove([url.slice(PHOTO_PREFIX.length)]);
}

/* ---------- Datos ---------- */
const getSetting = async (key) => (await run(supabase.from('settings').select('value').eq('key', key).maybeSingle()))?.value ?? null;
const setSetting = (key, value) => run(supabase.from('settings').upsert({ key, value }));
const getFamilies = async () => (await getSetting('families')) || [];
const getBrands = async () => (await getSetting('brands')) || [];
const rowToProduct = (r) => ({ ...r.data, id: r.id, visible: r.visible, sort: r.sort });
const listProducts = async () => (await run(supabase.from('products').select('*').order('sort'))).map(rowToProduct);
async function getProduct(id) {
  const r = await run(supabase.from('products').select('*').eq('id', id).maybeSingle());
  if (!r) throw new ApiError('Ese producto no existe.', 404);
  return rowToProduct(r);
}
async function saveProduct(p) {
  const { id, visible = true, sort, ...data } = p;
  const row = await run(
    supabase.from('products').upsert({ id, data, sort: sort ?? 0, visible, updated_at: new Date().toISOString() }).select().single(),
  );
  return rowToProduct(row);
}
async function slideContext() {
  const [brands, products] = await Promise.all([getBrands(), listProducts()]);
  return { fonts: Object.keys(SHOWCASE_FONTS), brands, productIds: new Set(products.map((p) => p.id)) };
}
const uniqueId = (base, taken) => (taken.has(base) ? `${base}-${crypto.randomUUID().slice(0, 4)}` : base);

/* ---------- Rutas del panel ---------- */
const routes = [
  // Productos
  ['GET', /^\/products$/, () => listProducts()],
  [
    'POST',
    /^\/products$/,
    async (_, body) => {
      const [list, families, brands] = await Promise.all([listProducts(), getFamilies(), getBrands()]);
      const data = cleanProduct(body, {}, { families, brands });
      const id = uniqueId(slugify(data.name), new Set(list.map((p) => p.id)));
      const sort = list.reduce((m, p) => Math.max(m, p.sort), -1) + 1;
      return saveProduct({ id, sort, visible: body.visible !== false, ...data });
    },
  ],
  [
    'PUT',
    /^\/products\/([^/]+)$/,
    async ([id], body) => {
      const [existing, families, brands] = await Promise.all([getProduct(id), getFamilies(), getBrands()]);
      const visible = body.visible === undefined ? existing.visible : !!body.visible;
      return saveProduct({ id, sort: existing.sort, visible, ...cleanProduct(body, existing, { families, brands }) });
    },
  ],
  [
    'DELETE',
    /^\/products\/([^/]+)$/,
    async ([id]) => {
      const existing = await getProduct(id);
      await run(supabase.from('products').delete().eq('id', id));
      await removeImage(existing.photo);
      return { ok: true };
    },
  ],
  [
    'POST',
    /^\/products\/([^/]+)\/photo$/,
    async ([id], _, form) => {
      const existing = await getProduct(id);
      const url = await saveImage(form?.get('photo'));
      await removeImage(existing.photo);
      return saveProduct({ ...existing, photo: url });
    },
  ],
  [
    'DELETE',
    /^\/products\/([^/]+)\/photo$/,
    async ([id]) => {
      const existing = await getProduct(id);
      await removeImage(existing.photo);
      return saveProduct({ ...existing, photo: null });
    },
  ],

  // Familias
  [
    'GET',
    /^\/families$/,
    async () => {
      const [families, products, upcoming] = await Promise.all([getFamilies(), listProducts(), getSetting('upcoming')]);
      return families.map((f) => ({ ...f, products: products.filter((p) => p.family === f.id).length, upcoming: upcoming?.family === f.id }));
    },
  ],
  [
    'POST',
    /^\/families$/,
    async (_, body) => {
      const list = await getFamilies();
      if (list.length >= 20) throw new ApiError('Máximo 20 familias.');
      const data = cleanFamily(body, list);
      const family = { id: uniqueId(slugify(data.name), new Set(list.map((f) => f.id))), ...data };
      await setSetting('families', [...list, family]);
      return family;
    },
  ],
  [
    'PUT',
    /^\/families\/order$/,
    async (_, body) => {
      const list = await getFamilies();
      const ids = Array.isArray(body?.ids) ? body.ids : [];
      if (ids.length !== list.length || !list.every((f) => ids.includes(f.id))) throw new ApiError('El orden no es válido.');
      await setSetting('families', ids.map((id) => list.find((f) => f.id === id)));
      return { ok: true };
    },
  ],
  [
    'PUT',
    /^\/families\/([^/]+)$/,
    async ([id], body) => {
      const list = await getFamilies();
      const current = list.find((f) => f.id === id);
      if (!current) throw new ApiError('Esa familia no existe.', 404);
      const updated = { ...current, ...cleanFamily(body, list.filter((f) => f.id !== id)) };
      await setSetting('families', list.map((f) => (f.id === id ? updated : f)));
      return updated;
    },
  ],
  [
    'DELETE',
    /^\/families\/([^/]+)$/,
    async ([id], body) => {
      const [list, products, upcoming] = await Promise.all([getFamilies(), listProducts(), getSetting('upcoming')]);
      if (!list.some((f) => f.id === id)) throw new ApiError('Esa familia no existe.', 404);
      if (list.length <= 1) throw new ApiError('Debe quedar al menos una familia.');
      const used = products.filter((p) => p.family === id);
      if (used.length || upcoming?.family === id) {
        const target = list.find((f) => f.id === body?.moveTo && f.id !== id);
        if (!target) throw new ApiError('Elige a qué familia pasan sus perfumes antes de borrarla.', 409);
        for (const p of used) await saveProduct({ ...p, family: target.id });
        if (upcoming?.family === id) await setSetting('upcoming', { ...upcoming, family: target.id });
      }
      await setSetting('families', list.filter((f) => f.id !== id));
      return { ok: true };
    },
  ],

  // Marcas
  [
    'GET',
    /^\/brands$/,
    async () => {
      const [brands, products] = await Promise.all([getBrands(), listProducts()]);
      return brands.map((b) => ({ ...b, products: products.filter((p) => p.brand === b.id).length }));
    },
  ],
  [
    'POST',
    /^\/brands$/,
    async (_, body) => {
      const list = await getBrands();
      if (list.length >= 100) throw new ApiError('Máximo 100 marcas.');
      const data = cleanBrand(body, list);
      const item = { id: uniqueId(slugify(data.name), new Set(list.map((b) => b.id))), ...data };
      await setSetting('brands', [...list, item]);
      return item;
    },
  ],
  [
    'PUT',
    /^\/brands\/([^/]+)$/,
    async ([id], body) => {
      const list = await getBrands();
      const current = list.find((b) => b.id === id);
      if (!current) throw new ApiError('Esa marca no existe.', 404);
      const updated = { ...current, ...cleanBrand(body, list.filter((b) => b.id !== id)) };
      await setSetting('brands', list.map((b) => (b.id === id ? updated : b)));
      return updated;
    },
  ],
  [
    'DELETE',
    /^\/brands\/([^/]+)$/,
    async ([id]) => {
      const [list, products, upcoming] = await Promise.all([getBrands(), listProducts(), getSetting('upcoming')]);
      if (!list.some((b) => b.id === id)) throw new ApiError('Esa marca no existe.', 404);
      // Sus perfumes quedan "sin marca" (no se borran).
      for (const p of products.filter((x) => x.brand === id)) await saveProduct({ ...p, brand: null });
      if (upcoming?.brand === id) await setSetting('upcoming', { ...upcoming, brand: null });
      await setSetting('brands', list.filter((b) => b.id !== id));
      return { ok: true };
    },
  ],

  // Destacados (tarjetas grandes con palabra de fondo)
  ['GET', /^\/showcase$/, async () => (await getSetting('showcase')) || []],
  [
    'POST',
    /^\/showcase$/,
    async (_, body) => {
      const list = (await getSetting('showcase')) || [];
      if (list.length >= 10) throw new ApiError('Máximo 10 destacados.');
      const ctx = await slideContext();
      const slide = { id: crypto.randomUUID().slice(0, 8), ...cleanSlide(body, {}, ctx) };
      await setSetting('showcase', [...list, slide]);
      return slide;
    },
  ],
  [
    'PUT',
    /^\/showcase\/order$/,
    async (_, body) => {
      const list = (await getSetting('showcase')) || [];
      const ids = Array.isArray(body?.ids) ? body.ids : [];
      if (ids.length !== list.length || !list.every((x) => ids.includes(x.id))) throw new ApiError('El orden no es válido.');
      await setSetting('showcase', ids.map((id) => list.find((x) => x.id === id)));
      return { ok: true };
    },
  ],
  [
    'PUT',
    /^\/showcase\/([^/]+)$/,
    async ([id], body) => {
      const list = (await getSetting('showcase')) || [];
      const current = list.find((x) => x.id === id);
      if (!current) throw new ApiError('Ese destacado no existe.', 404);
      const updated = cleanSlide(body, current, await slideContext());
      await setSetting('showcase', list.map((x) => (x.id === id ? updated : x)));
      return updated;
    },
  ],
  [
    'DELETE',
    /^\/showcase\/([^/]+)$/,
    async ([id]) => {
      const list = (await getSetting('showcase')) || [];
      const current = list.find((x) => x.id === id);
      if (!current) throw new ApiError('Ese destacado no existe.', 404);
      await removeImage(current.photo);
      await setSetting('showcase', list.filter((x) => x.id !== id));
      return { ok: true };
    },
  ],
  [
    'POST',
    /^\/showcase\/([^/]+)\/photo$/,
    async ([id], _, form) => {
      const list = (await getSetting('showcase')) || [];
      const current = list.find((x) => x.id === id);
      if (!current) throw new ApiError('Ese destacado no existe.', 404);
      const url = await saveImage(form?.get('photo'));
      await removeImage(current.photo);
      const updated = { ...current, photo: url };
      await setSetting('showcase', list.map((x) => (x.id === id ? updated : x)));
      return updated;
    },
  ],
  [
    'DELETE',
    /^\/showcase\/([^/]+)\/photo$/,
    async ([id]) => {
      const list = (await getSetting('showcase')) || [];
      const current = list.find((x) => x.id === id);
      if (!current) throw new ApiError('Ese destacado no existe.', 404);
      await removeImage(current.photo);
      const updated = { ...current, photo: null };
      await setSetting('showcase', list.map((x) => (x.id === id ? updated : x)));
      return updated;
    },
  ],

  // Próximo lanzamiento
  [
    'GET',
    /^\/upcoming$/,
    async () => {
      const u = await getSetting('upcoming');
      const { count, error } = await supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('launch_id', u.id);
      fail(error);
      return { ...u, photos: u.photos || [], subscribers: count || 0 };
    },
  ],
  [
    'PUT',
    /^\/upcoming$/,
    async (_, body) => {
      const [current, families, brands] = await Promise.all([getSetting('upcoming'), getFamilies(), getBrands()]);
      const next = cleanUpcoming(body, current, { families, brands });
      await setSetting('upcoming', next);
      return next;
    },
  ],
  [
    'POST',
    /^\/upcoming\/photos$/,
    async (_, __, form) => {
      const u = await getSetting('upcoming');
      if ((u.photos || []).length >= 8) throw new ApiError('Máximo 8 fotos. Quita alguna antes de subir otra.');
      const url = await saveImage(form?.get('photo'));
      const next = { ...u, photos: [...(u.photos || []), url] };
      await setSetting('upcoming', next);
      return next;
    },
  ],
  [
    'PUT',
    /^\/upcoming\/photos$/,
    async (_, body) => {
      const u = await getSetting('upcoming');
      const current = new Set(u.photos || []);
      const order = Array.isArray(body?.photos) ? body.photos.filter((p) => current.has(p)) : null;
      if (!order || order.length !== current.size) throw new ApiError('El orden de fotos no es válido.');
      const next = { ...u, photos: order };
      await setSetting('upcoming', next);
      return next;
    },
  ],
  [
    'DELETE',
    /^\/upcoming\/photos$/,
    async (_, body) => {
      const u = await getSetting('upcoming');
      if (!(u.photos || []).includes(body?.url)) throw new ApiError('Esa foto no existe.', 404);
      await removeImage(body.url);
      const next = { ...u, photos: u.photos.filter((p) => p !== body.url) };
      await setSetting('upcoming', next);
      return next;
    },
  ],
  [
    'POST',
    /^\/upcoming\/new$/,
    async () => {
      const old = await getSetting('upcoming');
      for (const p of old.photos || []) await removeImage(p);
      const next = {
        ...old,
        id: `lanzamiento-${crypto.randomUUID().slice(0, 8)}`,
        name: 'Nuevo perfume',
        edition: 'Muy pronto',
        description: '',
        notes: { top: [], heart: [], base: [] },
        photos: [],
        launch: new Date(Date.now() + 30 * 86400000).toISOString(),
        silhouette: true,
      };
      await setSetting('upcoming', next);
      return next;
    },
  ],

  // Avisos
  [
    'GET',
    /^\/subscribers$/,
    async () => {
      const u = await getSetting('upcoming');
      const list = await run(supabase.from('subscribers').select('email, created_at, notified_at').eq('launch_id', u.id).order('created_at', { ascending: false }));
      return { launch: { id: u.id, name: u.name }, list };
    },
  ],
  [
    'PUT',
    /^\/subscribers\/notified$/,
    async () => {
      const u = await getSetting('upcoming');
      await run(supabase.from('subscribers').update({ notified_at: new Date().toISOString() }).eq('launch_id', u.id).is('notified_at', null));
      return { ok: true };
    },
  ],
  [
    'DELETE',
    /^\/subscribers\/(.+)$/,
    async ([email]) => {
      const u = await getSetting('upcoming');
      await run(supabase.from('subscribers').delete().eq('launch_id', u.id).eq('email', email.toLowerCase()));
      return { ok: true };
    },
  ],

  // Cuentas del panel (solo lectura: se crean en Supabase)
  ['GET', /^\/admins$/, () => run(supabase.from('admins').select('username, name, created_at').order('created_at'))],
];

export async function request(path, { method = 'GET', body, form } = {}) {
  if (!supabaseReady) throw new ApiError('El panel todavía no está conectado a Supabase (falta src/config.js).', 0);
  const sub = path.replace(/^\/api\/admin/, '');
  for (const [m, re, handler] of routes) {
    if (m !== method) continue;
    const match = re.exec(sub);
    if (!match) continue;
    try {
      return await handler(match.slice(1).map(decodeURIComponent), body || {}, form);
    } catch (e) {
      if (e instanceof ValidationError) throw new ApiError(e.message, 400);
      throw e;
    }
  }
  throw new ApiError('No encontrado.', 404);
}
