// Tir Arcade — Poupi tire des croquettes sur les têtes de Mourier qui tombent.
// Rejouable à volonté ; seul le meilleur score du jour est gardé pour le classement.
//
// Bonus (apparaissent en tombant lentement, à ramasser avec le vaisseau) :
//   🦴 os          → tir triple (3 directions) pendant 8s
//   🔫 mitraillette → tir automatique et très rapide pendant 8s
//   🍖 jambon      → vitesse de déplacement du vaisseau augmentée pendant 8s
//   ☢️ bombe        → détruit instantanément tous les Mourier à l'écran
//
// Ennemis : Mourier classique, Mourier géant (plus gros, encaisse plusieurs tirs),
// et Maman Chaaaat / Maman Chat qui passent par là — à ne surtout pas tirer !
window.PoupiTir = (function () {
  const GAME_KEY = "tir";
  const SHIP_IMG_SRC = "assets/poupi/poupi-happy.png?v=3";
  const ENEMY_IMG_SRC = "assets/poupi/mourier.png?v=1";
  const CAT_IMG_SRCS = ["assets/poupi/chat-maman-chaaaat.png?v=3", "assets/poupi/chat-maman-chat.png?v=3"];

  const W = 720, H = 480;
  const SHIP_SIZE = 56;
  const ENEMY_SIZE = 46;
  const GIANT_SIZE = 82;
  const CAT_SIZE = 44;
  const BULLET_R = 6;
  const SHIP_SPEED = 6;
  const BULLET_SPEED = 8;
  const FIRE_COOLDOWN = 260; // ms
  const RAPID_COOLDOWN = 90; // ms, pendant le bonus mitraillette
  const BUFF_DURATION = 8000; // ms (os, mitraillette, jambon)
  const POWERUP_SIZE = 34;
  const POWERUP_FALL_SPEED = 2.2;
  const POWERUP_TYPES = [
    { type: "bone", emoji: "🦴", weight: 4 },
    { type: "gun", emoji: "🔫", weight: 3 },
    { type: "ham", emoji: "🍖", weight: 3 },
    { type: "nuke", emoji: "☢️", weight: 1.4 },
  ];

  let canvas, ctx, statusEl, scoreEl, startBtn;
  let shipImg, enemyImg, catImgs;
  let running = false, initialized;
  let shipX, bullets, enemies, powerups, fx, score, kills, lives, lastFire, spawnTimer, spawnInterval;
  let tripleUntil, rapidUntil, speedUntil, lastPowerupSpawn;
  let keys = {};
  let audioCtx;

  function loadImages() {
    shipImg = new Image();
    enemyImg = new Image();
    shipImg.src = SHIP_IMG_SRC;
    enemyImg.src = ENEMY_IMG_SRC;
    catImgs = CAT_IMG_SRCS.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });
  }

  function getAudioCtx() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    return audioCtx;
  }

  // Aboiement synthétisé (pas de fichier audio nécessaire) : un petit "wouf"
  // via une rampe de fréquence descendante sur une oscillation courte.
  function playBark() {
    const ac = getAudioCtx();
    if (!ac) return;
    try {
      const now = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain).connect(ac.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {}
  }

  function playBoom() {
    const ac = getAudioCtx();
    if (!ac) return;
    try {
      const now = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain).connect(ac.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {}
  }

  function resetState() {
    shipX = W / 2;
    bullets = [];
    enemies = [];
    powerups = [];
    fx = [];
    score = 0;
    kills = 0;
    lives = 3;
    lastFire = 0;
    spawnTimer = 0;
    spawnInterval = 1100;
    tripleUntil = 0;
    rapidUntil = 0;
    speedUntil = 0;
    lastPowerupSpawn = performance.now();
  }

  function updateHud() {
    const now = performance.now();
    const buffs = [];
    if (tripleUntil > now) buffs.push("🦴 triple");
    if (rapidUntil > now) buffs.push("🔫 rapide");
    if (speedUntil > now) buffs.push("🍖 rapide");
    const buffTxt = buffs.length ? " · " + buffs.join(" ") : "";
    scoreEl.textContent = `Score : ${score} · Vies : ${"❤️".repeat(Math.max(0, lives))}${buffTxt}`;
  }

  function difficultyTier() {
    if (score >= 220) return 2;
    if (score >= 80) return 1;
    return 0;
  }

  function baseSpeed() {
    return 1.1 + Math.min(3.2, score / 180);
  }

  function currentShipSpeed() {
    return speedUntil > performance.now() ? SHIP_SPEED * 1.8 : SHIP_SPEED;
  }

  function fire() {
    const now = performance.now();
    const cooldown = rapidUntil > now ? RAPID_COOLDOWN : FIRE_COOLDOWN;
    if (now - lastFire < cooldown) return;
    lastFire = now;
    const y = H - SHIP_SIZE - 10;
    if (tripleUntil > now) {
      bullets.push({ x: shipX, y, dx: 0 });
      bullets.push({ x: shipX, y, dx: -3.2 });
      bullets.push({ x: shipX, y, dx: 3.2 });
    } else {
      bullets.push({ x: shipX, y, dx: 0 });
    }
  }

  function spawnEnemy() {
    const tier = difficultyTier();
    const roll = Math.random();

    // Une Maman Chaaaat/Chat passe par là de temps en temps — à ne pas tirer !
    if (roll < 0.16) {
      enemies.push({
        type: "cat",
        img: catImgs[Math.floor(Math.random() * catImgs.length)],
        x: 30 + Math.random() * (W - 60),
        y: -CAT_SIZE,
        speed: 1.4 + Math.random() * 0.8,
        drift: (Math.random() - 0.5) * 1.2,
        pattern: "straight",
      });
      return;
    }

    // Mourier géant occasionnel (à partir d'un peu de score), encaisse plusieurs tirs.
    if (tier >= 1 && roll < 0.16 + 0.09) {
      enemies.push({
        type: "giant",
        x: 60 + Math.random() * (W - 120),
        y: -GIANT_SIZE,
        speed: baseSpeed() * 0.55,
        drift: (Math.random() - 0.5) * 0.8,
        pattern: "straight",
        hp: 3,
        maxHp: 3,
      });
      return;
    }

    const patterns = tier === 0 ? ["straight"] : tier === 1 ? ["straight", "zigzag"] : ["straight", "zigzag", "dive"];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    enemies.push({
      type: "mourier",
      x: 30 + Math.random() * (W - 60),
      y: -ENEMY_SIZE,
      speed: baseSpeed() + Math.random() * 0.8,
      drift: (Math.random() - 0.5) * 1.5,
      pattern,
      phase: Math.random() * Math.PI * 2,
      amp: 1.4 + Math.random() * 1.4,
      hp: 1,
      maxHp: 1,
    });
  }

  function pickPowerupType() {
    const total = POWERUP_TYPES.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * total;
    for (const p of POWERUP_TYPES) {
      if (r < p.weight) return p;
      r -= p.weight;
    }
    return POWERUP_TYPES[0];
  }

  function spawnPowerup(x, y) {
    const def = pickPowerupType();
    powerups.push({ x, y, vy: POWERUP_FALL_SPEED, type: def.type, emoji: def.emoji });
    lastPowerupSpawn = performance.now();
  }

  function applyPowerup(type) {
    const now = performance.now();
    if (type === "bone") {
      tripleUntil = now + BUFF_DURATION;
    } else if (type === "gun") {
      rapidUntil = now + BUFF_DURATION;
    } else if (type === "ham") {
      speedUntil = now + BUFF_DURATION;
    } else if (type === "nuke") {
      let cleared = 0;
      for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].type !== "cat") {
          fx.push({ x: enemies[i].x, y: enemies[i].y, life: 20 });
          enemies.splice(i, 1);
          cleared++;
        }
      }
      score += cleared * 6;
      kills += cleared;
      playBoom();
    }
  }

  function dist(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  function endGame() {
    running = false;
    statusEl.textContent = `💥 Partie terminée — Score : ${score} (${kills} Mourier touchés). Relance pour améliorer ton score du jour !`;
    startBtn.textContent = "▶ Rejouer";
    startBtn.disabled = false;
    if (window.PoupiScores) {
      const points = Math.max(0, Math.min(100, Math.round(score / 8)));
      window.PoupiScores.submitBestAndShow(GAME_KEY, points, `${score} pts · ${kills} touchés`);
    }
  }

  function enemySize(e) {
    return e.type === "giant" ? GIANT_SIZE : e.type === "cat" ? CAT_SIZE : ENEMY_SIZE;
  }

  function step() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0b1626";
    ctx.fillRect(0, 0, W, H);

    const speed = currentShipSpeed();
    if (keys.left) shipX -= speed;
    if (keys.right) shipX += speed;
    shipX = Math.max(SHIP_SIZE / 2, Math.min(W - SHIP_SIZE / 2, shipX));
    if (keys.fire || rapidUntil > performance.now()) fire();

    spawnTimer += 16.6;
    if (spawnTimer > spawnInterval) {
      spawnTimer = 0;
      spawnInterval = Math.max(360, spawnInterval - 7);
      spawnEnemy();
    }

    if (performance.now() - lastPowerupSpawn > 14000) {
      spawnPowerup(40 + Math.random() * (W - 80), -POWERUP_SIZE);
    }

    bullets.forEach((b) => {
      b.y -= BULLET_SPEED;
      b.x += b.dx;
    });
    bullets = bullets.filter((b) => b.y > -10 && b.x > -10 && b.x < W + 10);

    enemies.forEach((e) => {
      e.y += e.speed;
      if (e.pattern === "zigzag") {
        e.x += Math.sin(performance.now() / 260 + e.phase) * e.amp;
      } else if (e.pattern === "dive") {
        e.y += e.speed * 0.35;
        e.x += Math.sign(shipX - e.x) * 0.6;
      } else {
        e.x += e.drift;
      }
      const half = enemySize(e) / 2;
      if (e.x < half || e.x > W - half) e.drift = (e.drift || 0) * -1;
    });

    powerups.forEach((p) => (p.y += p.vy));
    powerups = powerups.filter((p) => p.y < H + POWERUP_SIZE);

    fx.forEach((f) => f.life--);
    fx = fx.filter((f) => f.life > 0);

    // collisions balle/ennemi
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (dist(e.x, e.y, b.x, b.y) < enemySize(e) / 2) {
          bullets.splice(j, 1);
          if (e.type === "cat") {
            // On ne tue pas Maman Chaaaat/Chat ! Pénalité.
            enemies.splice(i, 1);
            lives--;
            fx.push({ x: e.x, y: e.y, life: 20, sad: true });
          } else {
            e.hp--;
            fx.push({ x: b.x, y: b.y, life: 10 });
            if (e.hp <= 0) {
              enemies.splice(i, 1);
              score += e.type === "giant" ? 40 : 10;
              kills++;
              playBark();
              if (Math.random() < (e.type === "giant" ? 0.35 : 0.15)) spawnPowerup(e.x, e.y);
            }
          }
          break;
        }
      }
    }

    // ennemis qui arrivent en bas ou touchent le vaisseau
    const shipY = H - SHIP_SIZE / 2 - 6;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const half = enemySize(e) / 2;
      if (e.y > H + half) {
        enemies.splice(i, 1);
        if (e.type !== "cat") lives--; // les chats qui passent ne pénalisent pas
      } else if (e.type !== "cat" && dist(e.x, e.y, shipX, shipY) < (enemySize(e) + SHIP_SIZE) / 2.6) {
        enemies.splice(i, 1);
        lives--;
      }
    }

    // ramassage des power-ups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      if (dist(p.x, p.y, shipX, shipY) < (POWERUP_SIZE + SHIP_SIZE) / 2.4) {
        powerups.splice(i, 1);
        applyPowerup(p.type);
      }
    }

    updateHud();

    if (lives <= 0) {
      endGame();
      return;
    }

    // dessin power-ups
    ctx.font = `${POWERUP_SIZE}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    powerups.forEach((p) => ctx.fillText(p.emoji, p.x, p.y));

    // petits effets (impact / boom / triste)
    fx.forEach((f) => {
      ctx.globalAlpha = Math.max(0, f.life / 20);
      ctx.font = f.sad ? "24px sans-serif" : "20px sans-serif";
      ctx.fillText(f.sad ? "💔" : "💥", f.x, f.y);
      ctx.globalAlpha = 1;
    });

    // dessin ennemis
    enemies.forEach((e) => {
      const size = enemySize(e);
      if (e.type === "cat") {
        if (e.img.complete && e.img.naturalWidth) {
          ctx.drawImage(e.img, e.x - size / 2, e.y - size / 2, size, size);
        }
      } else if (enemyImg.complete && enemyImg.naturalWidth) {
        ctx.drawImage(enemyImg, e.x - size / 2, e.y - size / 2, size, size);
      } else {
        ctx.fillStyle = "#e76f51";
        ctx.beginPath();
        ctx.arc(e.x, e.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      if (e.type === "giant") {
        // petite barre de vie au-dessus
        const w = size * 0.9;
        ctx.fillStyle = "rgba(255,255,255,.25)";
        ctx.fillRect(e.x - w / 2, e.y - size / 2 - 10, w, 5);
        ctx.fillStyle = "#e76f51";
        ctx.fillRect(e.x - w / 2, e.y - size / 2 - 10, (w * e.hp) / e.maxHp, 5);
      }
      if (e.pattern === "dive") {
        ctx.strokeStyle = "rgba(231,111,81,.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, size / 2 + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // dessin balles (croquettes)
    ctx.fillStyle = "#e8c07d";
    bullets.forEach((b) => {
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, BULLET_R, BULLET_R * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // dessin vaisseau
    const now = performance.now();
    if (tripleUntil > now || rapidUntil > now || speedUntil > now) {
      ctx.fillStyle = "rgba(63,177,236,.25)";
      ctx.beginPath();
      ctx.arc(shipX, H - SHIP_SIZE / 2 - 6, SHIP_SIZE * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#3fb1ec";
    ctx.beginPath();
    ctx.moveTo(shipX, H - 6);
    ctx.lineTo(shipX - SHIP_SIZE / 2, H - 6 - SHIP_SIZE * 0.6);
    ctx.lineTo(shipX + SHIP_SIZE / 2, H - 6 - SHIP_SIZE * 0.6);
    ctx.closePath();
    ctx.fill();
    if (shipImg.complete && shipImg.naturalWidth) {
      const s = SHIP_SIZE * 0.85;
      ctx.drawImage(shipImg, shipX - s / 2, H - SHIP_SIZE - 6, s, s);
    }

    requestAnimationFrame(step);
  }

  function start() {
    resetState();
    running = true;
    startBtn.textContent = "⏸ En cours…";
    startBtn.disabled = true;
    statusEl.textContent = "C'est parti ! Ne tire pas sur Maman Chaaaat 🐱";
    updateHud();
    const ac = getAudioCtx();
    if (ac && ac.state === "suspended") ac.resume();
    requestAnimationFrame(step);
  }

  function bindControls() {
    window.addEventListener("keydown", (e) => {
      if (!running) return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
      if (e.code === "Space") {
        keys.fire = true;
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
      if (e.code === "Space") keys.fire = false;
    });

    const leftBtn = document.getElementById("tir-left");
    const rightBtn = document.getElementById("tir-right");
    const fireBtn = document.getElementById("tir-fire");
    const press = (el, key) => {
      const on = (e) => {
        e.preventDefault();
        keys[key] = true;
      };
      const off = (e) => {
        e.preventDefault();
        keys[key] = false;
      };
      el.addEventListener("touchstart", on, { passive: false });
      el.addEventListener("touchend", off, { passive: false });
      el.addEventListener("mousedown", on);
      el.addEventListener("mouseup", off);
      el.addEventListener("mouseleave", off);
    };
    press(leftBtn, "left");
    press(rightBtn, "right");
    press(fireBtn, "fire");

    startBtn.addEventListener("click", start);
  }

  function init() {
    canvas = document.getElementById("tir-canvas");
    ctx = canvas.getContext("2d");
    statusEl = document.getElementById("tir-status");
    scoreEl = document.getElementById("tir-score");
    startBtn = document.getElementById("tir-start");
    if (initialized) return;
    initialized = true;
    keys = {};
    loadImages();
    bindControls();
    ctx.fillStyle = "#0b1626";
    ctx.fillRect(0, 0, W, H);
  }

  return { init };
})();
