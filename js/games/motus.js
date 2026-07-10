// Motus Poupi du jour — clone simplifié de Wordle, thème chiens / course / Angers.
// Le mot du jour est le même pour tout le monde (graine = date du jour).
window.PoupiMotus = (function () {
  const GAME_KEY = "motus";
  const WORDS = [
    "CHIEN", "ETANG", "LAISSE", "COURSE", "ANGERS", "RELAIS", "BICHON",
    "COLLIER", "DOSSARD", "GAMELLE", "CANICHE", "NICOLAS", "BASKETS",
    "MEDAILLE", "TELETHON", "MARATHON",
  ];
  const MAX_TRIES = 6;
  const KEYS = "AZERTYUIOPQSDFGHJKLMWXCVBN".split("");

  let answer, guesses, over, initialized;
  let gridEl, statusEl, formEl, inputEl, keyboardEl, lockEl;
  let keyState = {};

  function pickWord() {
    const rng = window.PoupiDaily.rngFor(GAME_KEY);
    return WORDS[Math.floor(rng() * WORDS.length)];
  }

  function evaluate(guess) {
    const result = Array(guess.length).fill("absent");
    const answerLetters = answer.split("");
    const used = Array(answer.length).fill(false);

    for (let i = 0; i < guess.length; i++) {
      if (guess[i] === answerLetters[i]) {
        result[i] = "correct";
        used[i] = true;
      }
    }
    for (let i = 0; i < guess.length; i++) {
      if (result[i] === "correct") continue;
      const idx = answerLetters.findIndex((l, j) => l === guess[i] && !used[j]);
      if (idx !== -1) {
        result[i] = "present";
        used[idx] = true;
      }
    }
    return result;
  }

  function recomputeKeyState() {
    keyState = {};
    guesses.forEach((g) => {
      const result = evaluate(g);
      g.split("").forEach((letter, i) => {
        const rank = { absent: 0, present: 1, correct: 2 };
        if (!keyState[letter] || rank[result[i]] > rank[keyState[letter]]) {
          keyState[letter] = result[i];
        }
      });
    });
  }

  function renderKeyboard() {
    keyboardEl.innerHTML = "";
    KEYS.forEach((k) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "motus-key" + (keyState[k] ? " " + keyState[k] : "");
      btn.textContent = k;
      btn.disabled = over;
      btn.addEventListener("click", () => {
        if (over) return;
        inputEl.value = (inputEl.value + k).slice(0, answer.length);
        inputEl.focus();
      });
      keyboardEl.appendChild(btn);
    });
    const back = document.createElement("button");
    back.type = "button";
    back.className = "motus-key motus-key-wide";
    back.textContent = "⌫";
    back.disabled = over;
    back.addEventListener("click", () => {
      inputEl.value = inputEl.value.slice(0, -1);
      inputEl.focus();
    });
    keyboardEl.appendChild(back);
  }

  function render() {
    gridEl.innerHTML = "";
    gridEl.style.setProperty("--motus-cols", answer.length);
    for (let r = 0; r < MAX_TRIES; r++) {
      const rowGuess = guesses[r];
      const result = rowGuess ? evaluate(rowGuess) : null;
      for (let c = 0; c < answer.length; c++) {
        const cell = document.createElement("div");
        cell.className = "motus-cell";
        if (result) {
          cell.classList.add(result[c]);
          cell.textContent = rowGuess[c];
        } else if (r === guesses.length && !over && inputEl && inputEl.value[c]) {
          cell.textContent = inputEl.value[c];
          cell.classList.add("typing");
        }
        gridEl.appendChild(cell);
      }
    }
    renderKeyboard();
    inputEl.disabled = over;
    formEl.querySelector("button[type=submit]").disabled = over;
  }

  function persist() {
    window.PoupiDaily.saveToday(GAME_KEY, { guesses, over });
  }

  function lockMessage() {
    lockEl.style.display = "block";
    if (guesses.includes(answer)) {
      lockEl.textContent = `🎉 Bravo, trouvé en ${guesses.length}/${MAX_TRIES} ! Reviens demain pour un nouveau mot.`;
    } else {
      lockEl.textContent = `😅 Le mot était ${answer}. Reviens demain pour un nouveau mot.`;
    }
  }

  const TRY_POINTS = [100, 85, 70, 55, 40, 25];
  const FAIL_POINTS = 10;

  function submitGuess(e) {
    e.preventDefault();
    if (over) return;
    const guess = inputEl.value.trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (guess.length !== answer.length) {
      statusEl.textContent = `Le mot fait ${answer.length} lettres.`;
      return;
    }
    guesses.push(guess);
    inputEl.value = "";

    let won = false;
    if (guess === answer) {
      over = true;
      won = true;
      statusEl.textContent = `🎉 Bravo, le mot était ${answer} !`;
    } else if (guesses.length >= MAX_TRIES) {
      over = true;
      statusEl.textContent = `😅 Perdu ! Le mot était ${answer}.`;
    } else {
      statusEl.textContent = `Essai ${guesses.length}/${MAX_TRIES}`;
    }
    recomputeKeyState();
    persist();
    render();
    if (over) {
      lockMessage();
      if (window.PoupiScores) {
        const points = won ? TRY_POINTS[guesses.length - 1] : FAIL_POINTS;
        const detail = won ? `${guesses.length}/${MAX_TRIES} essais` : "non trouvé";
        window.PoupiScores.submitScore(GAME_KEY, points, detail);
      }
    }
  }

  function init() {
    gridEl = document.getElementById("motus-grid");
    statusEl = document.getElementById("motus-status");
    formEl = document.getElementById("motus-form");
    inputEl = document.getElementById("motus-input");
    keyboardEl = document.getElementById("motus-keyboard");
    lockEl = document.getElementById("motus-reset"); // réutilisé comme bandeau de verrouillage
    if (initialized) return;
    initialized = true;
    lockEl.style.display = "none";
    formEl.addEventListener("submit", submitGuess);
    inputEl.addEventListener("input", () => {
      inputEl.value = inputEl.value.toUpperCase().slice(0, answer ? answer.length : 10);
      render();
    });

    answer = pickWord();
    const saved = window.PoupiDaily.loadToday(GAME_KEY);
    if (saved) {
      guesses = saved.guesses || [];
      over = !!saved.over;
    } else {
      guesses = [];
      over = false;
      persist();
    }
    inputEl.maxLength = answer.length;
    recomputeKeyState();
    statusEl.textContent = over
      ? ""
      : guesses.length
      ? `Essai ${guesses.length}/${MAX_TRIES}`
      : `Devine le mot du jour en ${MAX_TRIES} essais`;
    render();
    if (over) lockMessage();
  }

  return { init };
})();
