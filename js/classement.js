// Page classement : classement quotidien par jeu + classement général cumulé.
(function () {
  const GAMES = window.PoupiScores ? window.PoupiScores.GAMES : {};
  let currentGame = "motus";

  const tabsEl = document.getElementById("leaderboard-tabs");
  const tableWrap = document.getElementById("leaderboard-table-wrap");
  const globalWrap = document.getElementById("global-table-wrap");
  const dateEl = document.getElementById("leaderboard-date");

  function medal(rank) {
    return rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : rank + 1;
  }

  function renderDailyTable(rows) {
    if (!rows.length) {
      tableWrap.innerHTML = `<p class="leaderboard-empty">Personne n'a encore joué à ce jeu aujourd'hui. Sois le·la premier·ère !</p>`;
      return;
    }
    const body = rows
      .map(
        (r, i) => `
      <tr>
        <td class="leaderboard-rank">${medal(i)}</td>
        <td>${escapeHtml(r.player_name)}</td>
        <td>${r.points}</td>
        <td class="small">${escapeHtml(r.detail || "")}</td>
      </tr>`
      )
      .join("");
    tableWrap.innerHTML = `
      <table class="leaderboard-table">
        <thead><tr><th></th><th>Joueur·euse</th><th>Points</th><th>Détail</th></tr></thead>
        <tbody>${body}</tbody>
      </table>`;
  }

  function renderGlobalTable(rows) {
    if (!rows.length) {
      globalWrap.innerHTML = `<p class="leaderboard-empty">Pas encore de scores enregistrés.</p>`;
      return;
    }
    const body = rows
      .map(
        (r, i) => `
      <tr>
        <td class="leaderboard-rank">${medal(i)}</td>
        <td>${escapeHtml(r.player_name)}</td>
        <td>${r.total_points}</td>
        <td class="small">${r.games_played} partie${r.games_played > 1 ? "s" : ""}</td>
      </tr>`
      )
      .join("");
    globalWrap.innerHTML = `
      <table class="leaderboard-table">
        <thead><tr><th></th><th>Joueur·euse</th><th>Points cumulés</th><th></th></tr></thead>
        <tbody>${body}</tbody>
      </table>`;
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  async function loadDaily() {
    tableWrap.innerHTML = `<p class="leaderboard-empty">Chargement…</p>`;
    const rows = await window.PoupiScores.fetchDailyLeaderboard(currentGame, 30);
    renderDailyTable(rows);
  }

  async function loadGlobal() {
    globalWrap.innerHTML = `<p class="leaderboard-empty">Chargement…</p>`;
    const rows = await window.PoupiScores.fetchGlobalLeaderboard(30);
    renderGlobalTable(rows);
  }

  function buildTabs() {
    tabsEl.innerHTML = "";
    Object.keys(GAMES).forEach((key) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "game-tab" + (key === currentGame ? " active" : "");
      btn.textContent = GAMES[key];
      btn.addEventListener("click", () => {
        currentGame = key;
        Array.from(tabsEl.children).forEach((c) => c.classList.toggle("active", c === btn));
        loadDaily();
      });
      tabsEl.appendChild(btn);
    });
  }

  function init() {
    if (dateEl && window.PoupiDaily) dateEl.textContent = window.PoupiDaily.todayStr();
    buildTabs();
    loadDaily();
    loadGlobal();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
