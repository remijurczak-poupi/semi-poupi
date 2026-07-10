document.addEventListener("DOMContentLoaded", () => {
  const gate = document.getElementById("gate");
  const dashboard = document.getElementById("dashboard");
  const unlockBtn = document.getElementById("unlock-btn");
  const passInput = document.getElementById("admin-pass");
  const gateMsg = document.getElementById("gate-msg");

  function unlock() {
    gate.style.display = "none";
    dashboard.style.display = "";
    loadAll();
  }

  if (sessionStorage.getItem("poupi_admin_ok") === "1") {
    unlock();
  }

  unlockBtn.addEventListener("click", tryUnlock);
  passInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryUnlock();
  });

  function tryUnlock() {
    if (passInput.value === ADMIN_PASSWORD) {
      sessionStorage.setItem("poupi_admin_ok", "1");
      unlock();
    } else {
      gateMsg.textContent = "Mot de passe incorrect.";
      gateMsg.className = "form-msg show error";
    }
  }

  document.getElementById("refresh-btn").addEventListener("click", loadAll);
  document.getElementById("export-btn").addEventListener("click", exportCsv);

  let lastParticipants = [];

  async function loadAll() {
    if (!ensureSupabaseConfigured()) return;

    const [{ data: participants, error: pErr }, { data: options }, { data: votes }] = await Promise.all([
      supabaseClient.from("participants").select("*").order("created_at", { ascending: false }),
      supabaseClient.from("team_name_options").select("*"),
      supabaseClient.from("team_name_votes").select("*"),
    ]);

    if (pErr) {
      console.error(pErr);
      return;
    }

    lastParticipants = participants || [];
    renderStats(lastParticipants);
    renderParticipants(lastParticipants);
    renderVotes(options || [], votes || []);
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

  function renderVotes(options, votes) {
    const tally = {};
    votes.forEach((v) => (tally[v.option_id] = (tally[v.option_id] || 0) + 1));
    const tbody = document.querySelector("#votes-table tbody");
    tbody.innerHTML = "";
    options
      .slice()
      .sort((a, b) => (tally[b.id] || 0) - (tally[a.id] || 0))
      .forEach((opt) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(opt.label)}</td>
          <td>${tally[opt.id] || 0}</td>
          <td>${opt.proposed_by ? escapeHtml(opt.proposed_by) : "—"}</td>
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
