// Page concours.html : classement du concours "Jeux de la semaine" (lot à gagner), sur le
// même principe que le classement général de classement.html (cumul des points par
// joueur·euse), mais filtré sur la seule semaine du concours (voir js/contest-config.js).
// Les jeux quotidiens (Motus, Chiens-mêlés, Memory, Démineur) ne comptent déjà qu'une seule
// fois par jour, comme d'habitude (verrouillage via js/games/daily.js) — seul Mourier's
// invader a une règle en plus pendant cette semaine (2 essais/jour, voir js/games/tir.js).
(function () {
  const statusEl = document.getElementById("contest-status");
  const tableWrap = document.getElementById("contest-table-wrap");
  const rangeEl = document.getElementById("contest-range");

  function medal(rank) {
    return rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : rank + 1;
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s == null ? "" : String(s);
    return div.innerHTML;
  }

  function fmtDateFr(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  async function fetchContestScores() {
    if (typeof ensureSupabaseConfigured !== "function" || !ensureSupabaseConfigured()) return [];
    const { data, error } = await supabaseClient
      .from("game_scores")
      .select("player_key, player_name, points, created_at")
      .gte("play_date", window.PoupiContest.START)
      .lte("play_date", window.PoupiContest.END);
    if (error) {
      console.error("Erreur chargement classement du concours :", error.message);
      return [];
    }
    return data || [];
  }

  // Un cumul par joueur·euse (comme game_scores_global côté SQL, mais filtré sur la semaine
  // du concours) : pas besoin d'une vue SQL dédiée, le volume reste petit pour une semaine.
  function aggregate(rows) {
    const byPlayer = new Map();
    rows.forEach((r) => {
      const cur = byPlayer.get(r.player_key) || {
        player_name: r.player_name,
        total_points: 0,
        games_played: 0,
        lastSeen: r.created_at,
      };
      cur.total_points += r.points;
      cur.games_played += 1;
      // Garde le prénom tel qu'orthographié le plus récemment (au cas où quelqu'un l'aurait
      // retapé différemment entre deux parties).
      if (!cur.lastSeen || r.created_at > cur.lastSeen) {
        cur.player_name = r.player_name;
        cur.lastSeen = r.created_at;
      }
      byPlayer.set(r.player_key, cur);
    });
    return Array.from(byPlayer.values()).sort((a, b) => b.total_points - a.total_points);
  }

  function renderTable(rows) {
    if (!rows.length) {
      tableWrap.innerHTML = `<p class="leaderboard-empty">Personne n'a encore marqué de points cette semaine. Sois le·la premier·ère !</p>`;
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
    tableWrap.innerHTML = `
      <table class="leaderboard-table">
        <thead><tr><th></th><th>Joueur·euse</th><th>Points cumulés</th><th></th></tr></thead>
        <tbody>${body}</tbody>
      </table>`;
  }

  async function load() {
    tableWrap.innerHTML = `<p class="leaderboard-empty">Chargement…</p>`;
    const rows = await fetchContestScores();
    renderTable(aggregate(rows));
  }

  function init() {
    const C = window.PoupiContest;
    if (rangeEl) rangeEl.textContent = `du lundi ${fmtDateFr(C.START)} (00h00) au dimanche ${fmtDateFr(C.END)} (23h59)`;
    if (statusEl) {
      const st = C.status();
      if (st === "before") {
        statusEl.innerHTML = `<p class="leaderboard-empty">Le concours n'a pas encore commencé — rendez-vous lundi ${fmtDateFr(C.START)} à minuit !</p>`;
      } else if (st === "after") {
        statusEl.innerHTML = `<p class="small">🏁 Le concours est terminé — voici le classement final !</p>`;
      } else {
        statusEl.innerHTML = `<p class="small">🔥 Le concours est en cours — classement mis à jour en direct.</p>`;
      }
    }
    load();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
