-- Activa las categorías y el Shipping Protection del panel.
-- Se ejecuta UNA vez en Supabase → SQL Editor → Run. No borra ni cambia nada de lo que ya tienes.
alter table public.settings drop constraint if exists settings_key_check;
alter table public.settings add constraint settings_key_check
  check (key in ('upcoming', 'families', 'brands', 'showcase', 'categories', 'shop'));

-- Shipping Protection: Q5 que se suman a cada precio de la tienda (se cambia desde el panel).
insert into public.settings (key, value) values ('shop', '{"protectionFee": 5}'::jsonb)
on conflict (key) do nothing;
