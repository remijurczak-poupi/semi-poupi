// Petit moteur commun pour transformer les 4 jeux en "jeux quotidiens" :
// - même puzzle pour tout le monde un jour donné (RNG à graine déterministe)
// - un seul essai par jour, persisté en localStorage, avec état "déjà joué"
window.PoupiDaily = (function () {
  function todayStr() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  // Hash simple (djb2) d'une chaîne -> entier 32 bits.
  function hashStr(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = (h * 33) ^ str.charCodeAt(i);
    }
    return h >>> 0;
  }

  // PRNG déterministe (mulberry32) : mêmes graines -> mêmes tirages partout.
  function mulberry32(seed) {
    let a = seed;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Un générateur pseudo-aléatoire propre à un jeu + une date donnée.
  function rngFor(gameKey, dateStr) {
    dateStr = dateStr || todayStr();
    return mulberry32(hashStr(gameKey + "::" + dateStr));
  }

  function storageKey(gameKey) {
    return `poupi_daily_${gameKey}`;
  }

  function load(gameKey) {
    try {
      const raw = localStorage.getItem(storageKey(gameKey));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function save(gameKey, state) {
    try {
      localStorage.setItem(storageKey(gameKey), JSON.stringify(state));
    } catch (e) {}
  }

  // Renvoie l'état sauvegardé s'il correspond à aujourd'hui, sinon null
  // (= nouvelle journée, il faut régénérer un puzzle).
  function loadToday(gameKey) {
    const state = load(gameKey);
    if (state && state.date === todayStr()) return state;
    return null;
  }

  function saveToday(gameKey, data) {
    save(gameKey, Object.assign({ date: todayStr() }, data));
  }

  return { todayStr, hashStr, mulberry32, rngFor, loadToday, saveToday };
})();
