// Système de points partagé pour les jeux Poupi — un classement quotidien par jeu
// et un classement général (cumul de points, tous jeux/jours confondus).
// Le morpion n'est pas concerné (parties illimitées, pas de classement).
// Nécessite Supabase (voir sql/schema.sql, table `game_scores` + vue `game_scores_global`).
window.PoupiScores = (function () {
  const NAME_KEY = "poupi_player_name";
  const GAMES = {
    motus: "Motus",
    motsmeles: "Mots-mêlés",
    memory: "Memory",
    demineur: "Démineur",
    tir: "Tir Arcade",
  };

  function slug(name) {
    return (name || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
  }

  function getPlayerName() {
    try {
      return localStorage.getItem(NAME_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function setPlayerName(name) {
    try {
      localStorage.setItem(NAME_KEY, (name || "").trim());
    } catch (e) {}
  }

  // Initialise un champ <input> partagé (id="player-name") : préremplit avec le
  // prénom déjà connu, sauvegarde à chaque modification.
  function bindPlayerNameInput(inputEl) {
    if (!inputEl) return;
    inputEl.value = getPlayerName();
    inputEl.addEventListener("input", () => setPlayerName(inputEl.value));
  }

  // Retourne toujours un objet { ok, ... } décrivant ce qui s'est passé, pour
  // que l'UI puisse expliquer clairement pourquoi le classement ne bouge pas
  // (pas de prénom, Supabase injoignable, erreur, ou score pas assez bon).
  async function submitScore(gameKey, points, detail) {
    const name = getPlayerName();
    if (!name) return { ok: false, reason: "no-name" };
    if (typeof ensureSupabaseConfigured !== "function" || !ensureSupabaseConfigured()) {
      return { ok: false, reason: "no-supabase" };
    }
    const row = {
      player_name: name.trim(),
      player_key: slug(name),
      game_key: gameKey,
      play_date: window.PoupiDaily.todayStr(),
      points: Math.max(0, Math.min(100, Math.round(points))),
      detail: detail || null,
    };
    try {
      const { error } = await supabaseClient
        .from("game_scores")
        .upsert(row, { onConflict: "player_key,game_key,play_date" });
      if (error) {
        console.error("Erreur envoi score :", error.message);
        return { ok: false, reason: "error", message: error.message };
      }
      return { ok: true, saved: true };
    } catch (e) {
      console.error("Erreur envoi score :", e);
      return { ok: false, reason: "error", message: String(e) };
    }
  }

  // Pour les jeux rejouables (tir arcade) : ne remplace le score du jour que
  // si le nouveau est meilleur que celui déjà enregistré.
  async function submitBestScore(gameKey, points, detail) {
    const name = getPlayerName();
    if (!name) return { ok: false, reason: "no-name" };
    if (typeof ensureSupabaseConfigured !== "function" || !ensureSupabaseConfigured()) {
      return { ok: false, reason: "no-supabase" };
    }
    const key = slug(name);
    try {
      const { data } = await supabaseClient
        .from("game_scores")
        .select("points")
        .eq("player_key", key)
        .eq("game_key", gameKey)
        .eq("play_date", window.PoupiDaily.todayStr())
        .maybeSingle();
      if (data && data.points >= points) {
        // score existant déjà meilleur ou égal : le classement du jour ne change pas, c'est normal.
        return { ok: true, saved: false, reason: "not-better", bestPoints: data.points };
      }
      return submitScore(gameKey, points, detail);
    } catch (e) {
      console.error("Erreur envoi meilleur score :", e);
      return { ok: false, reason: "error", message: String(e) };
    }
  }

  async function fetchDailyLeaderboard(gameKey, limit) {
    if (typeof ensureSupabaseConfigured !== "function" || !ensureSupabaseConfigured()) return [];
    const { data, error } = await supabaseClient
      .from("game_scores")
      .select("player_name, points, detail, created_at")
      .eq("game_key", gameKey)
      .eq("play_date", window.PoupiDaily.todayStr())
      .order("points", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(limit || 30);
    if (error) {
      console.error("Erreur chargement classement :", error.message);
      return [];
    }
    return data || [];
  }

  async function fetchGlobalLeaderboard(limit) {
    if (typeof ensureSupabaseConfigured !== "function" || !ensureSupabaseConfigured()) return [];
    const { data, error } = await supabaseClient
      .from("game_scores_global")
      .select("player_name, total_points, games_played")
      .order("total_points", { ascending: false })
      .limit(limit || 30);
    if (error) {
      console.error("Erreur chargement classement global :", error.message);
      return [];
    }
    return data || [];
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s == null ? "" : String(s);
    return div.innerHTML;
  }

  function medalFor(rankIdx) {
    if (rankIdx === 0) return "🥇";
    if (rankIdx === 1) return "🥈";
    if (rankIdx === 2) return "🥉";
    return `#${rankIdx + 1}`;
  }

  // Affiche une popup de fin de partie avec le score obtenu, la position du
  // jour pour ce jeu, et la position au classement général cumulé.
  // `submitResult` (optionnel) vient de submitScore/submitBestScore et permet
  // d'expliquer clairement pourquoi le classement ne bougerait pas (erreur
  // d'enregistrement, ou score du jour pas encore battu).
  async function showScorePopup(gameKey, points, detail, submitResult) {
    const overlay = document.getElementById("score-modal-overlay");
    const content = document.getElementById("score-modal-content");
    if (!overlay || !content) return;
    const gameLabel = GAMES[gameKey] || gameKey;
    const name = getPlayerName();

    let noteHtml = "";
    if (submitResult && submitResult.ok === false && submitResult.reason === "no-supabase") {
      noteHtml = `<p class="score-popup-warning">⚠️ Score non enregistré : connexion à la base de données impossible (recharge la page, ou réessaie plus tard).</p>`;
    } else if (submitResult && submitResult.ok === false && submitResult.reason === "error") {
      noteHtml = `<p class="score-popup-warning">⚠️ Score non enregistré : erreur lors de l'enregistrement${submitResult.message ? ` (${escapeHtml(submitResult.message)})` : ""}. Si ça persiste à chaque partie, la table des scores n'est peut-être pas encore créée côté serveur.</p>`;
    } else if (submitResult && submitResult.ok && submitResult.saved === false && submitResult.reason === "not-better") {
      noteHtml = `<p class="small">Ton record du jour sur ce jeu (${submitResult.bestPoints} pts) est déjà meilleur : le classement garde ton meilleur score, pas celui-ci.</p>`;
    }

    const header = `
      <h2 class="mt-0">${escapeHtml(gameLabel)}</h2>
      <p class="score-popup-points">🏅 ${points} pts</p>
      ${detail ? `<p class="small">${escapeHtml(detail)}</p>` : ""}
      ${noteHtml}
    `;

    if (!name) {
      content.innerHTML =
        header +
        `<p>Renseigne ton prénom en haut de la page pour apparaître dans les classements la prochaine fois !</p>`;
      overlay.style.display = "flex";
      return;
    }

    content.innerHTML = header + `<p class="small">Chargement du classement…</p>`;
    overlay.style.display = "flex";

    const [daily, global] = await Promise.all([
      fetchDailyLeaderboard(gameKey, 200),
      fetchGlobalLeaderboard(200),
    ]);
    const key = slug(name);
    const dailyIdx = daily.findIndex((r) => slug(r.player_name) === key);
    const globalIdx = global.findIndex((r) => slug(r.player_name) === key);

    const dailyTxt =
      dailyIdx >= 0
        ? `${medalFor(dailyIdx)} sur ${daily.length} aujourd'hui`
        : "pas encore classé·e aujourd'hui";
    const globalTxt =
      globalIdx >= 0
        ? `${medalFor(globalIdx)} au général avec ${global[globalIdx].total_points} pts cumulés`
        : "pas encore au classement général";

    content.innerHTML =
      header +
      `
      <div class="score-popup-row">
        <strong>Classement du jour — ${escapeHtml(gameLabel)}</strong>
        <span>${dailyTxt}</span>
      </div>
      <div class="score-popup-row">
        <strong>Classement général</strong>
        <span>${globalTxt}</span>
      </div>
      <div class="hero-actions" style="margin-top:16px; justify-content:center;">
        <a href="classement.html" class="btn btn-outline">Voir le classement complet →</a>
      </div>
    `;
  }

  function hideScorePopup() {
    const overlay = document.getElementById("score-modal-overlay");
    if (overlay) overlay.style.display = "none";
  }

  // Combine soumission + popup, pour les jeux à un seul essai/jour.
  async function submitAndShow(gameKey, points, detail) {
    const result = await submitScore(gameKey, points, detail);
    showScorePopup(gameKey, points, detail, result);
  }

  // Idem mais pour les jeux rejouables où seul le meilleur score du jour compte.
  async function submitBestAndShow(gameKey, points, detail) {
    const result = await submitBestScore(gameKey, points, detail);
    showScorePopup(gameKey, points, detail, result);
  }

  function initModal() {
    const overlay = document.getElementById("score-modal-overlay");
    const closeBtn = document.getElementById("score-modal-close");
    if (!overlay) return;
    if (closeBtn) closeBtn.addEventListener("click", hideScorePopup);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) hideScorePopup();
    });
  }

  return {
    GAMES,
    slug,
    getPlayerName,
    setPlayerName,
    bindPlayerNameInput,
    submitScore,
    submitBestScore,
    fetchDailyLeaderboard,
    fetchGlobalLeaderboard,
    showScorePopup,
    hideScorePopup,
    submitAndShow,
    submitBestAndShow,
    initModal,
  };
})();
