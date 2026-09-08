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

    loadSettings();
  }

  // ---------- Réglages du site (interrupteurs simples, ex : masquer "Parrains") ----------
  const settingParrainsCheckbox = document.getElementById("setting-parrains");
  const settingMsg = document.getElementById("setting-msg");
  let settingsLoaded = false;

  async function loadSettings() {
    if (!ensureSupabaseConfigured()) return;
    const { data, error } = await supabaseClient
      .from("site_settings")
      .select("key, enabled")
      .eq("key", "parrains")
      .maybeSingle();
    if (error) {
      console.error(error);
      return;
    }
    settingParrainsCheckbox.checked = data ? !!data.enabled : false;
    settingsLoaded = true;
  }

  settingParrainsCheckbox.addEventListener("change", async () => {
    if (!settingsLoaded || !ensureSupabaseConfigured()) return;
    const newVal = settingParrainsCheckbox.checked;
    settingParrainsCheckbox.disabled = true;
    const { error } = await supabaseClient
      .from("site_settings")
      .upsert({ key: "parrains", enabled: newVal, updated_at: new Date().toISOString() }, { onConflict: "key" });
    settingParrainsCheckbox.disabled = false;
    if (error) {
      console.error(error);
      settingParrainsCheckbox.checked = !newVal;
      settingMsg.textContent = "Erreur lors de l'enregistrement : " + error.message;
      settingMsg.className = "form-msg show error";
      return;
    }
    settingMsg.textContent = newVal
      ? "✅ La page « Parrains » est de nouveau visible sur le site."
      : "✅ La page « Parrains » est masquée sur le site (lien retiré du menu).";
    settingMsg.className = "form-msg show success";
    setTimeout(() => {
      settingMsg.className = "form-msg";
    }, 4000);
  });

  // Avant la mise à jour 40, la question merch n'existait pas encore : une poignée de
  // réponses envoyées juste avant (mise à jour 38) ont pu choisir "🚫 Je ne veux pas de
  // merch" dans le champ taille de t-shirt, qui vaut alors littéralement "none" — on le
  // traite comme merch="rien" pour l'affichage, sans jamais réécrire les données en base.
  function effectiveMerch(p) {
    if (p.merch) return p.merch;
    if (p.tshirt_size === "none") return "rien";
    return null;
  }

  function renderStats(participants) {
    const yes = participants.filter((p) => p.attending === "yes").length;
    const maybe = participants.filter((p) => p.attending === "maybe").length;
    const no = participants.filter((p) => p.attending === "no").length;
    const sizes = {};
    participants.forEach((p) => {
      if (p.tshirt_size && p.tshirt_size !== "none") sizes[p.tshirt_size] = (sizes[p.tshirt_size] || 0) + 1;
    });
    const sizeStr = Object.keys(sizes).length
      ? Object.entries(sizes).map(([k, v]) => `${k}:${v}`).join(" · ")
      : "—";

    const merchTshirt = participants.filter((p) => effectiveMerch(p) === "tshirt").length;
    const merchPack = participants.filter((p) => effectiveMerch(p) === "pack").length;
    const merchRien = participants.filter((p) => effectiveMerch(p) === "rien").length;

    document.getElementById("stats").innerHTML = `
      <div class="stat"><div class="num">${participants.length}</div><div class="label">Réponses</div></div>
      <div class="stat"><div class="num">${yes}</div><div class="label">Présent·es</div></div>
      <div class="stat"><div class="num">${maybe}</div><div class="label">Peut-être</div></div>
      <div class="stat"><div class="num">${no}</div><div class="label">Absent·es</div></div>
      <div class="stat"><div class="num" style="font-size:1rem;">${sizeStr}</div><div class="label">T-shirts</div></div>
      <div class="stat"><div class="num" style="font-size:1rem;">👕 ${merchTshirt} · 🎁 ${merchPack} · 🚫 ${merchRien}</div><div class="label">Merch</div></div>
    `;
  }

  const TRANSPORT_LABELS = {
    "voiture-solo": "🚗 Voiture (seul·e)",
    "voiture-covoit": "🚙 Voiture, covoiturage possible",
    "covoit-cherche": "🙋 Cherche covoiturage",
    train: "🚆 Train",
    autre: "🚲 Autre",
  };

  function carLabel(p) {
    if (p.car === "yes") return `🚗 Oui${p.car_seats != null ? " (" + p.car_seats + " place" + (p.car_seats > 1 ? "s" : "") + ")" : ""}`;
    if (p.car === "no") return "🙅 Non";
    return "—";
  }

  const MERCH_LABELS = {
    tshirt: "👕 T-shirt seul",
    pack: "🎁 Pack complet",
    rien: "🚫 Rien",
  };

  const SLEEP_LABELS = {
    yes: "🤫 Calme",
    no: "😴 Peu importe",
  };

  // ---------- Édition manuelle des participants ----------
  // Même convention que pour les scores : pas de window.confirm() natif. La
  // suppression se fait en 2 clics (le bouton se transforme en demande de
  // confirmation puis redevient normal après quelques secondes si non confirmé).
  let editingParticipantId = null;
  let deleteArmedId = null;
  let deleteArmedTimeout = null;

  const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

  function selectEl(name, options, currentValue, { placeholder } = {}) {
    const select = document.createElement("select");
    select.name = name;
    if (placeholder) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = placeholder;
      select.appendChild(opt);
    }
    options.forEach(([value, label]) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      if (value === (currentValue || "")) opt.selected = true;
      select.appendChild(opt);
    });
    return select;
  }

  function renderParticipants(participants) {
    const tbody = document.querySelector("#participants-table tbody");
    tbody.innerHTML = "";
    participants.forEach((p) => {
      if (p.id === editingParticipantId) {
        tbody.appendChild(buildEditRow(p));
      } else {
        tbody.appendChild(buildDisplayRow(p));
      }
    });
  }

  function buildDisplayRow(p) {
    const tr = document.createElement("tr");
    const attendingLabel = { yes: "🙋 Oui", maybe: "🤔 Peut-être", no: "❌ Non" }[p.attending] || p.attending || "—";
    tr.innerHTML = `
      <td>${escapeHtml(p.name)}</td>
      <td>${p.email ? escapeHtml(p.email) : "—"}</td>
      <td>${p.phone ? escapeHtml(p.phone) : "—"}</td>
      <td>${attendingLabel}</td>
      <td>${MERCH_LABELS[effectiveMerch(p)] || effectiveMerch(p) || "—"}</td>
      <td>${p.tshirt_size && p.tshirt_size !== "none" ? p.tshirt_size : "—"}</td>
      <td>${p.arrival_time || "—"}</td>
      <td>${p.departure_time || "—"}</td>
      <td>${TRANSPORT_LABELS[p.transport] || p.transport || "—"}</td>
      <td>${carLabel(p)}</td>
      <td>${SLEEP_LABELS[p.sleep_quiet] || p.sleep_quiet || "—"}</td>
      <td>${p.comment ? escapeHtml(p.comment) : "—"}</td>
      <td>${p.created_at ? new Date(p.created_at).toLocaleString("fr-FR") : "—"}</td>
      <td></td>
    `;

    const tdActions = tr.lastElementChild;
    tdActions.style.whiteSpace = "nowrap";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-outline btn-icon";
    editBtn.title = "Modifier cette réponse";
    editBtn.textContent = "✏️";
    editBtn.addEventListener("click", () => {
      editingParticipantId = p.id;
      renderParticipants(lastParticipants);
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-outline btn-icon btn-danger-outline";
    delBtn.style.marginLeft = "6px";
    delBtn.title = "Supprimer cette réponse";
    delBtn.textContent = "🗑";
    if (p.id === deleteArmedId) {
      delBtn.textContent = "Confirmer ?";
      delBtn.classList.add("btn-danger-outline-armed");
    }
    delBtn.addEventListener("click", async () => {
      if (deleteArmedId !== p.id) {
        clearTimeout(deleteArmedTimeout);
        deleteArmedId = p.id;
        renderParticipants(lastParticipants);
        deleteArmedTimeout = setTimeout(() => {
          deleteArmedId = null;
          renderParticipants(lastParticipants);
        }, 4000);
        return;
      }
      clearTimeout(deleteArmedTimeout);
      deleteArmedId = null;
      delBtn.disabled = true;
      const { error } = await supabaseClient.from("participants").delete().eq("id", p.id);
      if (error) {
        console.error(error);
        delBtn.disabled = false;
        return;
      }
      lastParticipants = lastParticipants.filter((row) => row.id !== p.id);
      renderStats(lastParticipants);
      renderParticipants(lastParticipants);
    });

    tdActions.appendChild(editBtn);
    tdActions.appendChild(delBtn);
    return tr;
  }

  function buildEditRow(p) {
    const tr = document.createElement("tr");
    tr.className = "participant-edit-row";

    function td(el) {
      const cell = document.createElement("td");
      cell.appendChild(el);
      return cell;
    }
    function textInput(value) {
      const input = document.createElement("input");
      input.type = "text";
      input.value = value || "";
      input.className = "admin-edit-input";
      return input;
    }

    const nameInput = textInput(p.name);
    const emailInput = textInput(p.email);
    const phoneInput = textInput(p.phone);
    const attendingSelect = selectEl("attending", [
      ["yes", "🙋 Oui"], ["maybe", "🤔 Peut-être"], ["no", "❌ Non"],
    ], p.attending);
    const merchSelect = selectEl("merch", [
      ["tshirt", "👕 T-shirt seul"], ["pack", "🎁 Pack complet"], ["rien", "🚫 Rien"],
    ], effectiveMerch(p), { placeholder: "—" });
    const tshirtSelect = selectEl("tshirt_size", TSHIRT_SIZES.map((s) => [s, s]), p.tshirt_size === "none" ? "" : p.tshirt_size, { placeholder: "—" });
    const arrivalInput = document.createElement("input");
    arrivalInput.type = "time";
    arrivalInput.value = p.arrival_time || "";
    arrivalInput.className = "admin-edit-input";
    const departureInput = document.createElement("input");
    departureInput.type = "time";
    departureInput.value = p.departure_time || "";
    departureInput.className = "admin-edit-input";
    const transportSelect = selectEl("transport", Object.entries(TRANSPORT_LABELS), p.transport, { placeholder: "—" });
    const carSelect = selectEl("car", [["yes", "🚗 Oui"], ["no", "🙅 Non"]], p.car, { placeholder: "—" });
    const carSeatsInput = document.createElement("input");
    carSeatsInput.type = "number";
    carSeatsInput.min = "0";
    carSeatsInput.max = "8";
    carSeatsInput.value = p.car_seats != null ? p.car_seats : "";
    carSeatsInput.className = "admin-edit-input";
    carSeatsInput.style.width = "70px";
    const sleepSelect = selectEl("sleep_quiet", Object.entries(SLEEP_LABELS), p.sleep_quiet, { placeholder: "—" });
    const commentInput = document.createElement("textarea");
    commentInput.value = p.comment || "";
    commentInput.className = "admin-edit-input";
    commentInput.rows = 2;

    [nameInput, emailInput, phoneInput, attendingSelect, merchSelect, tshirtSelect, arrivalInput, departureInput, transportSelect, carSelect, carSeatsInput, sleepSelect, commentInput]
      .forEach((el) => tr.appendChild(td(el)));

    const tdCreated = document.createElement("td");
    tdCreated.className = "small";
    tdCreated.textContent = p.created_at ? new Date(p.created_at).toLocaleString("fr-FR") : "—";
    tr.appendChild(tdCreated);

    const tdActions = document.createElement("td");
    tdActions.style.whiteSpace = "nowrap";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn btn-outline btn-icon";
    saveBtn.title = "Enregistrer";
    saveBtn.textContent = "💾";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-outline btn-icon";
    cancelBtn.style.marginLeft = "6px";
    cancelBtn.title = "Annuler";
    cancelBtn.textContent = "✖";

    cancelBtn.addEventListener("click", () => {
      editingParticipantId = null;
      renderParticipants(lastParticipants);
    });

    saveBtn.addEventListener("click", async () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      const merchVal = merchSelect.value || null;
      const carVal = carSelect.value || null;
      const carSeatsVal = carVal === "yes" && carSeatsInput.value !== "" ? parseInt(carSeatsInput.value, 10) : null;
      const updates = {
        name,
        name_key: name.toLowerCase(),
        email: emailInput.value.trim() || null,
        phone: phoneInput.value.trim() || null,
        attending: attendingSelect.value,
        merch: merchVal,
        tshirt_size: merchVal && merchVal !== "rien" ? (tshirtSelect.value || null) : null,
        arrival_time: arrivalInput.value || null,
        departure_time: departureInput.value || null,
        transport: transportSelect.value || null,
        car: carVal,
        car_seats: carSeatsVal,
        sleep_quiet: sleepSelect.value || null,
        comment: commentInput.value.trim() || null,
      };
      saveBtn.disabled = true;
      cancelBtn.disabled = true;
      const original = saveBtn.textContent;
      saveBtn.textContent = "…";
      const { error } = await supabaseClient.from("participants").update(updates).eq("id", p.id);
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
      if (error) {
        console.error(error);
        saveBtn.textContent = "❌";
        setTimeout(() => { saveBtn.textContent = original; }, 1500);
        return;
      }
      Object.assign(p, updates);
      editingParticipantId = null;
      renderStats(lastParticipants);
      renderParticipants(lastParticipants);
    });

    tdActions.appendChild(saveBtn);
    tdActions.appendChild(cancelBtn);
    tr.appendChild(tdActions);
    return tr;
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
    const headers = ["Nom", "Email", "Téléphone", "Présence", "Merch", "T-shirt", "Arrivée", "Départ", "Transport", "Voiture", "Places libres", "Sommeil calme", "Commentaire", "Envoyé le"];
    const rows = lastParticipants.map((p) => [
      p.name,
      p.email || "",
      p.phone || "",
      p.attending,
      effectiveMerch(p) || "",
      p.tshirt_size && p.tshirt_size !== "none" ? p.tshirt_size : "",
      p.arrival_time || "",
      p.departure_time || "",
      p.transport || "",
      p.car || "",
      p.car_seats != null ? p.car_seats : "",
      p.sleep_quiet || "",
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
