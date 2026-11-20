# Catálogo de perfumes: cómo funciona y cómo publicarlo

Todo es gratis:

- **GitHub Pages** muestra la tienda y el panel.
- **Supabase** guarda los perfumes, las marcas, las fotos, los correos de "Avísame" y las cuentas del panel.

No hay servidor propio que mantener.

## Probar en el computador

```bash
npm install
npm run dev
```

- Tienda: http://localhost:5183
- Panel: http://localhost:5183/admin/

Aunque corra en tu computador, se conecta al Supabase real: lo que cambies ahí se ve en la tienda publicada.

## Supabase (ya está configurado)

- Proyecto: `leyqivyjzroasmubbory`. La dirección y la clave pública están en `src/config.js`.
- `supabase/schema.sql` crea las tablas y las reglas de seguridad. Ya se ejecutó; se puede volver a ejecutar sin perder datos.
- `supabase/seed.sql` tiene el catálogo de ejemplo (`npm run seed` lo regenera desde `src/data.js`).
- `node supabase/test-security.mjs` comprueba que un visitante:
  - solo puede ver el catálogo y anotarse en "Avísame";
  - no puede cambiar nada ni leer los correos.

**Nunca** pongas en el código una clave "secret" o "service_role" de Supabase. La de `src/config.js` es la "publishable": es pública por diseño.

### Crear una cuenta para el panel

1. Supabase → **Authentication → Users → Add user → Create new user**.
2. Email: `usuario@panel.anima.app` (por ejemplo `jeff77@panel.anima.app`). Contraseña: la que quieras, mínimo 10 caracteres. Marca **Auto Confirm User**.
3. Supabase → **SQL Editor**, ejecuta (cambiando usuario y nombre):

   ```sql
   insert into public.admins (user_id, username, name)
   select id, 'jeff77', 'Jeff' from auth.users where email = 'jeff77@panel.anima.app';
   ```

En el panel se entra solo con el usuario (`jeff77`) y la contraseña. Cada quien puede cambiar su contraseña en **Acceso**.

Para quitarle el acceso a alguien, borra su fila en la tabla `admins` (o el usuario completo en Authentication).

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub (puede ser privado solo con GitHub Pro; si es gratis, debe ser **público**). En el código no hay secretos.
2. Sube esta carpeta al repositorio, en la rama `main`.
3. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
4. Cada vez que subas cambios, la tienda se publica sola en 1 o 2 minutos en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`. El panel está en `/admin/`.

### Que Supabase no se duerma

Supabase pausa los proyectos gratis después de 7 días sin actividad. La tarea `.github/workflows/mantener-activo.yml` lo consulta cada 3 días automáticamente. No hay que hacer nada; solo dejarla en el repositorio.

### Dominio propio (opcional, más adelante)

En **Settings → Pages → Custom domain** escribe tu dominio y sigue los pasos de GitHub. No hay que cambiar nada en el código.

## Límites del plan gratis

- **Supabase:** 500 MB de base de datos, 1 GB de fotos y 5 GB de descarga al mes. Las fotos se suben ya optimizadas (WebP, máx. 1600 px, ~150 KB), así que alcanza para miles de fotos.
- **GitHub Pages:** 100 GB de visitas al mes.
