import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/konfiguration";

export const supabaseEingerichtet = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const supabase = createClient(SUPABASE_URL || "http://localhost:54321", SUPABASE_PUBLISHABLE_KEY || "lokal", {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "makanda-anmeldung" },
});
