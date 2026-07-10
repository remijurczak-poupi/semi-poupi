// Tir Arcade — Poupi tire des croquettes sur les têtes de Mourier qui tombent.
// Rejouable à volonté ; seul le meilleur score du jour est gardé pour le classement.
window.PoupiTir = (function () {
  const GAME_KEY = "tir";
  const SHIP_IMG_SRC = "assets/poupi/poupi-happy.png?v=3";
  const ENEMY_IMG_SRC = "assets/poupi/mourier.png?v=1";

  const W = 720, H = 480;
  const SHIP_SIZE = 56;
  const ENEMY_SIZE = 46;
  const BULLET_R = 6;
  const SHIP_SPEED = 6;
  const BULLET_SPEED = 8;
  const FIRE_COOLDOWN = 260; // ms

  let canvas, ctx, statusEl, scoreEl, startBtn;
  let shipImg, enemyImg, imagesReady = 0;
  let running = false, initialized;
  let shipX, bullets, enemies, score, kills, lives, lastFire, spawnTimer, spawnInterval, rafId;
  let keys = {};

  function loadImages() {
    shipImg = new Image();
    enemyImg = new Image();
    shipImg.onload = () => imagesReady++;
    enemyImg.onload = () => imagesReady++;
    shipImg.src = SHIP_IMG_SRC;
    enemyImg.src = ENEMY_IMG_SRC;
  }

  function resetState() {
    shipX = W / 2;
    bullets = [];
    enemies = [];
    score = 0;
    kills = 0;
    lives = 3;
    lastFire = 0;
    spawnTimer = 0;
    spawnInterval = 1100;
  }

  function updateHud() {
    scoreEl.textContent = `Score : ${score} · Vies : ${"❤️".repeat(Math.max(0, lives))}`;
  }

  function fire() {
    const now = performance.now();
    if (now - lastFire < FIRE_COOLDOWN) return;
    lastFire = now;
    bullets.push({ x: shipX, y: H - SHIP_SIZE - 10 });
  }

  function spawnEnemy() {
    enemies.push({
      x: 30 + Math.random() * (W - 60),
      y: -ENEMY_SIZE,
      speed: 1 + Math.random() * 1.2 + Math.min(2, score / 300),
      drift: (Math.random() - 0.5) * 1.5,
    });
  }

  function dist(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  function endGame() {
    running = false;
    cancelAnimationFrame(rafId);
    statusEl.textContent = `💥 Partie terminée — Score : ${score} (${kills} Mourier touchés). Relance pour améliorer ton score du jour !`;
    startBtn.textContent = "▶ Rejouer";
    startBtn.disabled = false;
    if (window.PoupiScores) {
      const points = Math.max(0, Math.min(100, Math.round(score / 8)));
      window.PoupiScores.submitBestScore(GAME_KEY, points, `${score} pts · ${kills} touchés`);
    }
  }

  function step(ts) {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);

    // fond étoilé simple
    ctx.fillStyle = "#0b1626";
    ctx.fillRect(0, 0, W, H);

    // déplacement vaisseau
    if (keys.left) shipX -= SHIP_SPEED;
    if (keys.right) shipX += SHIP_SPEED;
    shipX = Math.max(SHIP_SIZE / 2, Math.min(W - SHIP_SIZE / 2, shipX));
    if (keys.fire) fire();

    // spawn ennemis
    spawnTimer += 16.6;
    if (spawnTimer > spawnInterval) {
      spawnTimer = 0;
      spawnInterval = Math.max(420, spawnInterval - 8);
      spawnEnemy();
    }

    // maj balles
    bullets.forEach((b) => (b.y -= BULLET_SPEED));
    bullets = bullets.filter((b) => b.y > -10);

    // maj ennemis
    enemies.forEach((e) => {
      e.y += e.speed;
      e.x += e.drift;
      if (e.x < ENEMY_SIZE / 2 || e.x > W - ENEMY_SIZE / 2) e.drift *= -1;
    });

    // collisions balle/ennemi
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (dist(e.x, e.y, b.x, b.y) < ENEMY_SIZE / 2) {
          enemies.splice(i, 1);
          bullets.splice(j, 1);
          score += 10;
          kills++;
          break;
        }
      }
    }

    // ennemis qui arrivent en bas ou touchent le vaisseau
    const shipY = H - SHIP_SIZE / 2 - 6;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.y > H + ENEMY_SIZE) {
        enemies.splice(i, 1);
        lives--;
      } else if (dist(e.x, e.y, shipX, shipY) < (ENEMY_SIZE + SHIP_SIZE) / 2.6) {
        enemies.splice(i, 1);
        lives--;
      }
    }

    updateHud();

    if (lives <= 0) {
      endGame();
      return;
    }

    // dessin ennemis
    enemies.forEach((e) => {
      if (enemyImg.complete && enemyImg.naturalWidth) {
        ctx.drawImage(enemyImg, e.x - ENEMY_SIZE / 2, e.y - ENEMY_SIZE / 2, ENEMY_SIZE, ENEMY_SIZE);
      } else {
        ctx.fillStyle = "#e76f51";
        ctx.beginPath();
        ctx.arc(e.x, e.y, ENEMY_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // dessin balles (croquettes)
    ctx.fillStyle = "#e8c07d";
    bullets.forEach((b) => {
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, BULLET_R, BULLET_R * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // dessin vaisseau (triangle + tête de Poupi)
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

    rafId = requestAnimationFrame(step);
  }

  function start() {
    resetState();
    running = true;
    startBtn.textContent = "⏸ En cours…";
    startBtn.disabled = true;
    statusEl.textContent = "C'est parti !";
    updateHud();
    rafId = requestAnimationFrame(step);
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
