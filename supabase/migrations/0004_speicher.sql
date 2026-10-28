-- Privater Speicher für Rechnungen (finanzen/…) und Fotos (technik/…).
-- Erlaubt sind nur PDF und Fotos (kein SVG/HTML), höchstens 10 MB.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dateien', 'dateien', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "dateien lesen" on storage.objects;
drop policy if exists "dateien hochladen" on storage.objects;
drop policy if exists "dateien loeschen" on storage.objects;

create policy "dateien lesen" on storage.objects for select to authenticated
  using (bucket_id = 'dateien' and intern.speicher_darf(name, 'lesen'));

create policy "dateien hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'dateien' and intern.speicher_darf(name, 'schreiben'));

create policy "dateien loeschen" on storage.objects for delete to authenticated
  using (bucket_id = 'dateien' and intern.speicher_darf(name, 'loeschen'));
