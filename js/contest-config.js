// Concours "Jeux de la semaine" (lot à gagner) — une seule semaine, du lundi 00h00 au
// dimanche 23h59. Ce fichier est la SEULE source des dates, partagée par :
//   - js/games/concours.js (calcul du classement limité à cette semaine)
//   - js/games/tir.js (limite à 2 essais/jour sur Mourier's invader pendant cette semaine)
// Pour changer les dates du prochain concours, il suffit de modifier START/END ici.
window.PoupiContest = (function () {
  const START = "2026-11-23"; // lundi, 00h00
  const END = "2026-11-29"; // dimanche (comparaison en date seule donc toute la journée compte)

  // Volontairement indépendant de js/games/daily.js (pas d'ordre de chargement à respecter) :
  // même logique de date locale que todayStr() ailleurs sur le site.
  function todayStr() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  // "before" avant le lundi, "during" pendant la semaine (bornes incluses), "after" une fois
  // le dimanche passé — le classement reste visible après coup comme résultat final.
  function status() {
    const today = todayStr();
    if (today < START) return "before";
    if (today > END) return "after";
    return "during";
  }

  function isActive() {
    return status() === "during";
  }

  return { START, END, todayStr, status, isActive };
})();
