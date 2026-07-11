// Remplace les cartes de la page Parrains par un message "surprise" si la section est
// désactivée depuis l'admin (voir js/site-settings.js) — permet de garder les vidéos de
// parrains secrètes jusqu'au moment choisi pour les révéler, sans toucher au code.
(function () {
  if (typeof window.PoupiSettings === "undefined") return;
  window.PoupiSettings.isEnabled("parrains", true).then((enabled) => {
    if (enabled) return;
    const grid = document.getElementById("parrains-grid");
    if (!grid) return;
    grid.innerHTML = `
      <div class="card info-card center" style="grid-column:1 / -1;">
        <span class="icon">🎁</span>
        <h3>Chhht... ça reste une surprise !</h3>
        <p>On prépare quelque chose de sympa avec nos parrains et marraines — reviens faire
        un tour sur cette page un peu plus tard.</p>
      </div>
    `;
  });
})();
