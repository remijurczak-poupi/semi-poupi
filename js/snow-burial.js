// Neige qui ensevelit l'écran après un moment d'inactivité — vraie neige "physique" dessinée
// en <canvas>, pas une simple image ou un halo CSS. Après ~25s sans bouger, des flocons
// commencent à tomber puis un vrai banc de neige s'accumule en partant du bas de l'écran (et
// un peu des côtés), avec un contour irrégulier comme un vrai tas de neige, jusqu'à recouvrir
// l'écran en entier si on reste inactif assez longtemps. Dès qu'on rebouge (souris, clavier,
// scroll, tap, clic), tout fond très vite. Désactivé si la personne a activé "réduire les
// animations" dans son navigateur.
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const IDLE_MS = 25000; // délai d'inactivité avant que ça commence à s'accumuler
  const SNOW_START_MS = IDLE_MS - 4000; // les flocons commencent à tomber un peu avant, pour prévenir
  const BURY_MS = 16000; // durée pour passer d'un écran dégagé à un écran totalement enseveli
  const MELT_MS = 1300; // durée pour fondre entièrement dès qu'on rebouge

  const canvas = document.createElement("canvas");
  canvas.className = "snow-burial-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  let W = 0,
    H = 0;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  let bottomProfile = [],
    leftProfile = [],
    rightProfile = [];
  let sparkles = [];
  let flakes = [];

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  // Petite silhouette "organique" (somme de quelques sinusoïdes à phase/fréquence
  // aléatoires) pour donner un contour de neige irrégulier plutôt qu'une ligne parfaitement
  // droite ou un cercle parfait.
  function buildProfile(n) {
    const waves = [
      { amp: rand(0.5, 1), freq: rand(1, 2.2), phase: rand(0, Math.PI * 2) },
      { amp: rand(0.25, 0.5), freq: rand(3, 5), phase: rand(0, Math.PI * 2) },
      { amp: rand(0.12, 0.28), freq: rand(6, 10), phase: rand(0, Math.PI * 2) },
    ];
    const totalAmp = waves.reduce((s, w) => s + w.amp, 0);
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(1, n - 1);
      let v = 0;
      waves.forEach((w) => {
        v += Math.sin(t * Math.PI * 2 * w.freq + w.phase) * w.amp;
      });
      out[i] = v / totalAmp; // -1..1
    }
    return out;
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bottomProfile = buildProfile(Math.max(24, Math.round(W / 14)));
    leftProfile = buildProfile(Math.max(16, Math.round(H / 14)));
    rightProfile = buildProfile(Math.max(16, Math.round(H / 14)));
    sparkles = Array.from({ length: 44 }, () => ({
      x: rand(0, W),
      thresh: rand(0.12, 0.85),
      r: rand(1.1, 2.4),
      tw: rand(0, Math.PI * 2),
    }));
  }
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
  resize();

  // ---- inactivité ----
  let lastActivity = performance.now();
  ["mousemove", "keydown", "touchstart", "scroll", "click"].forEach((evt) =>
    window.addEventListener(
      evt,
      () => {
        lastActivity = performance.now();
      },
      { passive: true }
    )
  );

  let coverage = 0; // 0 = écran dégagé, 1 = totalement enseveli

  function bottomDepthAt(x) {
    const n = bottomProfile.length;
    const idx = Math.min(n - 1, Math.max(0, Math.round((x / W) * (n - 1))));
    const amp = Math.min(70, H * 0.12) * 4 * coverage * (1 - coverage);
    const base = coverage * H;
    return Math.min(H, Math.max(0, base + bottomProfile[idx] * amp));
  }

  function drawBottomPile() {
    const n = bottomProfile.length;
    const amp = Math.min(70, H * 0.12) * 4 * coverage * (1 - coverage);
    const base = coverage * H;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * W;
      const depth = Math.min(H, Math.max(0, base + bottomProfile[i] * amp));
      pts.push([x, H - depth]);
    }
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.lineTo(W, H);
    ctx.closePath();
    // Le dégradé ne doit couvrir qu'une bande fixe juste sous la ligne de crête (l'ombre du
    // rebord de neige) — au-delà, le tas doit rester bien opaque jusqu'en bas, même quand la
    // couverture est presque totale (sinon tout l'écran reste translucide au lieu de
    // disparaître vraiment sous la neige).
    const topY = H - base - amp;
    const grad = ctx.createLinearGradient(0, topY - 6, 0, topY + 70);
    grad.addColorStop(0, "rgba(210,230,250,.85)");
    grad.addColorStop(0.3, "rgba(255,255,255,.98)");
    grad.addColorStop(1, "#fcfeff");
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    }
    ctx.strokeStyle = "rgba(255,255,255,.85)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawSidePile(side) {
    const profile = side === "left" ? leftProfile : rightProfile;
    const n = profile.length;
    const amp = Math.min(70, W * 0.1) * 4 * coverage * (1 - coverage);
    const base = coverage * W * 0.55;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const y = (i / (n - 1)) * H;
      const depth = Math.min(W, Math.max(0, base + profile[i] * amp));
      const x = side === "left" ? depth : W - depth;
      pts.push([x, y]);
    }
    ctx.beginPath();
    ctx.moveTo(side === "left" ? 0 : W, 0);
    ctx.lineTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.lineTo(side === "left" ? 0 : W, H);
    ctx.closePath();
    const grad =
      side === "left"
        ? ctx.createLinearGradient(0, 0, base + amp + 10, 0)
        : ctx.createLinearGradient(W, 0, W - base - amp - 10, 0);
    grad.addColorStop(0, "rgba(255,255,255,.96)");
    grad.addColorStop(1, "rgba(214,232,250,0)");
    ctx.fillStyle = grad;
    ctx.fill();
  }

  function drawSparkles() {
    sparkles.forEach((s) => {
      if (coverage < s.thresh) return;
      const depth = bottomDepthAt(s.x);
      if (depth < 10) return;
      const y = H - rand(6, Math.min(depth - 4, 46));
      const twinkle = 0.5 + 0.5 * Math.sin(performance.now() / 400 + s.tw);
      ctx.beginPath();
      ctx.globalAlpha = 0.35 + twinkle * 0.5;
      ctx.fillStyle = "#ffffff";
      ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function spawnFlake() {
    return {
      x: rand(0, W),
      y: rand(-40, -4),
      r: rand(1.4, 3.2),
      vy: rand(28, 55),
      drift: rand(-10, 10),
      phase: rand(0, Math.PI * 2),
    };
  }
  for (let i = 0; i < 34; i++) flakes.push(spawnFlake());

  function drawFlakes(dt) {
    flakes.forEach((f) => {
      f.y += f.vy * dt;
      f.x += Math.sin(performance.now() / 900 + f.phase) * f.drift * dt;
      const landing = H - bottomDepthAt(f.x);
      if (f.y > landing || f.x < -20 || f.x > W + 20) {
        Object.assign(f, spawnFlake());
        f.y = rand(-40, -4);
      }
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,.95)";
      ctx.shadowColor = "rgba(180,215,255,.5)";
      ctx.shadowBlur = 3;
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  let lastFrame = performance.now();
  function frame(t) {
    const dt = Math.min(0.05, (t - lastFrame) / 1000);
    lastFrame = t;
    const idleFor = t - lastActivity;

    if (idleFor > IDLE_MS) {
      coverage = Math.min(1, coverage + dt / (BURY_MS / 1000));
    } else {
      coverage = Math.max(0, coverage - dt / (MELT_MS / 1000));
    }

    ctx.clearRect(0, 0, W, H);

    const flakesActive = idleFor > SNOW_START_MS;
    if (flakesActive) drawFlakes(dt);
    if (coverage > 0.001) {
      drawSidePile("left");
      drawSidePile("right");
      drawBottomPile();
      drawSparkles();
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
