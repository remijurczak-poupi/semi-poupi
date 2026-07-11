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

  async function loadAll() {
    if (!ensureSupabaseConfigured()) return;

    const { data: participants, error: pErr } = await supabaseClient
      .from("participants")
      .select("*")
      .order("created_at", { ascending: false });

    if (pErr) {
      console.error(pErr);
      return;
    }

    lastParticipants = participants || [];
    renderStats(lastParticipants);
    renderParticipants(lastParticipants);
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
