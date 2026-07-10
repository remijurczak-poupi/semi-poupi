// Memory Poupi — jeu de paires avec les photos (détourées) de Poupi et ses copains chats.
window.PoupiMemory = (function () {
  const IMAGES = [
    "poupi-flowers.png", "poupi-santa.png", "poupi-tongue.png", "poupi-cone.png",
    "poupi-backpack.png", "poupi-closeup-blur.png", "poupi-rocks.png", "poupi-glasses.png",
    "chat-bengal-towels.png", "chat-bengal-closeup.png",
  ];
  const PAIRS = 8;

  let cards, flipped, matched, moves, lock, initialized;
  let gridEl, scoreEl, resetBtn;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildDeck() {
    const chosen = shuffle(IMAGES).slice(0, PAIRS);
    const deck = shuffle(chosen.concat(chosen)).map((img, i) => ({
      id: i,
      img,
      isOpen: false,
      isMatched: false,
    }));
    return deck;
  }

  function updateScore() {
    scoreEl.textContent = `Coups : ${moves} · Paires trouvées : ${matched.length} / ${PAIRS}`;
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
        updateScore();
        render();
        if (matched.length === PAIRS) {
          setTimeout(() => alert("🎉 Bravo, toutes les paires trouvées en " + moves + " coups !"), 200);
        }
      } else {
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

  function reset() {
    cards = buildDeck();
    flipped = [];
    matched = [];
    moves = 0;
    lock = false;
    updateScore();
    render();
  }

  function init() {
    gridEl = document.getElementById("memory-grid");
    scoreEl = document.getElementById("memory-score");
    resetBtn = document.getElementById("memory-reset");
    if (initialized) return;
    initialized = true;
    resetBtn.addEventListener("click", reset);
    reset();
  }

  return { init };
})();
