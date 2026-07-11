document.addEventListener("DOMContentLoaded", () => {
  const gate = document.getElementById("gate");
  const dashboard = document.getElementById("dashboard");
  const unlockBtn = document.getElementById("unlock-btn");
  const emailInput = document.getElementById("admin-email");
  const passInput = document.getElementById("admin-pass");
  const gateMsg = document.getElementById("gate-msg");
  const logoutBtn = document.getElementById("logout-btn");

  function showDashboard() {
    gate.style.display = "none";
    dashboard.style.display = "";
    loadAll();
  }

  function showGate() {
    gate.style.display = "";
    dashboard.style.display = "none";
  }

  // Vraie authentification Supabase (Authentication > Users côté Supabase) plutôt
  // qu'un mot de passe partagé écrit en clair dans le JS : la policy Postgres sur
  // `participants` exige maintenant un utilisateur connecté pour lire les données
  // (emails, téléphones), donc ce login est une vraie protection cette fois, pas
  // juste un frein cosmétique.
  async function checkSession() {
    if (!ensureSupabaseConfigured()) return;
    const { data } = await supabaseClient.auth.getSession();
    if (data && data.session) {
      showDashboard();
    } else {
      showGate();
    }
  }

  unlockBtn.addEventListener("click", tryUnlock);
  [emailInput, passInput].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryUnlock();
    });
  });

  async function tryUnlock() {
    if (!ensureSupabaseConfigured()) {
      gateMsg.textContent = "Connexion à Supabase impossible pour le moment — réessaie un peu plus tard.";
      gateMsg.className = "form-msg show error";
      return;
    }
    const email = emailInput.value.trim();
    const password = passInput.value;
    if (!email || !password) {
      gateMsg.textContent = "Renseigne ton email et ton mot de passe.";
      gateMsg.className = "form-msg show error";
      return;
    }
    unlockBtn.disabled = true;
    unlockBtn.textContent = "Connexion...";
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    unlockBtn.disabled = false;
    unlockBtn.textContent = "Se connecter";
    if (error) {
      gateMsg.textContent = "Connexion refusée : " + error.message;
      gateMsg.className = "form-msg show error";
      return;
    }
    passInput.value = "";
    showDashboard();
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (ensureSupabaseConfigured()) {
        await supabaseClient.auth.signOut();
      }
      showGate();
    });
  }

  checkSession();

  document.getElementById("refresh-btn").addEventListener("click", loadAll);
  document.getElementById("export-btn").addEventListener("click", exportCsv);

  let lastParticipants = [];
  let lastScores = [];

  async function loadAll() {
    if (!ensureSupabaseConfigured()) return;

    const { data: participants, error: pErr } = await supabaseClient
      .from("participants")
      .select("*")
      .order("created_at", { ascending: false });

    if (pErr) {
      console.error(pErr);
    } else {
      lastParticipants = participants || [];
      renderStats(lastParticipants);
      renderParticipants(lastParticipants);
    }

    const { data: scores, error: sErr } = await supabaseClient
      .from("game_scores")
      .select("*")
      .order("play_date", { ascending: false })
      .order("points", { ascending: false });

    if (sErr) {
      console.error(sErr);
    } else {
      lastScores = scores || [];
      renderScores(lastScores);
    }
  }

  function renderStats(participants) {
    const yes = participants.filter((p) => p.attending === "yes").length;
    const maybe = participants.filter((p) => p.attending === "maybe").length;
    const no = participants.filter((p) => p.attending === "no").length;
    const sizes = {};
    participants.forEach((p) => {
      if (p.tshirt_size) sizes[p.tshirt_size] = (sizes[p.tshirt_size] || 0) + 1;
    });
    const sizeStr = Object.keys(sizes).length
      ? Object.entries(sizes).map(([k, v]) => `${k}:${v}`).join(" · ")
      : "—";

    document.getElementById("stats").innerHTML = `
      <div class="stat"><div class="num">${participants.length}</div><div class="label">Réponses</div></div>
      <div class="stat"><div class="num">${yes}</div><div class="label">Présent·es</div></div>
      <div class="stat"><div class="num">${maybe}</div><div class="label">Peut-être</div></div>
      <div class="stat"><div class="num">${no}</div><div class="label">Absent·es</div></div>
      <div class="stat"><div class="num" style="font-size:1rem;">${sizeStr}</div><div class="label">T-shirts</div></div>
    `;
  }

  const TRANSPORT_LABELS = {
    "voiture-solo": "🚗 Voiture (seul·e)",
    "voiture-covoit": "🚙 Voiture, covoiturage possible",
    "covoit-cherche": "🙋 Cherche covoiturage",
    train: "🚆 Train",
    autre: "🚲 Autre",
  };

  function renderParticipants(participants) {
    const tbody = document.querySelector("#participants-table tbody");
    tbody.innerHTML = "";
    participants.forEach((p) => {
      const tr = document.createElement("tr");
      const attendingLabel = { yes: "🙋 Oui", maybe: "🤔 Peut-être", no: "❌ Non" }[p.attending] || p.attending;
      tr.innerHTML = `
        <td>${escapeHtml(p.name)}</td>
        <td>${p.email ? escapeHtml(p.email) : "—"}</td>
        <td>${p.phone ? escapeHtml(p.phone) : "—"}</td>
        <td>${attendingLabel}</td>
        <td>${p.tshirt_size || "—"}</td>
        <td>${p.arrival_time || "—"}</td>
        <td>${p.departure_time || "—"}</td>
        <td>${TRANSPORT_LABELS[p.transport] || p.transport || "—"}</td>
        <td>${p.comment ? escapeHtml(p.comment) : "—"}</td>
        <td>${p.created_at ? new Date(p.created_at).toLocaleString("fr-FR") : "—"}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ---------- Gestion des scores des jeux ----------
  const GAME_LABELS = {
    motus: "Motus",
    motsmeles: "Chiens-mêlés",
    memory: "Memory",
    demineur: "Démineur",
    tir: "Mourier's invader",
  };

  const scoresFilterGame = document.getElementById("scores-filter-game");
  const scoresFilterName = document.getElementById("scores-filter-name");
  scoresFilterGame.addEventListener("change", () => renderScores(lastScores));
  scoresFilterName.addEventListener("input", () => renderScores(lastScores));

  function renderScores(scores) {
    const gameFilter = scoresFilterGame.value;
    const nameFilter = scoresFilterName.value.trim().toLowerCase();
    const filtered = scores.filter((s) => {
      if (gameFilter && s.game_key !== gameFilter) return false;
      if (nameFilter && !s.player_name.toLowerCase().includes(nameFilter)) return false;
      return true;
    });

    const tbody = document.querySelector("#scores-table tbody");
    tbody.innerHTML = "";

    if (!filtered.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7;
      td.className = "small";
      td.textContent = scores.length ? "Aucun score pour ce filtre." : "Aucun score enregistré pour l'instant.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    filtered.forEach((s) => {
      const tr = document.createElement("tr");

      const tdName = document.createElement("td");
      tdName.textContent = s.player_name;
      const tdGame = document.createElement("td");
      tdGame.textContent = GAME_LABELS[s.game_key] || s.game_key;
      const tdDate = document.createElement("td");
      tdDate.textContent = s.play_date;
      const tdDetail = document.createElement("td");
      tdDetail.textContent = s.detail || "—";
      const tdCreated = document.createElement("td");
      tdCreated.textContent = s.created_at ? new Date(s.created_at).toLocaleString("fr-FR") : "—";

      const tdPoints = document.createElement("td");
      const pointsInput = document.createElement("input");
      pointsInput.type = "number";
      pointsInput.min = "0";
      pointsInput.max = "100";
      pointsInput.value = s.points;
      pointsInput.className = "score-points-input";
      tdPoints.appendChild(pointsInput);

      const tdActions = document.createElement("td");
      tdActions.style.whiteSpace = "nowrap";
      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "btn btn-outline btn-icon";
      saveBtn.title = "Enregistrer ce score";
      saveBtn.textContent = "💾";
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn btn-outline btn-icon btn-danger-outline";
      delBtn.title = "Supprimer ce score";
      delBtn.style.marginLeft = "6px";
      delBtn.textContent = "🗑";
      tdActions.appendChild(saveBtn);
      tdActions.appendChild(delBtn);

      tr.appendChild(tdName);
      tr.appendChild(tdGame);
      tr.appendChild(tdDate);
      tr.appendChild(tdPoints);
      tr.appendChild(tdDetail);
      tr.appendChild(tdCreated);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);

      saveBtn.addEventListener("click", async () => {
        const newPoints = Math.max(0, Math.min(100, Math.round(Number(pointsInput.value) || 0)));
        pointsInput.value = newPoints;
        saveBtn.disabled = true;
        const original = saveBtn.textContent;
        saveBtn.textContent = "…";
        const { error } = await supabaseClient
          .from("game_scores")
          .update({ points: newPoints })
          .eq("id", s.id);
        saveBtn.disabled = false;
        if (error) {
          console.error(error);
          saveBtn.textContent = "❌";
        } else {
          s.points = newPoints;
          saveBtn.textContent = "✅";
        }
        setTimeout(() => { saveBtn.textContent = original; }, 1500);
      });

      delBtn.addEventListener("click", async () => {
        delBtn.disabled = true;
        const { error } = await supabaseClient.from("game_scores").delete().eq("id", s.id);
        delBtn.disabled = false;
        if (error) {
          console.error(error);
          return;
        }
        lastScores = lastScores.filter((row) => row.id !== s.id);
        renderScores(lastScores);
      });
    });
  }

  const resetConfirmInput = document.getElementById("reset-confirm-input");
  const resetScoresBtn = document.getElementById("reset-scores-btn");
  const resetMsg = document.getElementById("reset-msg");

  resetScoresBtn.addEventListener("click", async () => {
    if ((resetConfirmInput.value || "").trim().toUpperCase() !== "RESET") {
      resetMsg.textContent = "Tape RESET (en majuscules) dans le champ pour confirmer la suppression.";
      resetMsg.className = "form-msg show error";
      return;
    }
    if (!ensureSupabaseConfigured()) return;

    resetScoresBtn.disabled = true;
    const original = resetScoresBtn.textContent;
    resetScoresBtn.textContent = "Suppression...";

    // Le client Supabase exige au moins un filtre sur delete() : cette condition
    // est toujours vraie (aucun id n'est tout-zéro), donc ça supprime bien toutes les lignes.
    const { error } = await supabaseClient
      .from("game_scores")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    resetScoresBtn.disabled = false;
    resetScoresBtn.textContent = original;

    if (error) {
      console.error(error);
      resetMsg.textContent = "Erreur lors de la suppression : " + error.message;
      resetMsg.className = "form-msg show error";
      return;
    }

    resetConfirmInput.value = "";
    resetMsg.textContent = "✅ Tous les scores ont été supprimés. Le classement repart de zéro.";
    resetMsg.className = "form-msg show success";
    lastScores = [];
    renderScores(lastScores);
  });

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function exportCsv() {
    if (!lastParticipants.length) return;
    const headers = ["Nom", "Email", "Téléphone", "Présence", "T-shirt", "Arrivée", "Départ", "Transport", "Commentaire", "Envoyé le"];
    const rows = lastParticipants.map((p) => [
      p.name,
      p.email || "",
      p.phone || "",
      p.attending,
      p.tshirt_size || "",
      p.arrival_time || "",
      p.departure_time || "",
      p.transport || "",
      (p.comment || "").replace(/\n/g, " "),
      p.created_at || "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "semi-poupi-2026-participants.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
});
