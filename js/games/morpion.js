// Morpion — le joueur incarne Poupi 🐶, l'ordinateur joue Maman Chaaaat 🐱, avec
// leurs vraies têtes détourées comme pions. IA imbattable par minimax.
// Parties illimitées (pas de limite quotidienne pour ce jeu-là).
window.PoupiMorpion = (function () {
  const PLAYER = "P";
  const AI = "C";
  const PLAYER_IMG = "assets/poupi/poupi-deg.png?v=3";
  const AI_IMG = "assets/poupi/chat-maman-chaaaat.png?v=3";
  const WINS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  let board, gameOver, initialized;
  let boardEl, statusEl, scoreEl, resetBtn;

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
    scoreEl.textContent = `Poupi : ${score.p} · Maman Chaaaat : ${score.c} · Nul : ${score.n}`;
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

  function pieceHtml(cell) {
    if (cell === PLAYER) return `<img src="${PLAYER_IMG}" alt="Poupi" class="morpion-piece">`;
    if (cell === AI) return `<img src="${AI_IMG}" alt="Maman Chaaaat" class="morpion-piece">`;
    return "";
  }

  function render() {
    boardEl.innerHTML = "";
    board.forEach((cell, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "morpion-cell";
      btn.innerHTML = pieceHtml(cell);
      btn.disabled = !!cell || gameOver;
      btn.addEventListener("click", () => playerMove(i));
      boardEl.appendChild(btn);
    });
  }

  function endGame(w) {
    gameOver = true;
    if (w === PLAYER) {
      statusEl.textContent = "🎉 Poupi gagne !";
      score.p++;
    } else if (w === AI) {
      statusEl.textContent = "😼 Maman Chaaaat gagne cette fois...";
      score.c++;
    } else {
      statusEl.textContent = "🤝 Match nul !";
      score.n++;
    }
    saveScore(score);
    renderScore();
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
    render();
    if (w) endGame(w);
    else statusEl.textContent = "À toi de jouer";
  }

  function reset() {
    board = Array(9).fill(null);
    gameOver = false;
    statusEl.textContent = "À toi de jouer";
    render();
  }

  function init() {
    boardEl = document.getElementById("morpion-board");
    statusEl = document.getElementById("morpion-status");
    scoreEl = document.getElementById("morpion-score");
    resetBtn = document.getElementById("morpion-reset");
    if (initialized) return;
    initialized = true;
    resetBtn.addEventListener("click", reset);
    renderScore();
    reset();
  }

  return { init };
})();
