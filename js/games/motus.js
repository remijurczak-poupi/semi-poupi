// Motus Poupi — clone simplifié de Wordle, thème chiens / course / Angers.
window.PoupiMotus = (function () {
  const WORDS = [
    "CHIEN", "ETANG", "LAISSE", "COURSE", "ANGERS", "RELAIS", "BICHON",
    "COLLIER", "DOSSARD", "GAMELLE", "CANICHE", "NICOLAS", "BASKETS",
    "MEDAILLE", "TELETHON", "MARATHON",
  ];
  const MAX_TRIES = 6;
  const KEYS = "AZERTYUIOPQSDFGHJKLMWXCVBN".split("");

  let answer, guesses, currentGuess, over, initialized;
  let gridEl, statusEl, formEl, inputEl, keyboardEl, resetBtn;
  let keyState = {};

  function pickWord() {
    return WORDS[Math.floor(Math.random() * WORDS.length)];
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

  function updateKeyState(guess, result) {
    guess.split("").forEach((letter, i) => {
      const rank = { absent: 0, present: 1, correct: 2 };
      if (!keyState[letter] || rank[result[i]] > rank[keyState[letter]]) {
        keyState[letter] = result[i];
      }
    });
  }

  function renderKeyboard() {
    keyboardEl.innerHTML = "";
    KEYS.forEach((k) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "motus-key" + (keyState[k] ? " " + keyState[k] : "");
      btn.textContent = k;
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
        } else if (r === guesses.length && inputEl && inputEl.value[c]) {
          cell.textContent = inputEl.value[c];
          cell.classList.add("typing");
        }
        gridEl.appendChild(cell);
      }
    }
    renderKeyboard();
  }

  function submitGuess(e) {
    e.preventDefault();
    if (over) return;
    const guess = inputEl.value.trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (guess.length !== answer.length) {
      statusEl.textContent = `Le mot fait ${answer.length} lettres.`;
      return;
    }
    guesses.push(guess);
    updateKeyState(guess, evaluate(guess));
    inputEl.value = "";

    if (guess === answer) {
      over = true;
      statusEl.textContent = `🎉 Bravo, le mot était ${answer} !`;
    } else if (guesses.length >= MAX_TRIES) {
      over = true;
      statusEl.textContent = `😅 Perdu ! Le mot était ${answer}.`;
    } else {
      statusEl.textContent = `Essai ${guesses.length}/${MAX_TRIES}`;
    }
    render();
  }

  function reset() {
    answer = pickWord();
    guesses = [];
    currentGuess = "";
    over = false;
    keyState = {};
    statusEl.textContent = `Devine le mot en ${MAX_TRIES} essais`;
    if (inputEl) {
      inputEl.value = "";
      inputEl.maxLength = answer.length;
    }
    render();
  }

  function init() {
    gridEl = document.getElementById("motus-grid");
    statusEl = document.getElementById("motus-status");
    formEl = document.getElementById("motus-form");
    inputEl = document.getElementById("motus-input");
    keyboardEl = document.getElementById("motus-keyboard");
    resetBtn = document.getElementById("motus-reset");
    if (initialized) return;
    initialized = true;
    formEl.addEventListener("submit", submitGuess);
    inputEl.addEventListener("input", () => {
      inputEl.value = inputEl.value.toUpperCase().slice(0, answer ? answer.length : 10);
      render();
    });
    resetBtn.addEventListener("click", reset);
    reset();
  }

  return { init };
})();
