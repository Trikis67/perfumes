// Conexión con Supabase (base de datos, fotos y cuentas del panel).
// Esta es la clave "publishable": está hecha para ir en la página. La seguridad la ponen las reglas
// de la base de datos (supabase/schema.sql). NUNCA pongas aquí una clave "secret" ni "service_role".
export const SUPABASE_URL = 'https://leyqivyjzroasmubbory.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_YYz5IdhDGZHlEIjMuwSuXQ_TzO06TdZ';

// Las cuentas del panel entran con usuario; por dentro se guardan como usuario@este-dominio.
export const PANEL_EMAIL_DOMAIN = 'panel.anima.app';
