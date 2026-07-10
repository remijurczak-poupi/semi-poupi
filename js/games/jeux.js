// Hub des jeux : gère les onglets + le champ prénom partagé pour les classements.
(function () {
  const GAMES = ["morpion", "motus", "motsmeles", "memory", "demineur", "tir"];

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
    if (game === "demineur" && window.PoupiDemineur) window.PoupiDemineur.init();
    if (game === "tir" && window.PoupiTir) window.PoupiTir.init();
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => showGame(tab.dataset.game));
  });

  if (window.PoupiScores) {
    window.PoupiScores.bindPlayerNameInput(document.getElementById("player-name"));
    window.PoupiScores.initModal();
  }

  showGame(GAMES[0]);
})();
