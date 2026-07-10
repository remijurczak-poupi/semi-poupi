// Tir Arcade — Poupi tire des croquettes sur les têtes de Mourier qui tombent.
// Rejouable à volonté ; seul le meilleur score du jour est gardé pour le classement.
//
// Bonus (apparaissent en tombant lentement, à ramasser avec le vaisseau) :
//   🦴 os          → tir triple (3 directions) pendant 8s
//   🔫 mitraillette → tir automatique et très rapide pendant 8s
//   🍖 jambon      → vitesse de déplacement du vaisseau augmentée pendant 8s
//   🛡️ collier      → bouclier, Poupi devient invincible pendant 8s
//   ☢️ bombe        → détruit instantanément tous les Mourier à l'écran
//
// Pendant les bonus mitraillette et tir triple, les tirs traversent Maman
// Chaaaat / Maman Chat sans les toucher (trop dur à éviter en tir rapide) —
// en dehors de ces bonus, un tir sur une maman chat coûte toujours une vie.
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
    { type: "shield", emoji: "🛡️", weight: 2.2 },
    { type: "nuke", emoji: "☢️", weight: 1.4 },
  ];

  let canvas, ctx, statusEl, scoreEl, startBtn;
  let shipImg, enemyImg, catImgs;
  let running = false, initialized;
  let shipX, bullets, enemies, powerups, fx, score, kills, lives, lastFire, spawnTimer, spawnInterval;
  let tripleUntil, rapidUntil, speedUntil, shieldUntil, lastPowerupSpawn, gameStartTime, nukeFlash;
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

  // Aboiement synthétisé (pas de fichier audio nécessaire), v3 : conçu et vérifié
  // par analyse de spectrogramme pour reproduire la signature d'un vrai aboiement
  // (contour harmonique descendant ~600Hz→160Hz sur ~120ms + salve de bruit large
  // bande à l'attaque), plutôt qu'un simple bruit filtré ou une tonalité pure —
  // deux impulsions rapprochées pour un "wouf-wouf".
  function playBark() {
    const ac = getAudioCtx();
    if (!ac) return;
    try {
      const now = ac.currentTime;
      [0, 0.14].forEach((offset, idx) => {
        const t0 = now + offset;
        const dur = idx === 0 ? 0.16 : 0.13;

        // Corps tonal : onde carrée (riche en harmoniques) avec chute de
        // fréquence rapide 620→160Hz, filtrée par un passe-bas qui se ferme en
        // même temps (effet "gueule qui se referme") — c'est ce contour qui
        // rend le son identifiable comme un aboiement plutôt qu'un bip.
        const osc = ac.createOscillator();
        osc.type = "square";
        osc.frequency.setValueAtTime(620, t0);
        osc.frequency.exponentialRampToValueAtTime(160, t0 + dur * 0.75);

        const oscFilter = ac.createBiquadFilter();
        oscFilter.type = "lowpass";
        oscFilter.frequency.setValueAtTime(3200, t0);
        oscFilter.frequency.exponentialRampToValueAtTime(500, t0 + dur);
        oscFilter.Q.value = 2;

        const oscGain = ac.createGain();
        oscGain.gain.setValueAtTime(0.0001, t0);
        oscGain.gain.exponentialRampToValueAtTime(0.4, t0 + 0.008);
        oscGain.gain.exponentialRampToValueAtTime(0.08, t0 + dur * 0.5);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

        osc.connect(oscFilter).connect(oscGain).connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + dur);

        // Petite salve de bruit large bande à l'attaque (les 20 premières ms) :
        // le "pop" percussif du début d'un vrai aboiement.
        const popDur = 0.02;
        const bufferSize = Math.max(1, Math.floor(ac.sampleRate * popDur));
        const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.2);
        }
        const noise = ac.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = ac.createBiquadFilter();
        noiseFilter.type = "highpass";
        noiseFilter.frequency.value = 700;

        const noiseGain = ac.createGain();
        noiseGain.gain.setValueAtTime(0.28, t0);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + popDur);

        noise.connect(noiseFilter).connect(noiseGain).connect(ac.destination);
        noise.start(t0);
        noise.stop(t0 + popDur);
      });
    } catch (e) {}
  }

  // Grosse explosion pour la bombe ☢️ : crack initial + grondement grave longue
  // traîne + bruit large bande qui s'assombrit — beaucoup plus gros que l'ancien
  // "boom" (simple oscillateur), pour vraiment sonner comme une explosion.
  function playNukeBoom() {
    const ac = getAudioCtx();
    if (!ac) return;
    try {
      const now = ac.currentTime;

      // Crack initial : bruit large bande très court et fort (l'impact).
      const crackDur = 0.06;
      const crackBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * crackDur), ac.sampleRate);
      const crackData = crackBuf.getChannelData(0);
      for (let i = 0; i < crackData.length; i++) {
        crackData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crackData.length, 0.6);
      }
      const crack = ac.createBufferSource();
      crack.buffer = crackBuf;
      const crackGain = ac.createGain();
      crackGain.gain.setValueAtTime(0.8, now);
      crackGain.gain.exponentialRampToValueAtTime(0.0001, now + crackDur);
      crack.connect(crackGain).connect(ac.destination);
      crack.start(now);
      crack.stop(now + crackDur);

      // Grondement grave (le "thump" au ventre), longue traîne.
      const sub = ac.createOscillator();
      sub.type = "sine";
      sub.frequency.setValueAtTime(130, now);
      sub.frequency.exponentialRampToValueAtTime(32, now + 0.9);
      const subGain = ac.createGain();
      subGain.gain.setValueAtTime(0.0001, now);
      subGain.gain.exponentialRampToValueAtTime(0.9, now + 0.03);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
      sub.connect(subGain).connect(ac.destination);
      sub.start(now);
      sub.stop(now + 1.3);

      // Roar / souffle de l'explosion : bruit filtré passe-bas qui s'assombrit
      // progressivement sur plus d'une seconde.
      const roarDur = 1.1;
      const roarBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * roarDur), ac.sampleRate);
      const roarData = roarBuf.getChannelData(0);
      for (let i = 0; i < roarData.length; i++) {
        roarData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / roarData.length, 1.4);
      }
      const roar = ac.createBufferSource();
      roar.buffer = roarBuf;
      const roarFilter = ac.createBiquadFilter();
      roarFilter.type = "lowpass";
      roarFilter.frequency.setValueAtTime(2600, now);
      roarFilter.frequency.exponentialRampToValueAtTime(90, now + roarDur);
      const roarGain = ac.createGain();
      roarGain.gain.setValueAtTime(0.0001, now);
      roarGain.gain.exponentialRampToValueAtTime(0.6, now + 0.04);
      roarGain.gain.exponentialRampToValueAtTime(0.0001, now + roarDur);
      roar.connect(roarFilter).connect(roarGain).connect(ac.destination);
      roar.start(now);
      roar.stop(now + roarDur);
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
    spawnInterval = 1250;
    tripleUntil = 0;
    rapidUntil = 0;
    speedUntil = 0;
    shieldUntil = 0;
    lastPowerupSpawn = performance.now();
    gameStartTime = performance.now();
    nukeFlash = null;
  }

  function updateHud() {
    const now = performance.now();
    const buffs = [];
    if (tripleUntil > now) buffs.push("🦴 triple");
    if (rapidUntil > now) buffs.push("🔫 rapide");
    if (speedUntil > now) buffs.push("🍖 rapide");
    if (shieldUntil > now) buffs.push("🛡️ bouclier");
    const buffTxt = buffs.length ? " · " + buffs.join(" ") : "";
    scoreEl.textContent = `Score : ${score} · Vies : ${"❤️".repeat(Math.max(0, lives))}${buffTxt}`;
  }

  // La difficulté (vitesse et patterns des Mourier) dépend du temps écoulé
  // depuis le début de la partie, PAS du score : ainsi aucun bonus (y compris
  // 🍖 vitesse) ne peut accélérer les Mourier, même indirectement en faisant
  // grimper le score plus vite pendant le buff.
  function elapsedSec() {
    return (performance.now() - gameStartTime) / 1000;
  }

  function difficultyTier() {
    const t = elapsedSec();
    if (t >= 75) return 2;
    if (t >= 30) return 1;
    return 0;
  }

  function baseSpeed() {
    return 0.85 + Math.min(2.2, elapsedSec() / 55);
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
    // Pendant mitraillette / tir triple, impossible d'éviter les mamans chats en
    // visant : ces tirs les traversent sans les toucher (voir collisions dans step()).
    const pierce = tripleUntil > now || rapidUntil > now;
    if (tripleUntil > now) {
      bullets.push({ x: shipX, y, dx: 0, pierce });
      bullets.push({ x: shipX, y, dx: -3.2, pierce });
      bullets.push({ x: shipX, y, dx: 3.2, pierce });
    } else {
      bullets.push({ x: shipX, y, dx: 0, pierce });
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
      speed: baseSpeed() + Math.random() * 0.5,
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
    } else if (type === "shield") {
      shieldUntil = now + BUFF_DURATION;
    } else if (type === "nuke") {
      let cleared = 0;
      for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].type !== "cat") {
          fx.push({ x: enemies[i].x, y: enemies[i].y, life: 26, big: true });
          enemies.splice(i, 1);
          cleared++;
        }
      }
      score += cleared * 6;
      kills += cleared;
      // Grosse explosion plein écran (flash + onde de choc + tremblement), voir step().
      nukeFlash = { life: 36, maxLife: 36 };
      playNukeBoom();
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

    // Tremblement d'écran pendant les ~10 premières frames de l'explosion nucléaire.
    ctx.save();
    if (nukeFlash && nukeFlash.life > nukeFlash.maxLife - 10) {
      const shakeT = (nukeFlash.life - (nukeFlash.maxLife - 10)) / 10;
      const shakeMag = 9 * shakeT;
      ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);
    }

    const now = performance.now();
    const speed = currentShipSpeed();
    if (keys.left) shipX -= speed;
    if (keys.right) shipX += speed;
    shipX = Math.max(SHIP_SIZE / 2, Math.min(W - SHIP_SIZE / 2, shipX));
    if (keys.fire || rapidUntil > now) fire();

    spawnTimer += 16.6;
    if (spawnTimer > spawnInterval) {
      spawnTimer = 0;
      spawnInterval = Math.max(500, spawnInterval - 4);
      spawnEnemy();
    }

    if (now - lastPowerupSpawn > 14000) {
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
    if (nukeFlash) {
      nukeFlash.life--;
      if (nukeFlash.life <= 0) nukeFlash = null;
    }

    // collisions balle/ennemi
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (dist(e.x, e.y, b.x, b.y) < enemySize(e) / 2) {
          if (e.type === "cat" && b.pierce) {
            // Tir mitraillette/triple : traverse Maman Chaaaat/Chat sans la toucher.
            continue;
          }
          bullets.splice(j, 1);
          if (e.type === "cat") {
            // On ne tue pas Maman Chaaaat/Chat ! Pénalité (sauf bouclier actif).
            enemies.splice(i, 1);
            if (shieldUntil <= now) lives--;
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
        if (e.type !== "cat" && shieldUntil <= now) lives--; // les chats qui passent ne pénalisent pas
      } else if (e.type !== "cat" && dist(e.x, e.y, shipX, shipY) < (enemySize(e) + SHIP_SIZE) / 2.6) {
        enemies.splice(i, 1);
        if (shieldUntil <= now) {
          lives--;
        } else {
          fx.push({ x: e.x, y: e.y, life: 16, shield: true });
        }
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
      ctx.restore();
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
      ctx.globalAlpha = Math.max(0, f.life / (f.big ? 26 : 20));
      ctx.font = f.big ? "42px sans-serif" : f.sad || f.shield ? "24px sans-serif" : "20px sans-serif";
      ctx.fillText(f.sad ? "💔" : f.shield ? "🛡️" : "💥", f.x, f.y);
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
    if (tripleUntil > now || rapidUntil > now || speedUntil > now) {
      ctx.fillStyle = "rgba(63,177,236,.25)";
      ctx.beginPath();
      ctx.arc(shipX, H - SHIP_SIZE / 2 - 6, SHIP_SIZE * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
    if (shieldUntil > now) {
      // Collier-bouclier : anneau doré pulsant autour du vaisseau, invincibilité.
      const pulse = 0.85 * SHIP_SIZE + Math.sin(now / 90) * 4;
      ctx.strokeStyle = "rgba(255,209,102,.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(shipX, H - SHIP_SIZE / 2 - 6, pulse / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,209,102,.15)";
      ctx.beginPath();
      ctx.arc(shipX, H - SHIP_SIZE / 2 - 6, pulse / 2, 0, Math.PI * 2);
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

    // Grosse explosion nucléaire : flash plein écran + onde de choc qui s'étend,
    // dessinés par-dessus tout le reste pendant que nukeFlash est actif.
    if (nukeFlash) {
      const t = 1 - nukeFlash.life / nukeFlash.maxLife;
      const flashAlpha = Math.max(0, 1 - t * 2.2) * 0.9;
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255,235,190,${flashAlpha})`;
        ctx.fillRect(0, 0, W, H);
      }
      const ringR = t * Math.hypot(W, H) * 0.75;
      ctx.strokeStyle = `rgba(255,130,50,${Math.max(0, 1 - t) * 0.9})`;
      ctx.lineWidth = 14 * (1 - t) + 2;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, ringR, 0, Math.PI * 2);
      ctx.stroke();
      const ringR2 = Math.max(0, t - 0.15) * Math.hypot(W, H) * 0.75;
      if (ringR2 > 0) {
        ctx.strokeStyle = `rgba(255,235,190,${Math.max(0, 1 - t) * 0.6})`;
        ctx.lineWidth = 8 * (1 - t) + 1;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, ringR2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
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
