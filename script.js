(() => {
  "use strict";

  // ═══════════════════════════════════════════════════════
  // API — unchanged contract with the FastAPI backend
  // ═══════════════════════════════════════════════════════
  const API_BASE = "https://mansik-santulan-score-6emw.onrender.com";

  // ═══════════════════════════════════════════════════════
  // Answer store — keys match StudentData exactly
  // ═══════════════════════════════════════════════════════
  const answers = {
    age: 21,
    gender: "",
    country: "",
    academic_level: "",
    most_used_platform: "",
    purpose_of_use: "",
    avg_daily_usage_hours: 5,
    daily_unlocks: 170,
    study_hours: 3,
    physical_activity_hours: 1.8,
    sleep_hours_per_night: 6.6,
    stress_level: "",
  };

  // ═══════════════════════════════════════════════════════
  // Flow definition
  // ═══════════════════════════════════════════════════════
  const FLOW = [
    { key: "welcome",     label: "",             cta: "Get started",  requires: [] },
    { key: "basics",      label: "Basics",       cta: "Continue",     requires: ["gender", "age"] },
    { key: "context",     label: "Context",      cta: "Continue",     requires: ["country", "academic_level"] },
    { key: "platform",    label: "Platform",     cta: "Continue",     requires: ["most_used_platform"] },
    { key: "purpose",     label: "Purpose",      cta: "Continue",     requires: ["purpose_of_use"] },
    { key: "screen-time", label: "Screen time",  cta: "Continue",     requires: [] },
    { key: "routine",     label: "Daily rhythm", cta: "Continue",     requires: [] },
    { key: "sleep",       label: "Sleep",        cta: "Continue",     requires: [] },
    { key: "stress",      label: "Stress",       cta: "See my score", requires: ["stress_level"] },
  ];
  const TOTAL_QUESTIONS = FLOW.length - 1; // welcome doesn't count

  const HINTS = {
    gender: "Pick one to continue",
    age: "Pick your age",
    country: "Choose or type your country",
    academic_level: "Pick your level",
    most_used_platform: "Pick the app you use most",
    purpose_of_use: "Pick your main reason",
    stress_level: "Pick a stress level",
  };

  // ═══════════════════════════════════════════════════════
  // Elements
  // ═══════════════════════════════════════════════════════
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const screens   = $$(".screen");
  const shell     = $("#shell");
  const railSteps = $("#rail-steps");
  const topbar    = $("#topbar");
  const actionbar = $("#actionbar");
  const backBtn   = $("#back-btn");
  const ctaBtn    = $("#cta-btn");
  const ctaLabel  = $("#cta-label");
  const abHint    = $("#ab-hint");
  const progress  = $("#progress");
  const stepCount = $("#step-count");

  let index = 0;

  const screenByKey = (key) => screens.find((s) => s.dataset.screen === key);

  // ═══════════════════════════════════════════════════════
  // Progress bar
  // ═══════════════════════════════════════════════════════
  progress.innerHTML = Array.from({ length: TOTAL_QUESTIONS }, () => "<span></span>").join("");
  const progressCells = $$("span", progress);

  railSteps.innerHTML = FLOW.slice(1)
    .map((s, i) => `<li data-i="${i + 1}"><span class="n">${i + 1}</span>${s.label}</li>`)
    .join("");
  const railCells = $$("li", railSteps);

  // ═══════════════════════════════════════════════════════
  // Errors
  // ═══════════════════════════════════════════════════════
  function setErr(field, msg) {
    const el = document.querySelector(`[data-err="${field}"]`);
    if (el) el.textContent = msg || "";
  }
  function clearErrs(scope) {
    $$(".err", scope || document).forEach((e) => (e.textContent = ""));
  }

  // ═══════════════════════════════════════════════════════
  // Generic single-choice groups
  // ═══════════════════════════════════════════════════════
  $$("[data-name]").forEach((group) => {
    const field = group.dataset.name;
    const opts = $$(".opt", group);
    if (!opts.length) return;

    opts.forEach((btn) => {
      btn.addEventListener("click", () => {
        opts.forEach((o) => {
          o.classList.remove("selected");
          o.setAttribute("aria-checked", "false");
        });
        btn.classList.add("selected");
        btn.setAttribute("aria-checked", "true");
        answers[field] = btn.dataset.value;
        setErr(field, "");
        refreshCTA();
      });
    });
  });

  // ═══════════════════════════════════════════════════════
  // Age wheel
  // ═══════════════════════════════════════════════════════
  const AGE_MIN = 10, AGE_MAX = 100, ITEM_W = 62;
  const ageTrack = $("#age-track");

  ageTrack.innerHTML =
    '<span class="wheel-pad"></span>' +
    Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) =>
      `<span class="wheel-item" data-age="${AGE_MIN + i}">${AGE_MIN + i}</span>`
    ).join("") +
    '<span class="wheel-pad"></span>';

  const ageItems = $$(".wheel-item", ageTrack);

  function paintWheel(activeIdx) {
    ageItems.forEach((it, i) => {
      const d = Math.abs(i - activeIdx);
      it.classList.toggle("active", d === 0);
      it.classList.toggle("near", d === 1);
    });
  }

  function commitAge(idx, silent) {
    const clamped = Math.max(0, Math.min(ageItems.length - 1, idx));
    const value = AGE_MIN + clamped;
    answers.age = value;
    ageTrack.setAttribute("aria-valuenow", String(value));
    paintWheel(clamped);
    if (!silent) setErr("age", "");
    refreshCTA();
  }

  let wheelTimer;
  ageTrack.addEventListener("scroll", () => {
    const idx = Math.round(ageTrack.scrollLeft / ITEM_W);
    paintWheel(Math.max(0, Math.min(ageItems.length - 1, idx)));
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => commitAge(idx), 90);
  }, { passive: true });

  function scrollAgeTo(idx, smooth) {
    ageTrack.scrollTo({ left: idx * ITEM_W, behavior: smooth ? "smooth" : "auto" });
  }

  ageItems.forEach((it, i) => it.addEventListener("click", () => scrollAgeTo(i, true)));

  ageTrack.addEventListener("keydown", (e) => {
    const cur = answers.age - AGE_MIN;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); scrollAgeTo(cur + 1, true); }
    if (e.key === "ArrowLeft"  || e.key === "ArrowDown") { e.preventDefault(); scrollAgeTo(cur - 1, true); }
  });

  // initial position (after layout settles)
  requestAnimationFrame(() => {
    scrollAgeTo(answers.age - AGE_MIN, false);
    paintWheel(answers.age - AGE_MIN);
  });

  // ═══════════════════════════════════════════════════════
  // Country combobox
  // ═══════════════════════════════════════════════════════
  const TOP_COUNTRIES = ["India", "USA", "Canada", "Australia", "UK", "Germany", "Mexico", "Turkey", "France"];
  const ALL_COUNTRIES = [
    ...TOP_COUNTRIES,
    "Bangladesh", "Belgium", "Brazil", "China", "Denmark", "Egypt", "Finland", "Greece",
    "Indonesia", "Ireland", "Israel", "Italy", "Japan", "Malaysia", "Netherlands",
    "New Zealand", "Nigeria", "Norway", "Pakistan", "Philippines", "Poland", "Portugal",
    "Russia", "Saudi Arabia", "Singapore", "South Africa", "South Korea", "Spain",
    "Sweden", "Switzerland", "Thailand", "UAE", "Vietnam", "Other",
  ];

  const countryInput = $("#country");
  const countryList  = $("#country-list");
  const countryChips = $("#country-chips");

  countryChips.innerHTML = TOP_COUNTRIES.slice(0, 6)
    .map((c) => `<button type="button" class="chip" data-country="${c}">${c}</button>`)
    .join("");

  function selectCountry(value) {
    answers.country = value;
    countryInput.value = value;
    closeList();
    $$(".chip", countryChips).forEach((c) =>
      c.classList.toggle("selected", c.dataset.country === value)
    );
    setErr("country", "");
    refreshCTA();
  }

  $$(".chip", countryChips).forEach((chip) =>
    chip.addEventListener("click", () => selectCountry(chip.dataset.country))
  );

  function closeList() {
    countryList.hidden = true;
    countryInput.setAttribute("aria-expanded", "false");
  }

  function openList(query) {
    const q = (query || "").trim().toLowerCase();
    const matches = ALL_COUNTRIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 40);
    if (!matches.length) return closeList();
    countryList.innerHTML = matches
      .map((c) => `<button type="button" class="combo-opt" data-country="${c}"><b>${c}</b></button>`)
      .join("");
    countryList.hidden = false;
    countryInput.setAttribute("aria-expanded", "true");
  }

  countryInput.addEventListener("focus", () => openList(countryInput.value));
  countryInput.addEventListener("input", () => {
    answers.country = countryInput.value.trim();
    $$(".chip", countryChips).forEach((c) =>
      c.classList.toggle("selected", c.dataset.country === answers.country)
    );
    openList(countryInput.value);
    setErr("country", "");
    refreshCTA();
  });
  countryList.addEventListener("mousedown", (e) => {
    const opt = e.target.closest(".combo-opt");
    if (opt) { e.preventDefault(); selectCountry(opt.dataset.country); }
  });
  countryInput.addEventListener("blur", () => setTimeout(closeList, 120));
  countryInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeList();
    if (e.key === "Enter") { e.preventDefault(); closeList(); }
  });

  // ═══════════════════════════════════════════════════════
  // Sliders
  // ═══════════════════════════════════════════════════════
  function bindSlider(id, readoutId, format, onChange) {
    const input = document.getElementById(id);
    const out = document.getElementById(readoutId);

    const sync = () => {
      const v = parseFloat(input.value);
      const pct = ((v - input.min) / (input.max - input.min)) * 100;
      input.style.setProperty("--pct", pct + "%");
      out.textContent = format(v);
      answers[id] = v;
      if (onChange) onChange(v);
    };

    input.addEventListener("input", sync);
    sync();
  }

  const one = (v) => v.toFixed(1);
  const int = (v) => String(Math.round(v));

  bindSlider("avg_daily_usage_hours", "rd-usage", one);
  bindSlider("daily_unlocks", "rd-unlocks", int);
  bindSlider("study_hours", "rd-study", one);
  bindSlider("physical_activity_hours", "rd-activity", one);

  // ═══════════════════════════════════════════════════════
  // Sleep dial
  // ═══════════════════════════════════════════════════════
  const ARC = 314; // ≈ π · r(100)
  const sleepArc  = $("#sleep-arc");
  const sleepNote = $("#sleep-note");

  function drawTicks(group, steps) {
    const cx = 130, cy = 148, rO = 100, rI = 88;
    group.innerHTML = Array.from({ length: steps + 1 }, (_, i) => {
      const a = Math.PI - (i / steps) * Math.PI;
      return `<line x1="${(cx + rO * Math.cos(a)).toFixed(1)}" y1="${(cy - rO * Math.sin(a)).toFixed(1)}" x2="${(cx + rI * Math.cos(a)).toFixed(1)}" y2="${(cy - rI * Math.sin(a)).toFixed(1)}"/>`;
    }).join("");
  }
  drawTicks($("#sleep-ticks"), 6);
  drawTicks($("#gauge-ticks"), 5);

  bindSlider("sleep_hours_per_night", "rd-sleep", one, (v) => {
    const pct = Math.max(0, Math.min(1, (v - 2) / 12));
    sleepArc.style.strokeDashoffset = String(ARC * (1 - pct));

    let note = "Most students land between 6 and 8 hours.", cls = "";
    if (v < 5)       { note = "That's well below what recovery needs — it usually shows up in the score."; cls = "bad"; }
    else if (v < 6.5){ note = "A little short. Even 30 extra minutes tends to help."; cls = "warn"; }
    else if (v <= 9) { note = "That's a healthy window. Nice."; cls = ""; }
    else             { note = "Longer than average — worth checking sleep quality, not just quantity."; cls = "warn"; }

    sleepArc.style.stroke = cls === "bad" ? "var(--bad)" : cls === "warn" ? "var(--warn)" : "var(--brand)";
    sleepNote.textContent = note;
    sleepNote.className = "sleep-note " + cls;
  });

  // ═══════════════════════════════════════════════════════
  // Navigation
  // ═══════════════════════════════════════════════════════
  function isComplete(step) {
    return step.requires.every((f) => {
      const v = answers[f];
      return typeof v === "number" ? !Number.isNaN(v) : String(v || "").trim() !== "";
    });
  }

  function refreshCTA() {
    const step = FLOW[index];
    if (!step) return;
    const ok = isComplete(step);
    ctaBtn.disabled = !ok;
    if (ok) {
      abHint.textContent = "";
    } else {
      const missing = step.requires.find((f) => {
        const v = answers[f];
        return typeof v === "number" ? Number.isNaN(v) : String(v || "").trim() === "";
      });
      abHint.textContent = HINTS[missing] || "";
    }
  }

  function goTo(key, opts = {}) {
    const target = screenByKey(key);
    const current = screens.find((s) => s.classList.contains("is-active"));
    if (current === target) return;

    if (current) {
      current.classList.remove("is-active");
      current.classList.toggle("is-back", !opts.back);
    }
    target.classList.remove("is-back");
    if (opts.back) target.classList.add("is-back");
    // force reflow so the entry transform applies
    void target.offsetWidth;
    target.classList.remove("is-back");
    target.classList.add("is-active");
    target.scrollTop = 0;
  }

  function renderStep(opts = {}) {
    const step = FLOW[index];
    goTo(step.key, opts);

    const isWelcome = index === 0;
    shell.dataset.phase = isWelcome ? "intro" : "form";
    topbar.dataset.hidden = isWelcome ? "true" : "false";
    backBtn.disabled = index <= 1;

    progressCells.forEach((c, i) => c.classList.toggle("done", i < index));
    railCells.forEach((c, i) => {
      c.classList.toggle("done", i + 1 < index);
      c.classList.toggle("current", i + 1 === index);
    });
    progress.setAttribute("aria-valuenow", String(Math.max(1, index)));
    stepCount.innerHTML = `${Math.max(1, index)}<i>/${TOTAL_QUESTIONS}</i>`;

    actionbar.dataset.hidden = "false";
    ctaLabel.textContent = step.cta;
    refreshCTA();
  }

  ctaBtn.addEventListener("click", () => {
    const step = FLOW[index];
    if (!isComplete(step)) {
      step.requires.forEach((f) => {
        const v = answers[f];
        const empty = typeof v === "number" ? Number.isNaN(v) : String(v || "").trim() === "";
        if (empty) setErr(f, HINTS[f] || "Required.");
      });
      return;
    }
    if (index < FLOW.length - 1) {
      index += 1;
      renderStep();
    } else {
      submit();
    }
  });

  backBtn.addEventListener("click", () => {
    if (index > 0) { index -= 1; renderStep({ back: true }); }
  });

  // ═══════════════════════════════════════════════════════
  // Submit — payload shape unchanged
  // ═══════════════════════════════════════════════════════
  const LOAD_LINES = [
    "Running your rhythm through the model…",
    "Weighing sleep against screen time…",
    "Comparing you to 5,000 students…",
    "Almost there…",
  ];
  let loadTimer;

  function buildPayload() {
    return {
      age: answers.age,
      gender: answers.gender,
      country: answers.country,
      academic_level: answers.academic_level,
      most_used_platform: answers.most_used_platform,
      purpose_of_use: answers.purpose_of_use,
      avg_daily_usage_hours: answers.avg_daily_usage_hours,
      daily_unlocks: Math.round(answers.daily_unlocks),
      study_hours: answers.study_hours,
      physical_activity_hours: answers.physical_activity_hours,
      sleep_hours_per_night: answers.sleep_hours_per_night,
      stress_level: answers.stress_level,
    };
  }

  function showLoading() {
    goTo("loading");
    shell.dataset.phase = "intro";
    topbar.dataset.hidden = "true";
    actionbar.dataset.hidden = "true";
    const copy = $("#load-copy");
    let i = 0;
    copy.textContent = LOAD_LINES[0];
    clearInterval(loadTimer);
    loadTimer = setInterval(() => {
      i = (i + 1) % LOAD_LINES.length;
      copy.style.opacity = "0";
      setTimeout(() => { copy.textContent = LOAD_LINES[i]; copy.style.opacity = "1"; }, 250);
    }, 1900);
  }

  function showError(title, copy) {
    clearInterval(loadTimer);
    $("#error-title").textContent = title;
    $("#error-copy").textContent = copy;
    goTo("error");
    shell.dataset.phase = "intro";
    topbar.dataset.hidden = "true";
    actionbar.dataset.hidden = "true";
  }

  function applyServerValidation(detail) {
    if (!Array.isArray(detail)) return false;
    let matched = false;
    detail.forEach((e) => {
      const field = Array.isArray(e.loc) ? e.loc[e.loc.length - 1] : null;
      if (field && document.querySelector(`[data-err="${field}"]`)) {
        setErr(field, e.msg || "Invalid value.");
        matched = true;
      }
    });
    return matched;
  }

  async function submit() {
    clearErrs();
    showLoading();

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      if (res.status === 422) {
        const body = await res.json().catch(() => null);
        const matched = body && applyServerValidation(body.detail);
        showError(
          "Check your answers",
          matched
            ? "The model rejected a few values — the affected steps are marked."
            : "The model rejected this submission. Please review your answers and try again."
        );
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        showError(
          "Prediction failed",
          body && typeof body.detail === "string"
            ? body.detail
            : `The server responded with status ${res.status}.`
        );
        return;
      }

      const data = await res.json();
      if (typeof data.predicted_mental_health_score !== "number") {
        showError("Unexpected response", "The server replied, but the score was missing or malformed.");
        return;
      }

      renderDashboard(data.predicted_mental_health_score);
    } catch {
      showError(
        "Can't reach the server",
        "We couldn't connect to the prediction service. It may be waking up from sleep — wait a moment and try again."
      );
    }
  }

  $("#retry-btn").addEventListener("click", () => {
    goTo("stress");
    index = FLOW.length - 1;
    renderStep({ back: true });
  });

  // ═══════════════════════════════════════════════════════
  // Dashboard
  // ═══════════════════════════════════════════════════════
  function bandFor(score) {
    if (score < 4.5) return {
      label: "Strained", tone: "bad",
      copy: "Your answers point to real strain right now. The habits below are the levers most within reach.",
    };
    if (score < 7) return {
      label: "Balanced", tone: "warn",
      copy: "Your rhythm holds together, with clear room to recover. Small, consistent shifts move this the most.",
    };
    return {
      label: "Strong", tone: "",
      copy: "Your habits point to a well-supported, resilient baseline. Worth protecting what's already working.",
    };
  }

  // Purely descriptive habit guidelines — the model returns only the score.
  const STATS = [
    { key: "sleep_hours_per_night",   icon: "ic-bed",   name: "Sleep",       unit: "h", max: 10,
      band: (v) => (v >= 7 && v <= 9 ? ["", "Healthy range"] : v >= 6 ? ["warn", "Slightly short"] : ["bad", "Too little"]) },
    { key: "avg_daily_usage_hours",   icon: "ic-phone", name: "Screen time", unit: "h", max: 12,
      band: (v) => (v <= 3 ? ["", "Well managed"] : v <= 6 ? ["warn", "Above average"] : ["bad", "Very high"]) },
    { key: "physical_activity_hours", icon: "ic-run",   name: "Activity",    unit: "h", max: 4,
      band: (v) => (v >= 1.5 ? ["", "Good movement"] : v >= 0.7 ? ["warn", "Could be more"] : ["bad", "Very low"]) },
    { key: "study_hours",             icon: "ic-book",  name: "Study",       unit: "h", max: 8,
      band: (v) => (v >= 2 && v <= 6 ? ["", "Sustainable"] : v < 2 ? ["warn", "On the light side"] : ["warn", "Heavy load"]) },
  ];

  function renderDashboard(score) {
    clearInterval(loadTimer);

    const clamped = Math.max(0, Math.min(10, score));
    const band = bandFor(clamped);

    $("#score-number").textContent = score.toFixed(1);
    const chip = $("#score-band");
    chip.textContent = band.label;
    chip.className = "band-chip " + band.tone;
    $("#score-context").textContent = band.copy;

    // stats
    $("#stat-grid").innerHTML = STATS.map((s) => {
      const v = answers[s.key];
      const [tone, tag] = s.band(v);
      const pct = Math.max(4, Math.min(100, (v / s.max) * 100));
      return `<div class="stat ${tone ? "is-" + tone : ""}">
        <div class="stat-top"><svg class="ico"><use href="#${s.icon}"/></svg><span class="stat-name">${s.name}</span></div>
        <div class="stat-val">${v.toFixed(1)}<small>${s.unit}</small></div>
        <div class="stat-track"><i style="width:0%"></i></div>
        <span class="stat-tag">${tag}</span>
      </div>`;
    }).join("");

    // insights
    const notes = [];
    if (answers.sleep_hours_per_night < 6.5)
      notes.push(["bad", `You're sleeping <b>${answers.sleep_hours_per_night.toFixed(1)}h</b>. Getting to 7 is usually the single highest-leverage change.`]);
    if (answers.avg_daily_usage_hours > 6)
      notes.push(["bad", `<b>${answers.avg_daily_usage_hours.toFixed(1)}h</b> a day on ${answers.most_used_platform} is well above the 5h student average.`]);
    else if (answers.avg_daily_usage_hours > 4)
      notes.push(["warn", `Screen time sits around the student average — trimming an hour tends to show up quickly.`]);
    if (answers.daily_unlocks > 220)
      notes.push(["warn", `<b>${Math.round(answers.daily_unlocks)} unlocks</b> a day means roughly one every four waking minutes.`]);
    if (answers.physical_activity_hours < 1)
      notes.push(["warn", `Under an hour of movement a day. Even a 20-minute walk counts.`]);
    if (answers.stress_level === "High" || answers.stress_level === "Very High")
      notes.push(["bad", `You reported <b>${answers.stress_level.toLowerCase()}</b> stress — the strongest single signal in this model.`]);
    if (answers.physical_activity_hours >= 1.5 && answers.sleep_hours_per_night >= 7)
      notes.push(["", `Sleep and movement are both in a healthy range. That's the foundation most students are missing.`]);
    if (!notes.length)
      notes.push(["", `Nothing stands out as a problem — your inputs sit close to healthy ranges across the board.`]);

    $("#insight-list").innerHTML = notes
      .map(([tone, text]) => `<li class="${tone}"><span>${text}</span></li>`)
      .join("");

    goTo("result");
    shell.dataset.phase = "intro";
    topbar.dataset.hidden = "true";
    actionbar.dataset.hidden = "true";

    // animate gauge + bars after paint
    requestAnimationFrame(() => {
      setTimeout(() => {
        $("#gauge-fill").style.strokeDashoffset = String(ARC * (1 - clamped / 10));
        $$("#stat-grid .stat-track i").forEach((bar, i) => {
          const s = STATS[i];
          bar.style.width = Math.max(4, Math.min(100, (answers[s.key] / s.max) * 100)) + "%";
        });
      }, 120);
    });
  }

  $("#restart-btn").addEventListener("click", () => {
    index = 0;
    renderStep({ back: true });
  });

  // ═══════════════════════════════════════════════════════
  // Boot
  // ═══════════════════════════════════════════════════════
  renderStep();
})();
