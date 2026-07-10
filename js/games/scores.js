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

  async function submitScore(gameKey, points, detail) {
    const name = getPlayerName();
    if (!name) return false;
    if (typeof ensureSupabaseConfigured !== "function" || !ensureSupabaseConfigured()) return false;
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
        return false;
      }
      return true;
    } catch (e) {
      console.error("Erreur envoi score :", e);
      return false;
    }
  }

  // Pour les jeux rejouables (tir arcade) : ne remplace le score du jour que
  // si le nouveau est meilleur que celui déjà enregistré.
  async function submitBestScore(gameKey, points, detail) {
    const name = getPlayerName();
    if (!name) return false;
    if (typeof ensureSupabaseConfigured !== "function" || !ensureSupabaseConfigured()) return false;
    const key = slug(name);
    try {
      const { data } = await supabaseClient
        .from("game_scores")
        .select("points")
        .eq("player_key", key)
        .eq("game_key", gameKey)
        .eq("play_date", window.PoupiDaily.todayStr())
        .maybeSingle();
      if (data && data.points >= points) return false; // score existant déjà meilleur ou égal
      return submitScore(gameKey, points, detail);
    } catch (e) {
      console.error("Erreur envoi meilleur score :", e);
      return false;
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
  };
})();
