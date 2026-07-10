// Morpion quotidien — le joueur incarne Poupi 🐶, l'ordinateur joue le chat 🐱.
// IA imbattable par minimax. Une seule partie autorisée par jour.
window.PoupiMorpion = (function () {
  const GAME_KEY = "morpion";
  const PLAYER = "P";
  const AI = "C";
  const ICONS = { P: "🐶", C: "🐱" };
  const WINS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  let board, gameOver, initialized;
  let boardEl, statusEl, scoreEl, lockEl;

  function loadScore() {
    try {
      return JSON.parse(localStorage.getItem("poupi_morpion_score")) || { p: 0, c: 0, n: 0 };
    } catch (e) {
      return { p: 0, c: 0, n: 0 };
    }
  }
  function saveScore(s) {
    try {
      localStorage.setItem("poupi_morpion_score", JSON.stringify(s));
    } catch (e) {}
  }
  let score = loadScore();

  function renderScore() {
    scoreEl.textContent = `Poupi : ${score.p} · Chat : ${score.c} · Nul : ${score.n}`;
  }

  function winner(b) {
    for (const [a, c, d] of WINS) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    }
    if (b.every((c) => c)) return "draw";
    return null;
  }

  function minimax(b, turn) {
    const w = winner(b);
    if (w === AI) return { score: 1 };
    if (w === PLAYER) return { score: -1 };
    if (w === "draw") return { score: 0 };

    const moves = [];
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = turn;
      const result = minimax(b, turn === AI ? PLAYER : AI);
      moves.push({ index: i, score: result.score });
      b[i] = null;
    }
    if (turn === AI) return moves.reduce((best, m) => (m.score > best.score ? m : best));
    return moves.reduce((best, m) => (m.score < best.score ? m : best));
  }

  function aiMove() {
    const best = minimax(board.slice(), AI);
    if (best.index !== undefined) board[best.index] = AI;
  }

  function render() {
    boardEl.innerHTML = "";
    board.forEach((cell, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "morpion-cell";
      btn.textContent = cell ? ICONS[cell] : "";
      btn.disabled = !!cell || gameOver;
      btn.addEventListener("click", () => playerMove(i));
      boardEl.appendChild(btn);
    });
  }

  function persist(done) {
    window.PoupiDaily.saveToday(GAME_KEY, { board, done });
  }

  function lockUI(message) {
    gameOver = true;
    statusEl.textContent = message;
    lockEl.style.display = "block";
    lockEl.textContent = "🔒 Reviens demain pour une nouvelle partie !";
    render();
  }

  function endGame(w) {
    gameOver = true;
    let message;
    if (w === PLAYER) {
      message = "🎉 Poupi gagne !";
      score.p++;
    } else if (w === AI) {
      message = "😼 Le chat gagne cette fois...";
      score.c++;
    } else {
      message = "🤝 Match nul !";
      score.n++;
    }
    saveScore(score);
    renderScore();
    persist(true);
    lockUI(message);
  }

  function playerMove(i) {
    if (gameOver || board[i]) return;
    board[i] = PLAYER;
    let w = winner(board);
    if (w) {
      render();
      endGame(w);
      return;
    }
    aiMove();
    w = winner(board);
    persist(false);
    render();
    if (w) endGame(w);
    else statusEl.textContent = "À toi de jouer";
  }

  function init() {
    boardEl = document.getElementById("morpion-board");
    statusEl = document.getElementById("morpion-status");
    scoreEl = document.getElementById("morpion-score");
    lockEl = document.getElementById("morpion-reset"); // réutilisé comme bandeau de verrouillage
    if (initialized) return;
    initialized = true;
    lockEl.style.display = "none";
    renderScore();

    const saved = window.PoupiDaily.loadToday(GAME_KEY);
    if (saved) {
      board = saved.board;
      if (saved.done) {
        const w = winner(board);
        const msg =
          w === PLAYER ? "🎉 Poupi gagne !" : w === AI ? "😼 Le chat gagne cette fois..." : "🤝 Match nul !";
        lockUI(msg);
        return;
      }
      gameOver = false;
      statusEl.textContent = "À toi de jouer";
      render();
      return;
    }

    board = Array(9).fill(null);
    gameOver = false;
    statusEl.textContent = "À toi de jouer — un seul match par jour !";
    persist(false);
    render();
  }

  return { init };
})();
