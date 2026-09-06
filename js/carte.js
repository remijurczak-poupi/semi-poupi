// Carte interactive du parcours (boucle autour de l'Étang Saint-Nicolas, Angers).
// Tracé redessiné à partir des cartes officielles du Défi24h (2 boucles au choix,
// 5 km ou 8 km) — approximatif (dessiné à la main d'après le plan fourni par
// l'organisation), pas un relevé GPS au mètre près.
(function () {
  const mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  // Point de jonction ("Guides parcours" sur le plan officiel) où se détache la
  // petite boucle qui transforme les 5 km en 8 km.
  const JUNCTION = [47.4775, -0.575];
  // Pointe sud-est de l'étang, où se trouve le départ/arrivée.
  const DEPART = [47.46481, -0.54962];

  // Rive nord (de la jonction jusqu'au départ).
  const NORTH_BANK = [
    [47.4775, -0.575], [47.47835, -0.57077], [47.47722, -0.56598], [47.47553, -0.5609],
    [47.47271, -0.55667], [47.46989, -0.55385], [47.46707, -0.55103], [47.46481, -0.54962],
  ];
  // Rive sud (du départ jusqu'à la jonction) — referme la boucle des 5 km.
  const SOUTH_BANK = [
    [47.46481, -0.54962], [47.4665, -0.553], [47.46876, -0.55752], [47.47101, -0.56146],
    [47.47327, -0.56541], [47.47496, -0.56936], [47.47609, -0.57274], [47.4775, -0.575],
  ];
  // Petite boucle au nord-ouest de la jonction (le "plus" en rouge sur le plan
  // officiel) — ajoutée à la boucle des 5 km pour former les 8 km.
  const RED_LOOP = [
    [47.4775, -0.575], [47.48098, -0.5781], [47.48331, -0.58197], [47.48485, -0.58468],
    [47.48369, -0.58738], [47.48098, -0.58893], [47.47827, -0.58777], [47.47673, -0.58429],
    [47.47711, -0.57964], [47.4775, -0.575],
  ];

  const ROUTES = {
    5: NORTH_BANK.concat(SOUTH_BANK.slice(1)),
    8: RED_LOOP.concat(NORTH_BANK.slice(1)).concat(SOUTH_BANK.slice(1)),
  };

  const allPoints = ROUTES[8]; // le plus grand des deux tracés, sert à cadrer la carte
  const bounds = L.latLngBounds(allPoints);

  const map = L.map(mapEl, { scrollWheelZoom: false }).fitBounds(bounds, { padding: [24, 24] });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; contributeurs OpenStreetMap",
  }).addTo(map);

  L.marker(DEPART, { title: "Départ / arrivée" })
    .addTo(map)
    .bindPopup("🏁 Départ / arrivée de la boucle");
  L.marker(JUNCTION, { title: "Point des guides du parcours" })
    .addTo(map)
    .bindPopup("📍 C'est ici que la boucle de 8 km se sépare de celle de 5 km.");

  const routeLine = L.polyline([], { color: "#3fb1ec", weight: 5, opacity: 0.9 }).addTo(map);
  const runner = L.circleMarker(DEPART, {
    radius: 7,
    color: "#fff",
    weight: 2,
    fillColor: "#3fb1ec",
    fillOpacity: 1,
  }).addTo(map);

  let currentDistance = 5;
  let animId = null;

  function animateRoute() {
    if (animId) clearInterval(animId);
    const pts = ROUTES[currentDistance];
    routeLine.setLatLngs([]);
    runner.setLatLng(pts[0]);
    let i = 0;
    animId = setInterval(() => {
      i++;
      routeLine.setLatLngs(pts.slice(0, i + 1));
      runner.setLatLng(pts[i]);
      if (i >= pts.length - 1) {
        clearInterval(animId);
        animId = null;
      }
    }, 90);
  }

  function setDistance(km) {
    currentDistance = km;
    document.querySelectorAll("[data-route-distance]").forEach((btn) => {
      const isActive = Number(btn.dataset.routeDistance) === km;
      btn.classList.toggle("btn-primary", isActive);
      btn.classList.toggle("btn-outline", !isActive);
    });
    animateRoute();
  }

  document.querySelectorAll("[data-route-distance]").forEach((btn) => {
    btn.addEventListener("click", () => setDistance(Number(btn.dataset.routeDistance)));
  });

  document.getElementById("replay-btn").addEventListener("click", animateRoute);

  // Démarre l'animation une fois la carte prête et visible (boucle des 5 km par défaut).
  map.whenReady(() => setTimeout(() => setDistance(5), 400));
})();
