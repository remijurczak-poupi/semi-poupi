// ===== Configuration Supabase =====
// Ces deux valeurs sont publiques par nature (clé "anon"), à récupérer dans
// Supabase > Project Settings > API, une fois le projet créé.
// Remplace les deux valeurs ci-dessous puis c'est prêt.

const SUPABASE_URL = "https://VOTRE-PROJET.supabase.co";
const SUPABASE_ANON_KEY = "VOTRE_CLE_ANON_PUBLIQUE";

// Ne pas modifier en dessous de cette ligne.
const supabaseClient = (SUPABASE_URL.includes("VOTRE-PROJET"))
  ? null
  : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function ensureSupabaseConfigured() {
  if (!supabaseClient) {
    console.error("Supabase n'est pas encore configuré : renseigne SUPABASE_URL et SUPABASE_ANON_KEY dans js/supabase-config.js");
    return false;
  }
  return true;
}
