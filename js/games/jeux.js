// Hub des jeux : gère les onglets + le "jeu du jour" qui tourne chaque jour.
(function () {
  const GAMES = ["morpion", "motus", "motsmeles", "memory"];

  function dayOfYear(d) {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d - start;
    return Math.floor(diff / 86400000);
  }

  const todayGame = GAMES[dayOfYear(new Date()) % GAMES.length];

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
    if (tab.dataset.game === todayGame) tab.classList.add("is-today");
  });

  // Repère visuellement quel badge "jeu du jour" afficher.
  document.querySelectorAll(".today-badge").forEach((b) => {
    b.style.display = b.dataset.badge === todayGame ? "inline-flex" : "none";
  });

  showGame(todayGame);
})();
