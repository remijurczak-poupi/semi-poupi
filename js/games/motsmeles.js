// Mots-mêlés du jour — même grille pour tout le monde (graine = date du jour).
// Sélection en 2 clics (première lettre puis dernière lettre du mot, en ligne droite).
window.PoupiMotsMeles = (function () {
  const GAME_KEY = "motsmeles";
  const SIZE = 11;
  const WORD_POOL = [
    "POUPI", "CHIEN", "COURSE", "ANGERS", "ETANG", "RELAIS", "DEFI",
    "TELETHON", "DOSSARD", "MEDAILLE", "BICHON", "LAISSE",
  ];
  const DIRECTIONS = [
    [0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1], [-1, 1],
  ];

  let grid, placedWords, foundWords, selection, initialized, rng;
  let gridEl, wordsEl, lockEl;
  let startTime, finished;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickWords() {
    return shuffle(WORD_POOL).slice(0, 7).sort((a, b) => b.length - a.length);
  }

  function tryPlace(word) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const [dr, dc] = DIRECTIONS[Math.floor(rng() * DIRECTIONS.length)];
      const row = Math.floor(rng() * SIZE);
      const col = Math.floor(rng() * SIZE);
      const endRow = row + dr * (word.length - 1);
      const endCol = col + dc * (word.length - 1);
      if (endRow < 0 || endRow >= SIZE || endCol < 0 || endCol >= SIZE) continue;

      let ok = true;
      for (let i = 0; i < word.length; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (grid[r][c] && grid[r][c] !== word[i]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      for (let i = 0; i < word.length; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        grid[r][c] = word[i];
      }
      return { word, cells: Array.from({ length: word.length }, (_, i) => [row + dr * i, col + dc * i]) };
    }
    return null;
  }

  function buildGrid() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    const words = pickWords();
    placedWords = [];
    words.forEach((w) => {
      const placed = tryPlace(w);
      if (placed) placedWords.push(placed);
    });
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!grid[r][c]) grid[r][c] = alphabet[Math.floor(rng() * alphabet.length)];
      }
    }
  }

  function persist() {
    window.PoupiDaily.saveToday(GAME_KEY, {
      found: foundWords.map((fw) => fw.word),
    });
  }

  function lockMessage() {
    lockEl.style.display = "block";
    lockEl.textContent = "🎉 Bravo, tous les mots trouvés ! Reviens demain pour une nouvelle grille.";
  }

  function render() {
    gridEl.innerHTML = "";
    gridEl.style.setProperty("--mm-size", SIZE);
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "mm-cell";
        cell.textContent = grid[r][c];
        cell.dataset.r = r;
        cell.dataset.c = c;
        if (foundWords.some((fw) => fw.cells.some(([fr, fc]) => fr === r && fc === c))) {
          cell.classList.add("found");
        }
        cell.addEventListener("click", () => handleClick(r, c));
        gridEl.appendChild(cell);
      }
    }

    wordsEl.innerHTML = "";
    placedWords.forEach((pw) => {
      const li = document.createElement("li");
      li.textContent = pw.word;
      if (foundWords.includes(pw)) li.classList.add("found");
      wordsEl.appendChild(li);
    });

    if (foundWords.length === placedWords.length) lockMessage();
  }

  function cellsBetween(r1, c1, r2, c2) {
    const dr = Math.sign(r2 - r1);
    const dc = Math.sign(c2 - c1);
    const len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1)) + 1;
    if (r1 !== r2 && c1 !== c2 && Math.abs(r2 - r1) !== Math.abs(c2 - c1)) return null;
    const cells = [];
    for (let i = 0; i < len; i++) cells.push([r1 + dr * i, c1 + dc * i]);
    return cells;
  }

  function handleClick(r, c) {
    if (foundWords.length === placedWords.length) return;
    if (!selection) {
      selection = { r, c };
      render();
      const el = gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
      if (el) el.classList.add("selecting");
      return;
    }
    const cells = cellsBetween(selection.r, selection.c, r, c);
    selection = null;
    if (!cells) {
      render();
      return;
    }
    const word = cells.map(([cr, cc]) => grid[cr][cc]).join("");
    const reversed = word.split("").reverse().join("");
    const match = placedWords.find(
      (pw) => !foundWords.includes(pw) && (pw.word === word || pw.word === reversed)
    );
    if (match) {
      foundWords.push(match);
      persist();
    }
    render();
    if (!finished && foundWords.length === placedWords.length) {
      finished = true;
      if (window.PoupiScores) {
        const seconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        const points = Math.max(15, Math.min(100, 130 - seconds));
        const mm = Math.floor(seconds / 60);
        const ss = String(seconds % 60).padStart(2, "0");
        window.PoupiScores.submitScore(GAME_KEY, points, `${mm}:${ss}`);
      }
    }
  }

  function init() {
    gridEl = document.getElementById("motsmeles-grid");
    wordsEl = document.getElementById("motsmeles-words");
    lockEl = document.getElementById("motsmeles-reset"); // réutilisé comme bandeau de verrouillage
    if (initialized) return;
    initialized = true;
    lockEl.style.display = "none";

    rng = window.PoupiDaily.rngFor(GAME_KEY);
    buildGrid();
    selection = null;
    startTime = Date.now();

    const saved = window.PoupiDaily.loadToday(GAME_KEY);
    const foundLabels = saved ? saved.found || [] : [];
    foundWords = placedWords.filter((pw) => foundLabels.includes(pw.word));
    finished = foundWords.length === placedWords.length; // déjà résolu lors d'une session précédente
    if (!saved) persist();

    render();
  }

  return { init };
})();
