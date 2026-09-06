// Carte interactive du parcours (boucle autour de l'Étang Saint-Nicolas, Angers).
// Tracé exact, extrait directement des données GPS officielles du Défi24h (vorg.fr) —
// plus une approximation dessinée à partir du flyer : ce sont les vraies coordonnées
// utilisées par l'organisation pour ses propres cartes en ligne.
(function () {
  const mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  // Point de jonction réel ("Guides parcours" sur le plan officiel, poste_id 104), identique
  // de jour comme de nuit, où se détache la petite boucle qui transforme les 5 km en 8 km.
  const JUNCTION = [47.482827, -0.59669];
  // Départ / arrivée réel, au sud-est, commun aux 2 parcours.
  const DEPART = [47.474223, -0.57706];

  // Boucle principale (5 km) et boucle supplémentaire (+3 km ≈ 8 km au total), pour chacun
  // des 2 parcours du Défi24h — coordonnées GPS réelles (relevés officiels vorg.fr).
  const ROUTES = {
    jour: {
      main: [
        [47.483487, -0.596818], [47.483425, -0.59596], [47.483317, -0.595386], [47.483248, -0.594823], [47.483284, -0.594066], [47.483222, -0.593294],
        [47.483248, -0.592693], [47.483121, -0.592221], [47.483085, -0.591562], [47.483081, -0.591068], [47.482958, -0.590629], [47.482867, -0.589915],
        [47.4829, -0.589277], [47.482809, -0.588473], [47.482729, -0.587979], [47.4827, -0.587411], [47.482606, -0.587084], [47.482599, -0.586842],
        [47.482487, -0.586429], [47.482447, -0.586177], [47.481437, -0.585494], [47.48085, -0.585043], [47.480357, -0.58441], [47.479998, -0.583477],
        [47.479628, -0.582029], [47.479512, -0.581053], [47.479106, -0.580002], [47.478881, -0.578972], [47.478685, -0.578468], [47.478403, -0.578633],
        [47.478084, -0.57896], [47.477761, -0.579523], [47.477496, -0.580044], [47.477253, -0.580403], [47.477021, -0.58065], [47.476698, -0.580693],
        [47.47639, -0.580806], [47.476078, -0.580602], [47.475749, -0.579373], [47.47548, -0.577871], [47.475154, -0.577426], [47.474929, -0.576868],
        [47.474494, -0.576547], [47.474255, -0.576525], [47.474197, -0.576997], [47.474284, -0.577523], [47.474567, -0.577673], [47.474727, -0.577987],
        [47.474894, -0.578472], [47.475123, -0.579593], [47.475188, -0.580344], [47.475185, -0.580923], [47.475214, -0.581448], [47.475304, -0.581835],
        [47.475326, -0.582183], [47.475308, -0.582446], [47.475551, -0.582768], [47.476185, -0.582961], [47.476537, -0.582601], [47.477128, -0.582424],
        [47.477454, -0.581631], [47.477635, -0.581502], [47.477784, -0.581266], [47.477929, -0.581137], [47.478154, -0.580569], [47.478277, -0.580553],
        [47.478349, -0.580617], [47.478462, -0.580805], [47.478705, -0.582017], [47.47906, -0.582387], [47.479238, -0.583406], [47.479596, -0.583722],
        [47.479959, -0.585181], [47.480042, -0.585326], [47.480314, -0.585691], [47.480894, -0.586034], [47.481387, -0.586618], [47.481558, -0.586887],
        [47.481648, -0.587241], [47.481666, -0.587621], [47.48179, -0.587959], [47.481866, -0.588646], [47.481873, -0.588908], [47.482409, -0.590984],
        [47.482279, -0.592057], [47.482283, -0.592486], [47.48221, -0.592824], [47.482221, -0.59314], [47.482624, -0.595128], [47.482635, -0.59582],
        [47.482795, -0.596179], [47.482798, -0.59663],
      ],
      extra: [
        [47.482798, -0.59663], [47.482827, -0.596914], [47.482838, -0.5973], [47.483012, -0.598062], [47.483134, -0.600042], [47.483649, -0.601147],
        [47.484961, -0.601319], [47.485599, -0.60045], [47.485882, -0.600514], [47.486019, -0.600847], [47.486048, -0.601287], [47.486121, -0.601662],
        [47.486063, -0.602413], [47.486193, -0.602843], [47.486041, -0.603604], [47.486034, -0.604076], [47.486367, -0.605697], [47.487129, -0.607499],
        [47.487948, -0.608282], [47.488166, -0.60825], [47.488289, -0.608089], [47.48889, -0.607177], [47.489275, -0.607027], [47.489115, -0.605943],
        [47.488745, -0.606319], [47.488398, -0.606909], [47.488006, -0.606845], [47.487622, -0.606372], [47.486868, -0.604119], [47.486817, -0.601931],
        [47.486824, -0.600987], [47.486563, -0.600085], [47.48623, -0.599474], [47.486056, -0.599409], [47.485889, -0.599613], [47.485708, -0.599463],
        [47.484569, -0.59971], [47.48404, -0.599731], [47.483714, -0.599635], [47.483511, -0.599227], [47.483505, -0.598169], [47.483516, -0.597778],
        [47.483487, -0.596818],
      ],
    },
    nuit: {
      main: [
        [47.482715, -0.59648], [47.482639, -0.59618], [47.482414, -0.595719], [47.482157, -0.595628], [47.482106, -0.595397], [47.482077, -0.594448],
        [47.481954, -0.594276], [47.481914, -0.59412], [47.481841, -0.593906], [47.481838, -0.59367], [47.481954, -0.59316], [47.481852, -0.592705],
        [47.481798, -0.591611], [47.481845, -0.591476], [47.481849, -0.591321], [47.481856, -0.591187], [47.481791, -0.591058], [47.481482, -0.590227],
        [47.480924, -0.588645], [47.480554, -0.587443], [47.480279, -0.58669], [47.480036, -0.586368], [47.479644, -0.586073], [47.479459, -0.586089],
        [47.479427, -0.585532], [47.479467, -0.585124], [47.479314, -0.584802], [47.479307, -0.58454], [47.479177, -0.584229], [47.479082, -0.58374],
        [47.478912, -0.58337], [47.478691, -0.582898], [47.478455, -0.582727], [47.478325, -0.582518], [47.477872, -0.582384], [47.477631, -0.582344],
        [47.477415, -0.582625], [47.477205, -0.582893], [47.476994, -0.582979], [47.476969, -0.582888], [47.476795, -0.582888], [47.476588, -0.582765],
        [47.476523, -0.582668], [47.476193, -0.582952], [47.475479, -0.582737], [47.475291, -0.582458], [47.475331, -0.582104], [47.4753, -0.581801],
        [47.475195, -0.581337], [47.475182, -0.580927], [47.47514, -0.579994], [47.475119, -0.579554], [47.474952, -0.578763], [47.474825, -0.578194],
        [47.474689, -0.577897], [47.474515, -0.577658], [47.474372, -0.577516], [47.474279, -0.577443], [47.474241, -0.57703], [47.474254, -0.577415],
        [47.47435, -0.577552], [47.474602, -0.577756], [47.474694, -0.57793], [47.474817, -0.578236], [47.474979, -0.578799], [47.475124, -0.579579],
        [47.475187, -0.580907], [47.475204, -0.581376], [47.475291, -0.581797], [47.47532, -0.582081], [47.475305, -0.582443], [47.475448, -0.582703],
        [47.476172, -0.582971], [47.476574, -0.582566], [47.4771, -0.58236], [47.477444, -0.581676], [47.477633, -0.581534], [47.477741, -0.581306],
        [47.477899, -0.581172], [47.478162, -0.580593], [47.478249, -0.580545], [47.478336, -0.580614], [47.478477, -0.580821], [47.478704, -0.582017],
        [47.479066, -0.5824], [47.479238, -0.583379], [47.47958, -0.583718], [47.479982, -0.585223], [47.480318, -0.58569], [47.480869, -0.586028],
        [47.481559, -0.586897], [47.481643, -0.58724], [47.481666, -0.58765], [47.481779, -0.587948], [47.481855, -0.588417], [47.481876, -0.58891],
        [47.482386, -0.590966], [47.48233, -0.591715], [47.482295, -0.59199], [47.482282, -0.592411], [47.482202, -0.592752], [47.4822, -0.592939],
        [47.482635, -0.59519], [47.482642, -0.595812], [47.482795, -0.596164],
      ],
      extra: [
        [47.482795, -0.596164], [47.483156, -0.600117], [47.483692, -0.601094], [47.484975, -0.601362], [47.485468, -0.600536], [47.485675, -0.600412],
        [47.485867, -0.600472], [47.486019, -0.600831], [47.48603, -0.601298], [47.486164, -0.601673], [47.486019, -0.602285], [47.486135, -0.602939],
        [47.486019, -0.603937], [47.486179, -0.604999], [47.486701, -0.606437], [47.487317, -0.607735], [47.48826, -0.608261], [47.488601, -0.60751],
        [47.489304, -0.60707], [47.489086, -0.605997], [47.488593, -0.606566], [47.488441, -0.606866], [47.488093, -0.606909], [47.487557, -0.606179],
        [47.486882, -0.604227], [47.486766, -0.600675], [47.486469, -0.599903], [47.486063, -0.59942], [47.485947, -0.599517], [47.485853, -0.599592],
        [47.485748, -0.59949], [47.484707, -0.599667], [47.484026, -0.599785], [47.483678, -0.599613], [47.483591, -0.598208], [47.483032, -0.598229],
        [47.482715, -0.59648],
      ],
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

  // Légende directement sur la carte, comme sur le plan officiel du Défi24h.
  const Legend = L.Control.extend({
    options: { position: "bottomleft" },
    onAdd: function () {
      const div = L.DomUtil.create("div", "route-legend");
      div.style.cssText =
        "background:rgba(15,26,42,.88); color:#fff; padding:8px 12px; border-radius:8px;" +
        "font-size:.8rem; line-height:1.6; box-shadow:0 2px 8px rgba(0,0,0,.35);";
      div.innerHTML =
        '<div><span style="display:inline-block; width:22px; height:0; border-top:4px solid #3fb1ec; ' +
        'vertical-align:middle; margin-right:6px;"></span>5 km</div>' +
        '<div><span style="display:inline-block; width:22px; height:0; border-top:4px solid #3fb1ec; ' +
        'vertical-align:middle; margin-right:6px;"></span>' +
        '<span style="display:inline-block; width:22px; height:0; border-top:4px solid #ff6b6b; ' +
        'vertical-align:middle; margin-right:6px;"></span>8 km</div>';
      L.DomEvent.disableClickPropagation(div);
      return div;
    },
  });
  map.addControl(new Legend());

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
    // Parcouru dans l'animation : la grande boucle (5 km) d'abord, jusqu'au départ et retour
    // à la jonction, puis la petite boucle supplémentaire (+3 km) ensuite.
    const fullPath = route.main.concat(route.extra.slice(1));
    mainLine.setLatLngs([]);
    extraLine.setLatLngs([]);
    runner.setLatLng(fullPath[0]);
    const stepMs = ANIMATION_MS / (fullPath.length - 1);
    let i = 0;
    animId = setInterval(() => {
      i++;
      if (i < route.main.length) {
        mainLine.setLatLngs(fullPath.slice(0, i + 1));
      } else {
        mainLine.setLatLngs(route.main);
        extraLine.setLatLngs(fullPath.slice(route.main.length - 1, i + 1));
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
