document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("rsvp-form");
  const msg = document.getElementById("form-msg");
  const submitBtn = document.getElementById("submit-btn");
  const detailsBlock = document.getElementById("details-block");
  const attendingRadios = document.querySelectorAll('input[name="attending"]');
  const merchRadios = document.querySelectorAll('input[name="merch"]');
  const tshirtRadios = document.querySelectorAll('input[name="tshirt"]');
  const tshirtSizeField = document.getElementById("tshirt-size-field");
  const carRadios = document.querySelectorAll('input[name="car"]');
  const carSeatsField = document.getElementById("car-seats-field");
  const carSeatsInput = document.getElementById("car_seats");

  function updateDetailsVisibility() {
    const selected = document.querySelector('input[name="attending"]:checked');
    const isComing = selected && selected.value !== "no";
    detailsBlock.style.display = isComing ? "" : "none";
    merchRadios.forEach((r) => (r.required = isComing));
    updateTshirtSizeVisibility();
  }
  attendingRadios.forEach((r) => r.addEventListener("change", updateDetailsVisibility));
  updateDetailsVisibility();

  // La taille de t-shirt ne s'affiche/n'est requise que si la personne veut le t-shirt ou
  // le pack complet — pas si elle a choisi "Rien" (ou n'a pas encore répondu).
  function updateTshirtSizeVisibility() {
    const attendingSelected = document.querySelector('input[name="attending"]:checked');
    const isComing = attendingSelected && attendingSelected.value !== "no";
    const merchSelected = document.querySelector('input[name="merch"]:checked');
    const wantsTshirt = isComing && merchSelected && merchSelected.value !== "rien";
    tshirtSizeField.style.display = wantsTshirt ? "" : "none";
    tshirtRadios.forEach((r) => (r.required = wantsTshirt));
    if (!wantsTshirt) tshirtRadios.forEach((r) => (r.checked = false));
  }
  merchRadios.forEach((r) => r.addEventListener("change", updateTshirtSizeVisibility));

  // Le nombre de places ne s'affiche que si la personne a répondu "Oui" à la question voiture.
  function updateCarSeatsVisibility() {
    const selected = document.querySelector('input[name="car"]:checked');
    const hasCar = selected && selected.value === "yes";
    carSeatsField.style.display = hasCar ? "" : "none";
    if (!hasCar) carSeatsInput.value = "";
  }
  carRadios.forEach((r) => r.addEventListener("change", updateCarSeatsVisibility));
  updateCarSeatsVisibility();

  function showMsg(text, type) {
    msg.textContent = text;
    msg.className = "form-msg show " + type;
  }

  // Ne garde que les chiffres (et un éventuel + initial) pour que "06 12 34 56 78",
  // "06.12.34.56.78" et "0612345678" soient reconnus comme le même numéro.
  function normalizePhone(raw) {
    if (!raw) return null;
    const trimmed = raw.trim();
    const plus = trimmed.startsWith("+") ? "+" : "";
    const digits = trimmed.replace(/[^0-9]/g, "");
    return digits ? plus + digits : null;
  }

  // Échappe une valeur pour l'utiliser dans un filtre .or() de PostgREST
  // (virgules et parenthèses ont un sens spécial dans cette syntaxe).
  function escapeOrValue(v) {
    return String(v).replace(/[,()]/g, "");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!ensureSupabaseConfigured()) {
      showMsg("La base de données n'est pas encore branchée — réessaie un peu plus tard.", "error");
      return;
    }

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase() || null;
    const phone = normalizePhone(document.getElementById("phone").value);
    const attending = form.querySelector('input[name="attending"]:checked')?.value;
    const merchEl = form.querySelector('input[name="merch"]:checked');
    const merch = merchEl ? merchEl.value : null;
    const tshirtEl = form.querySelector('input[name="tshirt"]:checked');
    const tshirt = merch && merch !== "rien" && tshirtEl ? tshirtEl.value : null;
    const arrival = document.getElementById("arrival").value || null;
    const departure = document.getElementById("departure").value || null;
    const transportEl = form.querySelector('input[name="transport"]:checked');
    const transport = transportEl ? transportEl.value : null;
    const carEl = form.querySelector('input[name="car"]:checked');
    const car = carEl ? carEl.value : null;
    const carSeatsRaw = document.getElementById("car_seats").value;
    const carSeats = car === "yes" && carSeatsRaw !== "" ? parseInt(carSeatsRaw, 10) : null;
    const sleepEl = form.querySelector('input[name="sleep_quiet"]:checked');
    const sleepQuiet = sleepEl ? sleepEl.value : null;
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
      email,
      phone,
      attending,
      merch: attending === "no" ? null : merch,
      tshirt_size: attending === "no" ? null : tshirt,
      arrival_time: attending === "no" ? null : arrival,
      departure_time: attending === "no" ? null : departure,
      transport: attending === "no" ? null : transport,
      car: attending === "no" ? null : car,
      car_seats: attending === "no" ? null : carSeats,
      sleep_quiet: attending === "no" ? null : sleepQuiet,
      comment,
    };

    // Cherche une réponse déjà enregistrée par email, téléphone ou nom (dans cet
    // ordre de fiabilité) pour la mettre à jour plutôt que d'en créer une nouvelle.
    const orParts = [];
    if (email) orParts.push(`email.eq.${escapeOrValue(email)}`);
    if (phone) orParts.push(`phone.eq.${escapeOrValue(phone)}`);
    orParts.push(`name_key.eq.${escapeOrValue(name.toLowerCase())}`);

    const { data: existing, error: lookupError } = await supabaseClient
      .from("participants")
      .select("id")
      .or(orParts.join(","))
      .limit(1)
      .maybeSingle();

    let error;
    if (lookupError) {
      error = lookupError;
    } else if (existing) {
      ({ error } = await supabaseClient.from("participants").update(payload).eq("id", existing.id));
    } else {
      ({ error } = await supabaseClient.from("participants").insert(payload));
    }

    submitBtn.disabled = false;
    submitBtn.textContent = "Envoyer ma réponse";

    if (error) {
      console.error(error);
      showMsg("Oups, l'envoi a échoué (" + error.message + "). Réessaie ou préviens Rémi.", "error");
    } else {
      showMsg("Merci " + name + " ! Ta réponse est enregistrée 🎉 (tu peux revenir la modifier à tout moment, en renvoyant le formulaire avec le même email, téléphone ou nom)", "success");
      form.reset();
      updateDetailsVisibility();
      updateCarSeatsVisibility();
      updateTshirtSizeVisibility();
    }
  });
});
