// Hub des jeux : gère les onglets, le widget d'identité joueur·euse (voir plus bas) et le
// mini classement général affiché en haut de la page.
(function () {
  const GAMES = ["morpion", "motus", "motsmeles", "memory", "demineur", "tir"];

  const tabs = document.querySelectorAll(".game-tab");
  const panels = {};
  GAMES.forEach((g) => (panels[g] = document.getElementById("panel-" + g)));

  function showGame(game) {
    GAMES.forEach((g) => {
      panels[g].style.display = g === game ? "block" : "none";
    });
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.game === game));
    if (game === "morpion" && window.PoupiMorpion) window.PoupiMorpion.init();
    if (game === "motus" && window.PoupiMotus) window.PoupiMotus.init();
    if (game === "motsmeles" && window.PoupiMotsMeles) window.PoupiMotsMeles.init();
    if (game === "memory" && window.PoupiMemory) window.PoupiMemory.init();
    if (game === "demineur" && window.PoupiDemineur) window.PoupiDemineur.init();
    if (game === "tir" && window.PoupiTir) window.PoupiTir.init();
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => showGame(tab.dataset.game));
  });

  if (window.PoupiScores) window.PoupiScores.initModal();

  // ===== Widget d'identité joueur·euse =====
  // Remplace l'ancien simple champ texte : le prénom reste mémorisé automatiquement dans le
  // navigateur (comme avant, voir PoupiScores.getPlayerName/setPlayerName), mais on ajoute :
  // - un bandeau si personne n'est encore identifié·e sur cet appareil ;
  // - un menu déroulant des joueur·euses déjà connu·es (en plus de pouvoir taper un nouveau
  //   prénom), pour éviter de retaper/re-fauter un prénom déjà utilisé ;
  // - une petite confirmation quand on choisit/tape un prénom qui existe déjà (histoire
  //   d'éviter les clics accidentels — pas une vraie protection, ce n'est pas le but ici).
  (function initPlayerWidget() {
    const scores = window.PoupiScores;
    if (!scores) return;

    const knownEl = document.getElementById("player-known");
    const knownNameEl = document.getElementById("player-known-name");
    const switchBtn = document.getElementById("player-switch-btn");
    const bannerEl = document.getElementById("player-banner");
    const formEl = document.getElementById("player-form");
    const selectEl = document.getElementById("player-select");
    const nameInput = document.getElementById("player-name");
    const confirmBtn = document.getElementById("player-confirm-btn");
    const confirmBox = document.getElementById("player-confirm");
    if (!knownEl || !formEl) return;

    let knownPlayers = []; // [{ player_key, player_name }], chargé une fois depuis Supabase

    function findKnown(key) {
      return knownPlayers.find((p) => p.player_key === key) || null;
    }

    function renderKnownView() {
      const current = scores.getPlayerName();
      if (current) {
        knownNameEl.textContent = current;
        knownEl.style.display = "flex";
        bannerEl.style.display = "none";
        formEl.style.display = "none";
      } else {
        knownEl.style.display = "none";
        bannerEl.style.display = "block";
        formEl.style.display = "block";
      }
    }

    function resetForm() {
      selectEl.value = "";
      nameInput.value = "";
      confirmBox.style.display = "none";
      confirmBox.innerHTML = "";
      confirmBtn.style.display = "";
    }

    function commit(name) {
      scores.setPlayerName(name);
      resetForm();
      renderKnownView();
      loadGlobalMini(); // le "toi : #N" peut changer une fois identifié·e
    }

    function askConfirm(displayName, onYes) {
      confirmBtn.style.display = "none";
      confirmBox.style.display = "block";
      confirmBox.innerHTML = "";
      const p = document.createElement("p");
      p.className = "small";
      p.style.margin = "0 0 8px";
      p.textContent = `Es-tu sûr·e d'être ${displayName} ?`;
      const yesBtn = document.createElement("button");
      yesBtn.type = "button";
      yesBtn.className = "btn btn-primary";
      yesBtn.style.cssText = "padding:6px 16px; font-size:.85rem; margin-right:8px;";
      yesBtn.textContent = `Oui, c'est moi`;
      const noBtn = document.createElement("button");
      noBtn.type = "button";
      noBtn.className = "btn btn-outline";
      noBtn.style.cssText = "padding:6px 16px; font-size:.85rem;";
      noBtn.textContent = "Non, annuler";
      yesBtn.addEventListener("click", onYes);
      noBtn.addEventListener("click", () => {
        confirmBox.style.display = "none";
        confirmBox.innerHTML = "";
        confirmBtn.style.display = "";
      });
      confirmBox.appendChild(p);
      confirmBox.appendChild(yesBtn);
      confirmBox.appendChild(noBtn);
    }

    function handleConfirmClick() {
      const selectedKey = selectEl.value;
      if (selectedKey) {
        const match = findKnown(selectedKey);
        const displayName = match ? match.player_name : selectedKey;
        askConfirm(displayName, () => commit(displayName));
        return;
      }
      const typed = nameInput.value.trim();
      if (!typed) return;
      const typedKey = scores.slug(typed);
      const match = findKnown(typedKey);
      if (match) {
        // Le prénom tapé correspond à quelqu'un de déjà connu (même sans accent/casse
        // identique) : on demande confirmation plutôt que de fusionner silencieusement.
        askConfirm(match.player_name, () => commit(match.player_name));
      } else {
        commit(typed);
      }
    }

    // Choisir dans le menu déroulant vide le champ texte, et inversement, pour éviter toute
    // ambiguïté sur ce qui sera réellement pris en compte.
    selectEl.addEventListener("change", () => {
      if (selectEl.value) nameInput.value = "";
    });
    nameInput.addEventListener("input", () => {
      if (nameInput.value) selectEl.value = "";
    });

    confirmBtn.addEventListener("click", handleConfirmClick);
    switchBtn.addEventListener("click", () => {
      resetForm();
      knownEl.style.display = "none";
      bannerEl.style.display = "none";
      formEl.style.display = "block";
    });

    async function loadKnownPlayers() {
      knownPlayers = await scores.fetchKnownPlayers();
      selectEl.innerHTML = '<option value="">— Choisir dans la liste —</option>';
      knownPlayers.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.player_key;
        opt.textContent = p.player_name;
        selectEl.appendChild(opt);
      });
    }

    renderKnownView();
    loadKnownPlayers();
  })();

  // ===== Mini classement général (haut de page) =====
  async function loadGlobalMini() {
    const scores = window.PoupiScores;
    const wrap = document.getElementById("global-leaderboard-mini");
    const youEl = document.getElementById("global-leaderboard-you");
    if (!scores || !wrap) return;
    const rows = await scores.fetchGlobalLeaderboard(200);
    if (!rows.length) {
      wrap.innerHTML = `<p class="leaderboard-empty">Pas encore de scores enregistrés — sois le·la premier·ère !</p>`;
      if (youEl) youEl.textContent = "";
      return;
    }
    const top = rows.slice(0, 5);
    const medal = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`);
    const esc = (s) => {
      const div = document.createElement("div");
      div.textContent = s == null ? "" : String(s);
      return div.innerHTML;
    };
    wrap.innerHTML = `
      <table class="leaderboard-table">
        <thead><tr><th></th><th>Joueur·euse</th><th>Points</th></tr></thead>
        <tbody>
          ${top
            .map(
              (r, i) => `
            <tr>
              <td class="leaderboard-rank">${medal(i)}</td>
              <td>${esc(r.player_name)}</td>
              <td>${r.total_points}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`;

    if (youEl) {
      const current = scores.getPlayerName();
      if (!current) {
        youEl.textContent = "";
      } else {
        const key = scores.slug(current);
        const idx = rows.findIndex((r) => scores.slug(r.player_name) === key);
        youEl.textContent =
          idx >= 0 && idx >= 5
            ? `Toi : ${medal(idx)} avec ${rows[idx].total_points} pts cumulés`
            : "";
      }
    }
  }

  showGame(GAMES[0]);
  loadGlobalMini();
})();
