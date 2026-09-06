// Carte interactive du parcours (boucle autour de l'Étang Saint-Nicolas, Angers).
// Tracé extrait automatiquement (segmentation d'image + squelette du contour) à partir des
// cartes officielles du Défi24h fournies par Rémi, puis recalé sur la vraie position de
// l'étang — bien plus fidèle qu'un simple cercle indicatif, mais toujours pas un relevé GPS
// au mètre près (voir js/carte.js pour le détail de la méthode, et le texte sous la carte).
(function () {
  const mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  // Point de jonction ("Guides parcours" sur le plan officiel), identique de jour comme de
  // nuit, où se détache la petite boucle qui transforme les 5 km en 8 km.
  const JUNCTION = [47.4775, -0.575];
  // Pointe sud-est de l'étang, où se trouve le départ/arrivée.
  const DEPART = [47.46481, -0.54962];

  // Boucle principale (5 km) et boucle supplémentaire (+3 km ≈ 8 km au total), pour chacun
  // des 2 parcours du Défi24h.
  const ROUTES = {
    jour: {
      main: [[47.4775, -0.575], [47.47662, -0.57363], [47.47599, -0.57139], [47.47562, -0.56906], [47.47541, -0.56667], [47.47489, -0.56437], [47.47406, -0.56235], [47.47267, -0.56107], [47.47163, -0.55919], [47.4708, -0.5571], [47.4697, -0.55759], [47.46846, -0.55913], [47.46728, -0.55811], [47.46684, -0.55581], [47.46591, -0.5539], [47.46642, -0.55284], [47.46748, -0.55445], [47.46811, -0.55658], [47.46947, -0.55572], [47.47081, -0.55437], [47.47169, -0.55627], [47.47246, -0.55841], [47.47345, -0.56036], [47.47493, -0.56144], [47.47598, -0.56321], [47.47628, -0.56559], [47.47663, -0.56797], [47.47692, -0.57036], [47.47745, -0.57264], [47.4775, -0.575]],
      extra: [[47.47709, -0.57564], [47.47879, -0.57652], [47.48005, -0.57768], [47.48043, -0.58049], [47.48192, -0.5822], [47.48192, -0.58126], [47.48056, -0.57941], [47.48025, -0.57653], [47.47863, -0.57583], [47.47899, -0.57565], [47.48036, -0.57686], [47.48075, -0.57969], [47.48223, -0.58093], [47.48185, -0.58233], [47.48037, -0.58055], [47.47998, -0.57773], [47.4787, -0.57665], [47.47709, -0.57564]],
    },
    nuit: {
      main: [[47.4775, -0.575], [47.47631, -0.57392], [47.4749, -0.57284], [47.47494, -0.57048], [47.47491, -0.5681], [47.475, -0.56577], [47.4738, -0.56419], [47.47279, -0.56229], [47.47202, -0.5602], [47.47104, -0.55835], [47.46945, -0.55863], [47.4679, -0.55861], [47.46763, -0.55633], [47.46715, -0.55402], [47.46623, -0.55246], [47.46731, -0.55426], [47.46771, -0.55658], [47.46818, -0.5587], [47.46964, -0.55794], [47.47082, -0.55628], [47.47161, -0.55732], [47.47247, -0.55937], [47.47325, -0.56149], [47.47463, -0.56275], [47.47541, -0.56484], [47.47587, -0.56717], [47.47598, -0.56958], [47.47622, -0.57198], [47.47662, -0.57429], [47.4775, -0.575]],
      extra: [[47.47651, -0.57472], [47.47761, -0.57618], [47.47857, -0.5778], [47.48024, -0.5775], [47.48132, -0.57917], [47.48149, -0.58162], [47.48177, -0.58403], [47.48292, -0.58571], [47.48444, -0.58554], [47.48328, -0.58733], [47.48192, -0.58647], [47.48089, -0.58454], [47.48068, -0.58211], [47.48065, -0.57971], [47.47929, -0.57914], [47.47764, -0.57901], [47.47681, -0.57712], [47.47651, -0.57472]],
    },
  };

  // Tous les points des 2 variantes, pour cadrer la carte une bonne fois pour toutes (le
  // cadrage ne bouge pas quand on bascule jour/nuit, c'est plus confortable à l'œil).
  const allPoints = []
    .concat(ROUTES.jour.main, ROUTES.jour.extra, ROUTES.nuit.main, ROUTES.nuit.extra);
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
    .bindPopup("📍 C'est ici que la petite boucle des 8 km se détache de celle des 5 km.");

  // Les 2 boucles sont toujours affichées ensemble (5 km en bleu, le "plus" qui mène à 8 km
  // en rouge, comme sur le plan officiel) — seul le tracé jour/nuit change avec les boutons.
  const mainLine = L.polyline([], { color: "#3fb1ec", weight: 5, opacity: 0.9 }).addTo(map);
  const extraLine = L.polyline([], { color: "#ff6b6b", weight: 5, opacity: 0.9 }).addTo(map);
  const runner = L.circleMarker(JUNCTION, {
    radius: 7,
    color: "#fff",
    weight: 2,
    fillColor: "#3fb1ec",
    fillOpacity: 1,
  }).addTo(map);

  const ANIMATION_MS = 5000;
  let currentVariant = "jour";
  let animId = null;

  function animateRoute() {
    if (animId) clearInterval(animId);
    const route = ROUTES[currentVariant];
    // Parcouru dans l'animation : la petite boucle d'abord (retour à la jonction), puis la
    // grande boucle jusqu'au départ et retour — dans l'ordre où on les rencontre à pied.
    const fullPath = route.extra.concat(route.main.slice(1));
    mainLine.setLatLngs([]);
    extraLine.setLatLngs([]);
    runner.setLatLng(fullPath[0]);
    const stepMs = ANIMATION_MS / (fullPath.length - 1);
    let i = 0;
    animId = setInterval(() => {
      i++;
      if (i < route.extra.length) {
        extraLine.setLatLngs(fullPath.slice(0, i + 1));
      } else {
        extraLine.setLatLngs(route.extra);
        mainLine.setLatLngs(fullPath.slice(route.extra.length - 1, i + 1));
      }
      runner.setLatLng(fullPath[i]);
      if (i >= fullPath.length - 1) {
        clearInterval(animId);
        animId = null;
      }
    }, stepMs);
  }

  function setVariant(variant) {
    currentVariant = variant;
    document.querySelectorAll("[data-route-variant]").forEach((btn) => {
      const isActive = btn.dataset.routeVariant === variant;
      btn.classList.toggle("btn-primary", isActive);
      btn.classList.toggle("btn-outline", !isActive);
    });
    animateRoute();
  }

  document.querySelectorAll("[data-route-variant]").forEach((btn) => {
    btn.addEventListener("click", () => setVariant(btn.dataset.routeVariant));
  });

  document.getElementById("replay-btn").addEventListener("click", animateRoute);

  // Démarre l'animation une fois la carte prête et visible (parcours de jour par défaut).
  map.whenReady(() => setTimeout(() => setVariant("jour"), 400));
})();
