// Morpion — le joueur incarne Poupi 🐶, l'ordinateur joue Maman Chaaaat 🐱, avec
// leurs vraies têtes détourées comme pions. IA "meilleure mais battable" : elle ne
// rate jamais un coup tactique forcé (prendre une victoire à portée de main, bloquer
// une victoire du joueur), mais joue volontairement un coup stratégique sous-optimal
// de temps en temps en dehors de ces cas-là, pour rester battable sans jamais donner
// la victoire gratuitement (un minimax parfait à 100% ne perd jamais).
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

  // Un coup qui ferait gagner `player` immédiatement s'il le jouait là, ou null s'il
  // n'y en a pas. Sert à ce que Maman Chaaaat ne rate jamais une victoire à portée de
  // main ni un blocage évident — c'est ce qui la rend "meilleure".
  function findImmediateWin(b, player) {
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = player;
      const w = winner(b);
      b[i] = null;
      if (w === player) return i;
    }
    return null;
  }

  // En dehors des coups tactiques forcés (voir aiMove), Maman Chaaaat joue un coup
  // stratégique volontairement sous-optimal environ 1 fois sur 3 au lieu du meilleur
  // coup minimax — assez pour laisser passer des fourchettes non anticipées et rester
  // battable, sans jamais donner une victoire gratuite.
  const AI_MISTAKE_CHANCE = 0.35;

  function aiMove() {
    // 1. Ne jamais rater une victoire immédiate.
    let idx = findImmediateWin(board, AI);
    // 2. Sinon, ne jamais rater le blocage d'une victoire immédiate du joueur.
    if (idx === null) idx = findImmediateWin(board, PLAYER);
    if (idx !== null) {
      board[idx] = AI;
      return;
    }

    // 3. Aucune urgence tactique : coup stratégique, parfois volontairement imparfait.
    const legalMoves = [];
    for (let i = 0; i < 9; i++) {
      if (!board[i]) legalMoves.push(i);
    }
    if (!legalMoves.length) return;
    if (Math.random() < AI_MISTAKE_CHANCE) {
      const i = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      board[i] = AI;
      return;
    }
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
