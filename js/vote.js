document.addEventListener("DOMContentLoaded", () => {
  const optionsList = document.getElementById("options-list");
  const voterNameInput = document.getElementById("voter-name");
  const proposeForm = document.getElementById("propose-form");
  const voteMsg = document.getElementById("vote-msg");

  function showMsg(text, type) {
    voteMsg.textContent = text;
    voteMsg.className = "form-msg show " + type;
  }

  function getVoterKey() {
    const name = voterNameInput.value.trim();
    return name ? name.toLowerCase() : null;
  }

  async function loadAndRender() {
    if (!ensureSupabaseConfigured()) {
      optionsList.innerHTML = '<p class="small center">La base de données n\'est pas encore branchée.</p>';
      return;
    }

    const [{ data: options, error: optErr }, { data: votes, error: voteErr }] = await Promise.all([
      supabaseClient.from("team_name_options").select("*").order("created_at", { ascending: true }),
      supabaseClient.from("team_name_votes").select("*"),
    ]);

    if (optErr || voteErr) {
      console.error(optErr, voteErr);
      optionsList.innerHTML = '<p class="small center">Erreur de chargement des votes.</p>';
      return;
    }

    const tally = {};
    (votes || []).forEach((v) => {
      tally[v.option_id] = (tally[v.option_id] || 0) + 1;
    });
    const totalVotes = (votes || []).length;
    const myVoterKey = getVoterKey();
    const myVote = myVoterKey ? (votes || []).find((v) => v.voter_key === myVoterKey) : null;

    if (!options || options.length === 0) {
      optionsList.innerHTML = '<p class="small center">Aucune proposition pour l\'instant — sois le premier à en ajouter une !</p>';
      return;
    }

    optionsList.innerHTML = "";
    options
      .slice()
      .sort((a, b) => (tally[b.id] || 0) - (tally[a.id] || 0))
      .forEach((opt) => {
        const count = tally[opt.id] || 0;
        const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
        const isMine = myVote && myVote.option_id === opt.id;

        const row = document.createElement("div");
        row.className = "vote-option";
        row.innerHTML = `
          <div class="vote-option-label">
            <strong>${escapeHtml(opt.label)}</strong> ${isMine ? '<span class="badge badge-blue">Ton vote</span>' : ""}
            <div class="bar-wrap"><div class="bar" style="width:${pct}%"></div></div>
          </div>
          <div class="vote-count">${count} vote${count !== 1 ? "s" : ""}</div>
          <button class="btn ${isMine ? "btn-outline" : "btn-primary"}" data-option-id="${opt.id}">
            ${isMine ? "Voté ✓" : "Voter"}
          </button>
        `;
        optionsList.appendChild(row);
      });

    optionsList.querySelectorAll("button[data-option-id]").forEach((btn) => {
      btn.addEventListener("click", () => castVote(btn.getAttribute("data-option-id")));
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  async function castVote(optionId) {
    const name = voterNameInput.value.trim();
    if (!name) {
      showMsg("Indique ton prénom en haut de page avant de voter.", "error");
      voterNameInput.focus();
      return;
    }
    const { error } = await supabaseClient.from("team_name_votes").upsert(
      {
        voter_name: name,
        voter_key: name.toLowerCase(),
        option_id: optionId,
      },
      { onConflict: "voter_key" }
    );
    if (error) {
      console.error(error);
      showMsg("Le vote a échoué (" + error.message + ").", "error");
      return;
    }
    showMsg("Vote enregistré, merci " + name + " !", "success");
    loadAndRender();
  }

  proposeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!ensureSupabaseConfigured()) return;
    const input = document.getElementById("new-option");
    const label = input.value.trim();
    const proposer = voterNameInput.value.trim();
    if (!label) return;

    const { error } = await supabaseClient.from("team_name_options").insert({
      label,
      proposed_by: proposer || null,
    });
    if (error) {
      console.error(error);
      showMsg("Impossible d'ajouter ce nom (" + error.message + ").", "error");
      return;
    }
    input.value = "";
    showMsg('"' + label + '" a été ajouté à la liste !', "success");
    loadAndRender();
  });

  voterNameInput.addEventListener("change", loadAndRender);

  loadAndRender();
});
