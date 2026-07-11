// Compte à rebours avant le grand départ du Défi24h, affiché sur l'accueil.
// Trois états : avant le départ (jours/heures/minutes/secondes restants), pendant les 24h,
// après. Mis à jour chaque seconde pour un vrai effet "compte à rebours" (avant, seul le
// nombre de jours était affiché, rafraîchi une fois par heure).
//
// Sous le compte à rebours, une petite ligne "température ressentie" descend au fil des
// jours qui approchent (-2°C loin de l'évènement, -15°C le jour J) — un gag purement
// thématique, aucun lien avec la météo réelle.
(function () {
  const el = document.getElementById("countdown");
  const feltEl = document.getElementById("felt-temp");
  if (!el) return;

  const START = new Date("2026-12-04T16:00:00+01:00");
  const END = new Date("2026-12-05T16:00:00+01:00");
  const HORIZON_DAYS = 150; // au-delà, on reste à -2°C : pas la peine d'aller plus loin

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function feltTemp(daysRemaining) {
    const clampedDays = Math.max(0, Math.min(HORIZON_DAYS, daysRemaining));
    return Math.round(-2 - ((HORIZON_DAYS - clampedDays) / HORIZON_DAYS) * 13);
  }

  function feltLabel(temp) {
    if (temp > -5) return "on n'y est pas encore, mais ça vient";
    if (temp > -10) return "ça commence à piquer";
    if (temp > -13) return "prépare déjà les gants";
    return "ça caille sévère";
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
      if (feltEl) {
        const temp = feltTemp(days);
        feltEl.textContent = `🌡️ Température ressentie : ${temp}°C — ${feltLabel(temp)}`;
      }
    } else if (now <= END) {
      el.textContent = `🔥 C'est parti, on est en plein dans les 24h !`;
      if (feltEl) feltEl.textContent = `🌡️ Température ressentie : -18°C — on y est, ça caille sévère`;
    } else {
      el.textContent = `🏁 Édition 2026 terminée — merci à tous, à l'année prochaine !`;
      if (feltEl) feltEl.textContent = `🌡️ Température ressentie : de nouveau supportable, à l'année prochaine`;
    }
  }

  render();
  setInterval(render, 1000);
})();
