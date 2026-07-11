// Motus Poupi du jour — clone simplifié de Wordle, thème chiens / course / Angers.
// Le mot du jour est le même pour tout le monde (graine = date du jour).
window.PoupiMotus = (function () {
  const GAME_KEY = "motus";
  // Pool de ~220 mots-réponses possibles (élargi depuis les 16 mots initiaux : sur
  // une campagne de juillet à décembre, un pool trop petit finit par boucler et se
  // faire deviner par cœur bien avant l'échéance du classement général).
  const WORDS = [
    "CHIEN", "ETANG", "LAISSE", "COURSE", "ANGERS", "RELAIS", "BICHON", "COLLIER", "DOSSARD",
    "GAMELLE", "CANICHE", "NICOLAS", "BASKETS", "MEDAILLE", "TELETHON", "MARATHON",
    "TELEPHONE", "CUISINE", "BATEAU", "SYMPTOME", "GRANGE", "ETAGERE", "MIROIR", "PRISE",
    "BLESSURE", "NOMBRE", "CIDRE", "RIDEAU", "VALISE", "CALCUL", "CHEMIN", "SOURCE", "FIEVRE",
    "REGIME", "COMPTE", "TRAMWAY", "DESSERT", "BOUCHE", "VOILE", "CHIFFON", "SPRINT", "CHIOT",
    "GOMME", "DIPLOME", "VERRE", "SQUELETTE", "CARTON", "PORTEE", "MAGASIN", "POIVRE",
    "VILLA", "ECLAIR", "METRO", "POUPEE", "TRAIN", "SERVIETTE", "POELE", "SIGNAL", "SERRURE",
    "MARCHE", "PANSEMENT", "HOPITAL", "LEGUME", "LOISIR", "BALAI", "ECHARPE", "CEREALE",
    "HYGIENE", "SANTE", "BIERE", "DEPART", "DOUCHE", "BALANCE", "CAMPING", "BUDGET", "RHUME",
    "BOCAL", "CHAMPION", "CHAPEAU", "ASSIETTE", "VITESSE", "FATIGUE", "EPONGE", "RANDONNEE",
    "STORE", "ESTOMAC", "TRAVAIL", "POUBELLE", "MOUCHOIR", "CHRONO", "GENOU", "CHALET",
    "VENDEUR", "JAMBON", "SOURCIL", "PISCINE", "TAPIS", "MUSEAU", "FRISBEE", "FALAISE",
    "FERME", "MONTAGNE", "RAISIN", "VACCIN", "GRIPPE", "TENTE", "PANIER", "TERRASSE",
    "ARBITRE", "VIGNE", "SPORT", "PARCOURS", "BARBECUE", "POISSON", "QUESTION", "CAPITAL",
    "OCEAN", "SERINGUE", "SAUCISSE", "CASSEROLE", "NICHE", "GALOP", "REGLE", "BEURRE",
    "REPOS", "TROUSSE", "FARINE", "MONTRE", "COLLINE", "CEINTURE", "COMPRIME", "SEMAINE",
    "HOTESSE", "ENDURANCE", "BAGAGE", "EXAMEN", "BIJOU", "TEMPETE", "EPAULE", "COUDE",
    "FLEUVE", "SALAIRE", "JOUET", "PLATEAU", "INFIRMIER", "STYLO", "COEUR", "BALLE", "DOIGT",
    "BROSSE", "TOURNEVIS", "TUNNEL", "BALCON", "VAGUE", "STRESS", "CLAVIER", "TABLIER",
    "LETTRE", "VEINE", "POIGNET", "SONNETTE", "SANDALE", "USINE", "EQUIPE", "PRAIRIE",
    "BENEVOLE", "LIVRE", "ESCABEAU", "CONGE", "SAUCE", "FROMAGE", "MANTEAU", "AVION",
    "PANNEAU", "CHAMBRE", "ARMOIRE", "CAFETIERE", "VOLET", "CHACAL", "SOMMET", "PECHE",
    "MEDAILLON", "MEUTE", "SUPPORTER", "ETABLE", "SAVON", "ANIMAL", "FRUIT", "ECOLE",
    "OREILLE", "OUTIL", "ECHELLE", "SUCRE", "FOULEE", "CAHIER", "ENGRAIS", "CORBEILLE",
    "GLACIER", "DOULEUR", "PROBLEME", "COUTEAU", "BOITE", "HUILE", "APPAREIL", "BILLET",
    "COLONNE", "RIVAL", "CAISSE", "ALLERGIE", "TONNERRE", "SOUPE", "CABLE", "VOLCAN",
    "THEIERE", "CARREFOUR", "BALLON", "RAQUETTE", "VESTE",
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
    if (!/^[A-Z]+$/.test(guess)) {
      statusEl.textContent = `Uniquement des lettres, s'il te plaît.`;
      return;
    }
    // Historique : on exigeait que le mot existe dans un dictionnaire embarqué,
    // mais celui-ci (même élargi à ~8000 mots) ratait sans cesse des mots
    // pourtant courants et valides (ex : poutre, loutre, crèche, bouffe...) —
    // un dico curaté à la main ne pourra jamais couvrir tout le vocabulaire
    // français. Comme le but ici est de s'amuser entre nous et pas de faire un
    // vrai anti-triche, on accepte maintenant n'importe quelle suite de lettres
    // du bon nombre de lettres : ça retire toute frustration, quitte à ce
    // qu'on puisse en théorie taper "AAAAAA" pour tester à l'aveugle.
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
        window.PoupiScores.submitAndShow(GAME_KEY, points, detail);
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
      inputEl.value = inputEl.value
        .toUpperCase()
        .replace(/[^A-ZÀ-ÖØ-Þ]/g, "")
        .slice(0, answer ? answer.length : 10);
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
