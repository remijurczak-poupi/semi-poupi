// Hub des jeux : gère juste les onglets — les 4 jeux sont désormais tous
// des jeux quotidiens (un seul essai par jour chacun, cf daily.js).
(function () {
  const GAMES = ["morpion", "motus", "motsmeles", "memory"];

  const tabs = document.querySelectorAll(".game-tab");
  const panels = {};
  GAMES.forEach((g) => (panels[g] = document.getElementById("panel-" + g)));

  function showGame(game) {
    GAMES.forEach((g) => {
      panels[g].style.display = g === game ? "block" : "none";
    });
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.game === game));
    if (game === "morpion" && window.PoupiMorpion) window.PoupiMorpion.init();
    if (game === "motus" && window.PoupiMotus) window.PoupiMotus.init();
    if (game === "motsmeles" && window.PoupiMotsMeles) window.PoupiMotsMeles.init();
    if (game === "memory" && window.PoupiMemory) window.PoupiMemory.init();
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => showGame(tab.dataset.game));
  });

  showGame(GAMES[0]);
})();
