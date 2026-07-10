// Carte interactive et "évolutive" du parcours (boucle autour de l'Étang
// Saint-Nicolas, Angers) — dessin animé du tracé au chargement.
(function () {
  const mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  const CENTER = [47.4755, -0.572];

  // Points approximatifs de la boucle autour de l'étang (tracé indicatif).
  const ROUTE = [
    [47.4755, -0.5662], [47.47655, -0.56648], [47.4775, -0.56731], [47.47825, -0.56859],
    [47.47873, -0.57021], [47.4789, -0.572], [47.47873, -0.57379], [47.47825, -0.57541],
    [47.4775, -0.57669], [47.47655, -0.57752], [47.4755, -0.5778], [47.47445, -0.57752],
    [47.4735, -0.57669], [47.47275, -0.57541], [47.47227, -0.57379], [47.4721, -0.572],
    [47.47227, -0.57021], [47.47275, -0.56859], [47.4735, -0.56731], [47.47445, -0.56648],
    [47.4755, -0.5662],
  ];

  const map = L.map(mapEl, { scrollWheelZoom: false }).setView(CENTER, 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; contributeurs OpenStreetMap",
  }).addTo(map);

  L.marker(ROUTE[0], {
    title: "Départ / arrivée",
  })
    .addTo(map)
    .bindPopup("🏁 Départ / arrivée de la boucle");

  const routeLine = L.polyline([], { color: "#3fb1ec", weight: 5, opacity: 0.9 }).addTo(map);
  const runner = L.circleMarker(ROUTE[0], {
    radius: 7,
    color: "#fff",
    weight: 2,
    fillColor: "#3fb1ec",
    fillOpacity: 1,
  }).addTo(map);

  let animId = null;

  function animateRoute() {
    if (animId) clearInterval(animId);
    routeLine.setLatLngs([]);
    let i = 0;
    animId = setInterval(() => {
      i++;
      routeLine.setLatLngs(ROUTE.slice(0, i + 1));
      runner.setLatLng(ROUTE[i]);
      if (i >= ROUTE.length - 1) {
        clearInterval(animId);
        animId = null;
      }
    }, 140);
  }

  // Démarre l'animation une fois la carte prête et visible.
  map.whenReady(() => setTimeout(animateRoute, 400));

  document.getElementById("replay-btn").addEventListener("click", animateRoute);
})();
