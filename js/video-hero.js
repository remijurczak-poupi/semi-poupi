// Gère la vidéo d'accueil : autoplay (muet, requis par les navigateurs),
// bouton son on/off, bouton "passer" qui scrolle sous la vidéo.
(function () {
  const section = document.getElementById("video-hero");
  const video = document.getElementById("teaser-video");
  const muteBtn = document.getElementById("video-mute-btn");
  const skipBtn = document.getElementById("video-skip-btn");
  if (!section || !video) return;

  // Tentative de lecture (certains navigateurs mobiles bloquent même le muet
  // tant qu'il n'y a pas eu d'interaction : on retente au premier clic/scroll).
  const tryPlay = () => video.play().catch(() => {});
  tryPlay();
  ["click", "touchstart", "scroll"].forEach((evt) =>
    window.addEventListener(evt, tryPlay, { once: true, passive: true })
  );

  muteBtn.addEventListener("click", () => {
    video.muted = !video.muted;
    if (!video.muted) tryPlay();
    muteBtn.textContent = video.muted ? "🔇 Son" : "🔊 Son";
    muteBtn.setAttribute("aria-label", video.muted ? "Activer le son" : "Couper le son");
  });

  skipBtn.addEventListener("click", () => {
    const next = section.nextElementSibling;
    if (next) next.scrollIntoView({ behavior: "smooth" });
  });
})();
