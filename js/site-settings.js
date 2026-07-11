// Petits interrupteurs pour activer/désactiver des sections du site depuis l'espace admin,
// sans avoir besoin de redéployer (voir sql/schema.sql, table `site_settings`, et la carte
// "Réglages du site" dans admin.html).
//
// Utilisation : `await window.PoupiSettings.isEnabled("parrains", true)`. Le 2e argument est
// la valeur de repli utilisée si Supabase est injoignable ou si le réglage n'existe pas
// encore en base — mieux vaut alors garder le comportement habituel (afficher) que de casser
// silencieusement une partie du site à cause d'un souci réseau.
window.PoupiSettings = (function () {
  let cachePromise = null; // une seule requête réseau, même si plusieurs scripts la demandent

  async function fetchAll() {
    if (typeof ensureSupabaseConfigured !== "function" || !ensureSupabaseConfigured()) {
      return {};
    }
    try {
      const { data, error } = await supabaseClient.from("site_settings").select("key, enabled");
      if (error) {
        console.error("Erreur chargement réglages du site :", error.message);
        return {};
      }
      const map = {};
      (data || []).forEach((row) => {
        map[row.key] = row.enabled;
      });
      return map;
    } catch (e) {
      console.error("Erreur chargement réglages du site :", e);
      return {};
    }
  }

  async function isEnabled(key, fallback) {
    if (!cachePromise) cachePromise = fetchAll();
    const map = await cachePromise;
    return Object.prototype.hasOwnProperty.call(map, key) ? !!map[key] : !!fallback;
  }

  return { isEnabled };
})();
