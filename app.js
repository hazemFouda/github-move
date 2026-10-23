(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const STORE = "buddy:v1";

  let state = load();
  let buddy = state && Buddy.hatch(state.owner);
  let frame = 0;
  let sleepUntil = 0;
  let bubbleTimer = null;

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE)); } catch { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }
  const clamp = (n) => Math.max(0, Math.min(100, n));

  // Mood and energy drift down while you're away (about 1 point per 10 minutes).
  function decay() {
    const now = Date.now();
    const mins = (now - (state.at || now)) / 60000;
    state.mood = clamp(state.mood - mins / 10);
    state.energy = clamp(state.energy - mins / 12);
    state.at = now;
  }

  // ---------- hatch screen ----------
  const EGG = ["  .--.\n /    \\\n|      |\n \\____/", "  .--.\n / /\\ \\\n|  \\/  |\n \\____/", "  .  .\n / \\/ \\\n| ,  , |\n \\____/"];
  $("egg").textContent = EGG[0];

  $("hatch-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const owner = $("hatch-name").value.trim();
    if (!owner) return;
    const egg = $("egg");
    egg.classList.add("wobble");
    let step = 0;
    const t = setInterval(() => {
      egg.textContent = EGG[Math.min(++step, EGG.length - 1)];
      if (step >= 4) {
        clearInterval(t);
        egg.classList.remove("wobble");
        state = { owner, mood: 80, energy: 80, at: Date.now(), muted: false };
        buddy = Buddy.hatch(owner);
        save();
        showHome();
        say(`Hi ${owner}! I'm ${buddy.name}.`);
        openCard();
      }
    }, 450);
  });

  // ---------- home screen ----------
  function showHome() {
    $("hatch").hidden = true;
    $("home").hidden = false;
    ["btn-card", "btn-mute", "btn-release"].forEach((id) => ($(id).hidden = false));
    $("b-name").textContent = buddy.name;
    const r = $("b-rarity");
    r.textContent = (buddy.shiny ? "✦ shiny " : "") + buddy.rarity + " " + buddy.species;
    r.className = "rarity r-" + buddy.rarity;
    $("sprite").classList.toggle("shiny", buddy.shiny);
    $("btn-mute").textContent = state.muted ? "unmute" : "mute";
    decay();
    draw();
    meters();
  }

  function draw(opts) {
    const asleep = Date.now() < sleepUntil;
    $("sprite").textContent = Buddy.render(buddy, frame, Object.assign({ sleep: asleep }, opts));
  }

  function meters() {
    $("m-mood").value = state.mood;
    $("m-energy").value = state.energy;
  }

  function say(text, ms) {
    if (state.muted) return;
    const b = $("bubble");
    b.textContent = text;
    b.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => (b.hidden = true), ms || 4000);
  }

  function log(text, cls) {
    const li = document.createElement("li");
    li.textContent = text;
    if (cls) li.className = cls;
    const ol = $("log");
    ol.prepend(li);
    while (ol.children.length > 30) ol.lastChild.remove();
  }

  function hearts(n) {
    const box = $("hearts");
    for (let i = 0; i < n; i++) {
      const h = document.createElement("span");
      h.className = "heart";
      h.textContent = "♥";
      h.style.left = 40 + Math.random() * 20 + "%";
      h.style.top = 45 + Math.random() * 20 + "%";
      h.style.animationDelay = i * 0.12 + "s";
      box.appendChild(h);
      setTimeout(() => h.remove(), 1600);
    }
  }

  const ACTIONS = {
    pet() {
      state.mood = clamp(state.mood + 8);
      hearts(3);
      return ["*purrs*", "*leans into it*", "♥ ♥ ♥", "more please"];
    },
    feed() {
      if (state.energy > 95) return ["I'm stuffed!"];
      state.energy = clamp(state.energy + 20);
      state.mood = clamp(state.mood + 3);
      return ["nom nom", "*crunch*", "Tastes like semicolons.", "Delicious bytes."];
    },
    play() {
      if (state.energy < 15) return ["Too sleepy... maybe a nap?"];
      state.energy = clamp(state.energy - 12);
      state.mood = clamp(state.mood + 15);
      hearts(2);
      return ["Wheee!", "Again! Again!", "*zooms around the terminal*", "Tag, you're it!"];
    },
    nap() {
      sleepUntil = Date.now() + 6000;
      state.energy = clamp(state.energy + 30);
      return ["zzz…"];
    },
  };

  document.querySelectorAll("[data-act]").forEach((btn) =>
    btn.addEventListener("click", () => act(btn.dataset.act))
  );
  $("sprite").addEventListener("click", () => act("pet"));

  function act(name) {
    if (Date.now() < sleepUntil && name !== "nap") {
      say("zzz… (sleeping)");
      return;
    }
    decay();
    const lines = ACTIONS[name]();
    const line = lines[Math.floor(Math.random() * lines.length)];
    say(line);
    log(`${buddy.name}: ${line}`);
    meters();
    draw();
    save();
  }

  $("chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("chat");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    log(text, "you");
    decay();
    state.mood = clamp(state.mood + 2);
    const { topic, line } = Buddy.react(buddy, text);
    if (topic === "love") hearts(4);
    setTimeout(() => {
      say(line, 5000);
      log(`${buddy.name}: ${line}`);
    }, 350);
    meters();
    save();
  });

  // ---------- header buttons ----------
  function openCard() {
    $("card-sprite").textContent = Buddy.render(buddy, 0);
    $("card-sprite").classList.toggle("shiny", buddy.shiny);
    $("card-name").textContent = buddy.name;
    const meta = $("card-meta");
    meta.textContent = `${buddy.shiny ? "✦ shiny · " : ""}${buddy.rarity} ${buddy.species} · belongs to ${state.owner}`;
    meta.className = "r-" + buddy.rarity;
    const ul = $("card-stats");
    ul.innerHTML = "";
    for (const s of Buddy.STATS) {
      const li = document.createElement("li");
      const v = buddy.stats[s];
      li.innerHTML = `<span>${s}</span><span class="bar"><i style="width:${v}%"></i></span><span>${v}</span>`;
      ul.appendChild(li);
    }
    $("card-bio").textContent = Buddy.bio(buddy);
    $("card").showModal();
  }
  $("btn-card").addEventListener("click", openCard);

  $("btn-mute").addEventListener("click", () => {
    state.muted = !state.muted;
    $("btn-mute").textContent = state.muted ? "unmute" : "mute";
    if (state.muted) $("bubble").hidden = true;
    save();
  });

  $("btn-release").addEventListener("click", () => {
    if (!confirm(`Release ${buddy.name}? You can hatch them again with the same name.`)) return;
    try { localStorage.removeItem(STORE); } catch { /* ignore */ }
    location.reload();
  });

  // ---------- idle loop ----------
  setInterval(() => {
    if (!buddy || $("home").hidden) return;
    frame++;
    draw();
  }, 700);
  setInterval(() => {
    if (!buddy || $("home").hidden || Date.now() < sleepUntil) return;
    draw({ blink: true });
    setTimeout(() => draw(), 150);
  }, 3500);
  setInterval(() => {
    if (!buddy || $("home").hidden || Date.now() < sleepUntil || Math.random() < 0.6) return;
    decay();
    meters();
    save();
    if (state.mood < 30) say("*looks at you hopefully*");
    else if (state.energy < 20) say("*yawns*");
    else say(Buddy.react(buddy, "").line);
  }, 20000);

  if (state && state.owner) showHome();
})();
