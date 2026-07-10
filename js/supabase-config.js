// ===== Configuration Supabase =====
// Ces deux valeurs sont publiques par nature (clé "anon"), à récupérer dans
// Supabase > Project Settings > API, une fois le projet créé.
// Remplace les deux valeurs ci-dessous puis c'est prêt.

const SUPABASE_URL = "https://wdvoolpbgypzldsjukgn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_p-38au1_EA5wSNsZnevyYA_CMhLFZFG";

// Ne pas modifier en dessous de cette ligne.
// Protégé par try/catch : si le CDN Supabase n'a pas pu charger (réseau capricieux,
// bloqueur de script...), le reste du site continue à fonctionner normalement au lieu
// de planter entièrement — seules les fonctionnalités liées à Supabase sont indisponibles.
let supabaseClient = null;
try {
  if (!SUPABASE_URL.includes("VOTRE-PROJET") && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error("Impossible d'initialiser Supabase :", e);
}

function ensureSupabaseConfigured() {
  if (!supabaseClient) {
    console.error("Supabase n'est pas configuré ou n'a pas pu charger (voir js/supabase-config.js).");
    return false;
  }
  return true;
}
