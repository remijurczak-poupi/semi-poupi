document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("rsvp-form");
  const msg = document.getElementById("form-msg");
  const submitBtn = document.getElementById("submit-btn");
  const detailsBlock = document.getElementById("details-block");
  const attendingRadios = document.querySelectorAll('input[name="attending"]');
  const tshirtRadios = document.querySelectorAll('input[name="tshirt"]');

  function updateDetailsVisibility() {
    const selected = document.querySelector('input[name="attending"]:checked');
    const isComing = selected && selected.value !== "no";
    detailsBlock.style.display = isComing ? "" : "none";
    tshirtRadios.forEach((r) => (r.required = isComing));
  }
  attendingRadios.forEach((r) => r.addEventListener("change", updateDetailsVisibility));
  updateDetailsVisibility();

  function showMsg(text, type) {
    msg.textContent = text;
    msg.className = "form-msg show " + type;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!ensureSupabaseConfigured()) {
      showMsg("La base de données n'est pas encore branchée — réessaie un peu plus tard.", "error");
      return;
    }

    const name = document.getElementById("name").value.trim();
    const attending = form.querySelector('input[name="attending"]:checked')?.value;
    const tshirtEl = form.querySelector('input[name="tshirt"]:checked');
    const tshirt = tshirtEl ? tshirtEl.value : null;
    const arrival = document.getElementById("arrival").value || null;
    const departure = document.getElementById("departure").value || null;
    const comment = document.getElementById("comment").value.trim() || null;

    if (!name || !attending) {
      showMsg("Merci de remplir au moins ton nom et ta présence.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi en cours...";

    const payload = {
      name,
      name_key: name.toLowerCase(),
      attending,
      tshirt_size: attending === "no" ? null : tshirt,
      arrival_time: attending === "no" ? null : arrival,
      departure_time: attending === "no" ? null : departure,
      comment,
    };

    const { error } = await supabaseClient
      .from("participants")
      .upsert(payload, { onConflict: "name_key" });

    submitBtn.disabled = false;
    submitBtn.textContent = "Envoyer ma réponse";

    if (error) {
      console.error(error);
      showMsg("Oups, l'envoi a échoué (" + error.message + "). Réessaie ou préviens Rémi.", "error");
    } else {
      showMsg("Merci " + name + " ! Ta réponse est enregistrée 🎉 (tu peux revenir la modifier à tout moment)", "success");
      form.reset();
      updateDetailsVisibility();
    }
  });
});
