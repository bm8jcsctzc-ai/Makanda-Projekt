// Verbindung zu Supabase. Diese beiden Werte sind öffentlich (sie stehen ohnehin im Browser) –
// geschützt wird alles durch die Anmeldung und die Regeln in der Datenbank.
// Werte aus Supabase: Project Settings › API Keys (Project URL und „Publishable key“).
// Beim Bauen können sie über NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY überschrieben werden.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://nkvjexhzdmdukmkyluin.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_3d_Dg71S1cJ4ZAzsSAB2gw_hxClfmg_";
