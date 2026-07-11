// Compte à rebours avant le grand départ du Défi24h, affiché sur l'accueil.
// Trois états : avant le départ (jours restants), pendant les 24h, après.
(function () {
  const el = document.getElementById("countdown");
  if (!el) return;

  const START = new Date("2026-12-04T16:00:00+01:00");
  const END = new Date("2026-12-05T16:00:00+01:00");

  function render() {
    const now = new Date();
    if (now < START) {
      const diffMs = START.getTime() - now.getTime();
      const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const dayLabel = days === 1 ? "1 jour" : `${days} jours`;
      el.textContent = `⏳ Plus que ${dayLabel} avant le grand départ !`;
    } else if (now <= END) {
      el.textContent = `🔥 C'est parti, on est en plein dans les 24h !`;
    } else {
      el.textContent = `🏁 Édition 2026 terminée — merci à tous, à l'année prochaine !`;
    }
  }

  render();
  // Un compte à rebours en jours n'a pas besoin d'un rafraîchissement plus fréquent.
  setInterval(render, 60 * 60 * 1000);
})();
