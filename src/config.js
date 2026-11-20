// Conexión con Supabase (base de datos, fotos y cuentas del panel).
// Esta es la clave "publishable": está hecha para ir en la página. La seguridad la ponen las reglas
// de la base de datos (supabase/schema.sql). NUNCA pongas aquí una clave "secret" ni "service_role".
export const SUPABASE_URL = 'https://leyqivyjzroasmubbory.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_YYz5IdhDGZHlEIjMuwSuXQ_TzO06TdZ';

// "Avísame cuando llegue": apagado por ahora. Para volver a usarlo, cámbialo a true
// (la base de datos, el formulario y la sección Avisos del panel siguen listos).
export const NOTIFY_ENABLED = false;

// Las cuentas del panel entran con usuario; por dentro se guardan como usuario@este-dominio.
export const PANEL_EMAIL_DOMAIN = 'panel.anima.app';
