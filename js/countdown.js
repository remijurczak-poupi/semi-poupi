// Compte à rebours avant le grand départ du Défi24h, affiché sur l'accueil.
// Trois états : avant le départ (jours/heures/minutes/secondes restants), pendant les 24h,
// après. Mis à jour chaque seconde pour un vrai effet "compte à rebours" (avant, seul le
// nombre de jours était affiché, rafraîchi une fois par heure).
(function () {
  const el = document.getElementById("countdown");
  if (!el) return;

  const START = new Date("2026-12-04T16:00:00+01:00");
  const END = new Date("2026-12-05T16:00:00+01:00");

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function render() {
    const now = new Date();
    if (now < START) {
      const totalSeconds = Math.floor((START.getTime() - now.getTime()) / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const dayLabel = days === 1 ? "1 jour" : `${days} jours`;
      el.textContent =
        `⏳ Plus que ${dayLabel} ${pad(hours)} h ${pad(minutes)} min ${pad(seconds)} sec ` +
        `avant la bagarre !`;
    } else if (now <= END) {
      el.textContent = `🔥 C'est parti, on est en plein dans les 24h !`;
    } else {
      el.textContent = `🏁 Édition 2026 terminée — merci à tous, à l'année prochaine !`;
    }
  }

  render();
  setInterval(render, 1000);
})();
