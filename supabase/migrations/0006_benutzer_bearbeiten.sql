-- Benutzer bearbeiten: Der Inhaber ändert Name, E-Mail und Passwort jedes Zugangs,
-- jeder Benutzer seinen eigenen Namen (das eigene Passwort ändert man über Supabase Auth selbst).
-- Die Anmeldedaten liegen in auth.users; pgcrypto (Schema extensions) ist in Supabase schon eingeschaltet.

/** Name und E-Mail eines Zugangs ändern (nur Inhaber). Die neue E-Mail gilt sofort für die Anmeldung. */
create or replace function public.benutzer_daten_aendern(p_id uuid, p_name text, p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare
  neue_email text := lower(trim(p_email));
begin
  perform intern.pruefe(array['inhaber']::rolle[]);
  if coalesce(trim(p_name), '') = '' then raise exception 'Bitte einen Namen angeben.'; end if;
  if neue_email !~ '^\S+@\S+\.\S+$' then raise exception 'Bitte eine gültige E-Mail-Adresse angeben.'; end if;
  if not exists (select 1 from profil where id = p_id) then raise exception 'Benutzer nicht gefunden.'; end if;
  if exists (select 1 from auth.users where lower(email) = neue_email and id <> p_id)
     or exists (select 1 from einladung where email = neue_email) then
    raise exception 'Diese E-Mail-Adresse wird schon verwendet.';
  end if;
  update profil set name = trim(p_name), email = neue_email where id = p_id;
  update auth.users set email = neue_email where id = p_id;
  -- Supabase merkt sich die Adresse zusätzlich beim Anmelde-Weg „E-Mail“
  if to_regclass('auth.identities') is not null then
    begin
      execute $q$update auth.identities set identity_data = identity_data || jsonb_build_object('email', $1)
                 where user_id = $2 and provider = 'email'$q$ using neue_email, p_id;
    exception when insufficient_privilege then null; -- nicht nötig für die Anmeldung
    end;
  end if;
end $$;

/** Neues Passwort für einen Zugang setzen (nur Inhaber), z. B. wenn ein Mitarbeiter seins vergessen hat.
    Danach ist die Person überall abgemeldet und meldet sich mit dem neuen Passwort an. */
create or replace function public.passwort_setzen(p_id uuid, p_passwort text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform intern.pruefe(array['inhaber']::rolle[]);
  if length(coalesce(p_passwort, '')) < 10 then raise exception 'Das Passwort muss mindestens 10 Zeichen haben.'; end if;
  if not exists (select 1 from profil where id = p_id) then raise exception 'Benutzer nicht gefunden.'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_passwort, extensions.gen_salt('bf', 10)) where id = p_id;
  if to_regclass('auth.sessions') is not null then
    begin
      execute 'delete from auth.sessions where user_id = $1' using p_id;
    exception when insufficient_privilege then null; -- dann läuft die alte Anmeldung von selbst ab
    end;
  end if;
end $$;

/** Eigenen Namen ändern (alle Rollen) */
create or replace function public.mein_name_aendern(p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare
  ich profil := intern.pruefe();
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'Bitte einen Namen angeben.'; end if;
  update profil set name = trim(p_name) where id = ich.id;
end $$;

revoke execute on function public.benutzer_daten_aendern(uuid, text, text) from public, anon;
revoke execute on function public.passwort_setzen(uuid, text) from public, anon;
revoke execute on function public.mein_name_aendern(text) from public, anon;
grant execute on function public.benutzer_daten_aendern(uuid, text, text) to authenticated;
grant execute on function public.passwort_setzen(uuid, text) to authenticated;
grant execute on function public.mein_name_aendern(text) to authenticated;
