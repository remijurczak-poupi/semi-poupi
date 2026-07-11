// Met en surbrillance le lien de nav actif si non déjà fait en dur dans le HTML
(function () {
  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav.main-nav a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path) a.classList.add("active");
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
