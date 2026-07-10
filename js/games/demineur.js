// Démineur Poupi du jour — grille identique pour tout le monde (graine = date),
// la tête de Poupi sert de mine. Une seule grille par jour. Clic = révéler (pas de
// mode drapeau, on va droit au but).
window.PoupiDemineur = (function () {
  const GAME_KEY = "demineur";
  const COLS = 8;
  const ROWS = 8;
  const MINES = 10;
  const MINE_IMG = "assets/poupi/poupi-malicieux.png?v=3";
  const NUM_COLORS = ["", "#3fb1ec", "#7ee08c", "#f4d35e", "#f4a261", "#e76f51", "#c084fc", "#f472b6", "#94a3b8"];

  let cells; // {mine, revealed, adjacent}
  let over, won, startTime, finished, timerId, lastElapsed;
  let gridEl, statusEl, lockEl, initialized;

  function idx(r, c) {
    return r * COLS + c;
  }

  function neighbors(r, c) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push([nr, nc]);
      }
    }
    return out;
  }

  function buildBoard() {
    const rng = window.PoupiDaily.rngFor(GAME_KEY);
    cells = Array.from({ length: ROWS * COLS }, () => ({
      mine: false,
      revealed: false,
      adjacent: 0,
    }));
    let placed = 0;
    while (placed < MINES) {
      const r = Math.floor(rng() * ROWS);
      const c = Math.floor(rng() * COLS);
      const cell = cells[idx(r, c)];
      if (!cell.mine) {
        cell.mine = true;
        placed++;
      }
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (cells[idx(r, c)].mine) continue;
        cells[idx(r, c)].adjacent = neighbors(r, c).filter(([nr, nc]) => cells[idx(nr, nc)].mine).length;
      }
    }
  }

  function updateStatus() {
    const elapsed = startTime && !over ? Math.floor((Date.now() - startTime) / 1000) : lastElapsed || 0;
    statusEl.textContent = `💣 ${MINES} mines · ⏱ ${elapsed}s`;
  }

  function revealCell(r, c) {
    const cell = cells[idx(r, c)];
    if (cell.revealed) return;
    cell.revealed = true;
    if (cell.mine) {
      endGame(false);
      return;
    }
    if (cell.adjacent === 0) {
      neighbors(r, c).forEach(([nr, nc]) => revealCell(nr, nc));
    }
  }

  function checkWin() {
    return cells.every((c) => c.revealed || c.mine);
  }

  function endGame(win) {
    over = true;
    won = win;
    lastElapsed = Math.floor((Date.now() - startTime) / 1000);
    if (timerId) clearInterval(timerId);
    // Compté avant de forcer l'affichage des mines : le nombre de cases sûres
    // déjà révélées sert de base au score, même en cas d'explosion (voir plus bas).
    const totalSafe = cells.length - MINES;
    const safeRevealed = cells.filter((c) => c.revealed && !c.mine).length;
    cells.forEach((c) => {
      if (c.mine) c.revealed = true;
    });
    persist();
    render();
    lockMessage();
    if (!finished) {
      finished = true;
      if (window.PoupiScores) {
        let points, detail;
        if (win) {
          points = Math.max(10, Math.min(100, 150 - lastElapsed * 2));
          detail = `${lastElapsed}s`;
        } else {
          // Points partiels selon la progression avant l'explosion, plutôt que 0
          // systématique — trouver quelques cases sûres avant de tomber sur une
          // mine, ça doit compter.
          points = Math.max(0, Math.round((safeRevealed / totalSafe) * 70));
          detail = `💥 explosé après ${safeRevealed}/${totalSafe} cases sûres`;
        }
        window.PoupiScores.submitAndShow(GAME_KEY, points, detail);
      }
    }
  }

  function lockMessage() {
    lockEl.style.display = "block";
    lockEl.textContent = won
      ? `🎉 Grille déminée en ${lastElapsed}s ! Reviens demain pour une nouvelle grille.`
      : `💥 Boom ! Reviens demain pour une nouvelle grille.`;
  }

  function persist() {
    window.PoupiDaily.saveToday(GAME_KEY, {
      state: cells.map((c) => ({ r: c.revealed })),
      over,
      won,
      lastElapsed,
    });
  }

  function handleClick(r, c) {
    if (over) return;
    revealCell(r, c);
    if (!over && checkWin()) {
      endGame(true);
      return;
    }
    persist();
    render();
  }

  function render() {
    gridEl.innerHTML = "";
    gridEl.style.setProperty("--dem-cols", COLS);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = cells[idx(r, c)];
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "demineur-cell";
        if (cell.revealed) {
          btn.classList.add("revealed");
          if (cell.mine) {
            btn.classList.add("mine");
            btn.innerHTML = `<img src="${MINE_IMG}" alt="Mine Poupi" class="demineur-mine-img">`;
          } else if (cell.adjacent > 0) {
            btn.textContent = cell.adjacent;
            btn.style.color = NUM_COLORS[cell.adjacent];
          }
        }
        btn.disabled = over || cell.revealed;
        btn.addEventListener("click", () => handleClick(r, c));
        gridEl.appendChild(btn);
      }
    }
    updateStatus();
  }

  function init() {
    gridEl = document.getElementById("demineur-grid");
    statusEl = document.getElementById("demineur-status");
    lockEl = document.getElementById("demineur-reset");
    if (initialized) return;
    initialized = true;
    lockEl.style.display = "none";

    buildBoard();
    startTime = Date.now();

    const saved = window.PoupiDaily.loadToday(GAME_KEY);
    if (saved && saved.state) {
      saved.state.forEach((s, i) => {
        cells[i].revealed = !!s.r;
      });
      over = !!saved.over;
      won = !!saved.won;
      lastElapsed = saved.lastElapsed || 0;
      finished = over;
    } else {
      over = false;
      won = false;
      finished = false;
      lastElapsed = 0;
      persist();
    }

    if (!over) {
      timerId = setInterval(updateStatus, 1000);
    }

    render();
    if (over) lockMessage();
  }

  return { init };
})();
