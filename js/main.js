// Met en surbrillance le lien de nav actif si non déjà fait en dur dans le HTML
(function () {
  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav.main-nav a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path) a.classList.add("active");
  });
})();

// Révèle le lien "Parrains" du menu si la section est activée depuis l'admin (voir
// js/site-settings.js). Le lien est masqué par défaut en CSS (#nav-parrains{display:none})
// plutôt que visible-puis-caché en JS : sinon il apparaît une fraction de seconde à chaque
// chargement de page avant que ce script ait fini de vérifier le réglage — l'effet de
// clignotement remarqué par Rémi. fallback=true : si Supabase est injoignable, on préfère
// finir par montrer le lien plutôt que de bloquer la navigation à cause d'un souci réseau.
(function () {
  const link = document.getElementById("nav-parrains");
  if (!link || typeof window.PoupiSettings === "undefined") return;
  window.PoupiSettings.isEnabled("parrains", true).then((enabled) => {
    // "block" plutôt que "" (qui annulerait juste le style en ligne) : le lien resterait
    // caché sinon, car la règle CSS #nav-parrains{display:none} s'appliquerait encore.
    if (enabled) link.style.display = "block";
  });
})();

// Menu burger mobile : ouvre/ferme la nav en dropdown sous le header sticky.
// Se ferme automatiquement au clic sur un lien, au clic en dehors, ou si la
// fenêtre est redimensionnée au-delà du seuil mobile (retour en nav horizontale).
(function () {
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("main-nav");
  if (!toggle || !nav) return;

  function closeNav() {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = "&#9776;";
  }
  function openNav() {
    nav.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.innerHTML = "&#10005;";
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (nav.classList.contains("open")) closeNav();
    else openNav();
  });
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeNav));
  document.addEventListener("click", (e) => {
    if (nav.classList.contains("open") && !nav.contains(e.target) && !toggle.contains(e.target)) {
      closeNav();
    }
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1040) closeNav();
  });
})();

// Petite neige qui tombe en fond sur tout le site, pour l'ambiance glaciale du
// thème — léger, en CSS pur (positions/durées générées ici), désactivé si la
// personne préfère moins d'animations.
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const FLAKES = window.innerWidth < 640 ? 18 : 32;
  const glyphs = ["❄", "❅", "❆"];
  const field = document.createElement("div");
  field.className = "snowfield";
  field.setAttribute("aria-hidden", "true");
  for (let i = 0; i < FLAKES; i++) {
    const flake = document.createElement("span");
    flake.className = "snowflake";
    flake.textContent = glyphs[i % glyphs.length];
    const left = Math.random() * 100;
    const duration = 9 + Math.random() * 14;
    const delay = Math.random() * -20;
    const size = 0.5 + Math.random() * 0.9;
    const drift = 30 + Math.random() * 60;
    const sway = 3 + Math.random() * 4;
    flake.style.left = left + "vw";
    flake.style.fontSize = size + "rem";
    flake.style.opacity = (0.25 + Math.random() * 0.55).toFixed(2);
    flake.style.animationDuration = duration + "s, " + sway + "s";
    flake.style.animationDelay = delay + "s, " + delay + "s";
    flake.style.setProperty("--drift", drift + "px");
    field.appendChild(flake);
  }
  document.body.appendChild(field);
})();

// Givre sur les bords de l'écran après un moment d'inactivité — comme une vitre qui gèle
// petit à petit, et se dégivre dès qu'on rebouge. Le centre de l'écran reste toujours net
// (effet en vignette), donc ça ne gêne jamais la lecture.
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const IDLE_MS = 25000;
  const overlay = document.createElement("div");
  overlay.className = "frost-overlay";
  overlay.setAttribute("aria-hidden", "true");
  document.body.appendChild(overlay);

  let idleTimer = null;
  function goIdle() {
    overlay.classList.add("active");
  }
  function resetIdle() {
    overlay.classList.remove("active");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(goIdle, IDLE_MS);
  }
  ["mousemove", "keydown", "touchstart", "scroll", "click"].forEach((evt) =>
    window.addEventListener(evt, resetIdle, { passive: true })
  );
  resetIdle();
})();

// Easter egg clavier : tape F-R-O-I-D n'importe où sur le site pour déclencher un mini
// blizzard (rafale de flocons + petit message). Pur clin d'œil, aucune incidence sur le
// reste du site.
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const CODE = "froid";
  let buffer = "";

  window.addEventListener("keydown", (e) => {
    if (e.key.length !== 1) return; // ignore Shift/Enter/flèches/etc., seulement les lettres
    buffer = (buffer + e.key.toLowerCase()).slice(-CODE.length);
    if (buffer === CODE) triggerBlizzard();
  });

  function triggerBlizzard() {
    const toast = document.createElement("div");
    toast.className = "blizzard-toast";
    toast.textContent = "🥶 BLIZZARD POUPI ACTIVÉ !";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);

    const glyphs = ["❄", "❅", "❆"];
    for (let i = 0; i < 44; i++) {
      const flake = document.createElement("span");
      flake.className = "blizzard-flake";
      flake.textContent = glyphs[i % glyphs.length];
      flake.style.left = Math.random() * 100 + "vw";
      flake.style.animationDuration = 1.1 + Math.random() * 1.1 + "s";
      flake.style.animationDelay = Math.random() * -0.8 + "s";
      flake.style.fontSize = 0.8 + Math.random() * 1.5 + "rem";
      document.body.appendChild(flake);
      setTimeout(() => flake.remove(), 2600);
    }
  }
})();

// Petite glace qui craque sous le clic, un peu partout sur le site — clin d'œil "on marche
// sur de la glace fine". Désactivé dans les jeux (.game-panel) pour ne pas polluer l'écran
// pendant une partie où on clique beaucoup (Démineur, Memory, tir...), et limité à un effet
// toutes les 200ms max pour éviter le clignotement si quelqu'un clique très vite ailleurs.
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ICE_CRACK_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g stroke="#bfe6ff" stroke-width="1.4" stroke-linecap="round" opacity=".9">
      <path d="M32 32 L13 21"/><path d="M32 32 L53 17"/><path d="M32 32 L19 51"/>
      <path d="M32 32 L48 54"/><path d="M32 32 L7 37"/><path d="M32 32 L57 40"/>
      <path d="M13 21 L5 14"/><path d="M53 17 L60 9"/><path d="M19 51 L10 58"/>
    </g>
  </svg>`;
  let lastCrack = 0;

  document.addEventListener("click", (e) => {
    if (e.target.closest(".game-panel")) return;
    const now = Date.now();
    if (now - lastCrack < 200) return;
    lastCrack = now;

    const crack = document.createElement("span");
    crack.className = "ice-crack";
    crack.style.left = e.clientX + "px";
    crack.style.top = e.clientY + "px";
    crack.innerHTML = ICE_CRACK_SVG;
    crack.setAttribute("aria-hidden", "true");
    document.body.appendChild(crack);
    setTimeout(() => crack.remove(), 550);
  });
})();
