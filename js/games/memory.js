// Memory Poupi du jour — jeu de paires avec les photos détourées de Poupi et
// ses copains chats. Grille identique pour tout le monde (graine = date du jour).
window.PoupiMemory = (function () {
  const GAME_KEY = "memory";
  const IMAGES = [
    "poupi-baby.png", "poupi-crado.png", "poupi-deg.png", "poupi-docteur.png",
    "poupi-duveteux.png", "poupi-empereur.png", "poupi-flemmasse.png", "poupi-gangsta.png",
    "poupi-happy.png", "poupi-livraison.png", "poupi-lunettes-vitesse.png", "poupi-malicieux.png",
    "poupi-melomane.png", "poupi-noel.png", "poupi-oreilles-vent.png", "poupi-secretaire.png",
    "chat-gros-couic.png", "chat-maman-chaaaat.png", "chat-maman-chat.png",
  ];
  const PAIRS = 8;

  let cards, flipped, matched, moves, lock, initialized, rng, finished;
  let gridEl, scoreEl, lockEl;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildDeck() {
    const chosen = shuffle(IMAGES).slice(0, PAIRS);
    return shuffle(chosen.concat(chosen)).map((img, i) => ({
      id: i,
      img,
      isOpen: false,
      isMatched: false,
    }));
  }

  function updateScore() {
    scoreEl.textContent = `Coups : ${moves} · Paires trouvées : ${matched.length} / ${PAIRS}`;
  }

  function persist() {
    window.PoupiDaily.saveToday(GAME_KEY, { matched, moves });
  }

  function lockMessage() {
    lockEl.style.display = "block";
    lockEl.textContent = `🎉 Bravo, toutes les paires trouvées en ${moves} coups ! Reviens demain pour une nouvelle grille.`;
  }

  function render() {
    gridEl.innerHTML = "";
    cards.forEach((card) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "memory-card" + (card.isOpen || card.isMatched ? " flipped" : "");
      btn.disabled = card.isMatched;
      btn.innerHTML = `
        <span class="memory-card-inner">
          <span class="memory-card-back">🐾</span>
          <span class="memory-card-front"><img src="assets/poupi/${card.img}" alt=""></span>
        </span>`;
      btn.addEventListener("click", () => handleClick(card));
      gridEl.appendChild(btn);
    });
  }

  function handleClick(card) {
    if (lock || card.isOpen || card.isMatched) return;
    card.isOpen = true;
    flipped.push(card);
    render();

    if (flipped.length === 2) {
      moves++;
      updateScore();
      lock = true;
      const [a, b] = flipped;
      if (a.img === b.img) {
        a.isMatched = true;
        b.isMatched = true;
        matched.push(a.img);
        flipped = [];
        lock = false;
        persist();
        updateScore();
        render();
        if (matched.length === PAIRS) {
          persist();
          lockMessage();
          if (!finished) {
            finished = true;
            if (window.PoupiScores) {
              const points = Math.max(10, Math.min(100, 150 - moves * 6));
              window.PoupiScores.submitScore(GAME_KEY, points, `${moves} coups`);
            }
          }
        }
      } else {
        persist();
        setTimeout(() => {
          a.isOpen = false;
          b.isOpen = false;
          flipped = [];
          lock = false;
          render();
        }, 800);
      }
    }
  }

  function init() {
    gridEl = document.getElementById("memory-grid");
    scoreEl = document.getElementById("memory-score");
    lockEl = document.getElementById("memory-reset"); // réutilisé comme bandeau de verrouillage
    if (initialized) return;
    initialized = true;
    lockEl.style.display = "none";

    rng = window.PoupiDaily.rngFor(GAME_KEY);
    cards = buildDeck();
    flipped = [];
    lock = false;

    const saved = window.PoupiDaily.loadToday(GAME_KEY);
    if (saved) {
      matched = saved.matched || [];
      moves = saved.moves || 0;
      // Ré-applique les paires déjà trouvées sur le deck reconstruit (même graine).
      matched.forEach((img) => {
        let count = 0;
        cards.forEach((c) => {
          if (c.img === img && count < 2) {
            c.isMatched = true;
            count++;
          }
        });
      });
    } else {
      matched = [];
      moves = 0;
      persist();
    }
    finished = matched.length === PAIRS; // déjà résolu lors d'une session précédente

    updateScore();
    render();
    if (matched.length === PAIRS) lockMessage();
  }

  return { init };
})();
