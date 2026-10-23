// Buddy core: deterministic hatching, sprites, and reactions.
// No DOM access here, so it also runs under Node for testing.
(function (root) {
  "use strict";

  // FNV-1a 32-bit hash of a string.
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // mulberry32 PRNG: small, fast, good enough for pets.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

  function weighted(r, table) {
    const total = table.reduce((s, [, w]) => s + w, 0);
    let x = r() * total;
    for (const [v, w] of table) {
      if ((x -= w) < 0) return v;
    }
    return table[table.length - 1][0];
  }

  const RARITIES = [
    ["common", 60],
    ["uncommon", 25],
    ["rare", 10],
    ["epic", 4],
    ["legendary", 1],
  ];
  const RARITY_FLOOR = { common: 5, uncommon: 15, rare: 25, epic: 35, legendary: 50 };

  // {E} is replaced with the eye character. Frame 0 is idle, frame 1 is the bob.
  const SPECIES = {
    duck: [
      "   __\n <({E} )___\n  ( ._>  /\n   `---'",
      "   __\n <({E} )___\n  ( ._>  /\n   `--~'",
    ],
    cat: [
      " /\\_/\\\n( {E} {E} )\n > ^ <\n(_)-(_)",
      " /\\_/\\\n( {E} {E} )\n > ^ <\n (_)(_)",
    ],
    blob: [
      "  .---.\n ( {E} {E} )\n (  ~  )\n  `---'",
      "  .---.\n ( {E} {E} )\n(   ~   )\n `-----'",
    ],
    owl: [
      " ,___,\n ({E},{E})\n /)  )\n--\"-\"--",
      " ,___,\n ({E},{E})\n (  (\\\n--\"-\"--",
    ],
    ghost: [
      "  .-.\n ({E} {E})\n |   |\n '~~~'",
      "  .-.\n ({E} {E})\n |   |\n '~^~'",
    ],
    dragon: [
      "   /\\_\n  ({E} {E}\\__\n  /  vv \\_>\n ^^    ^^",
      "   /\\_\n  ({E} {E}\\__\n  /  vv \\_~\n  ^^  ^^",
    ],
    capybara: [
      "  ____\n /{E}  {E}\\___\n(  ..      )\n `-'`-'`-'`",
      "  ____\n /{E}  {E}\\___\n(  ..      )\n  `-'`-'`-'",
    ],
    robot: [
      " [=====]\n |{E} _ {E}|\n |_____|\n  d   b",
      " [=:===]\n |{E} _ {E}|\n |_____|\n  b   d",
    ],
    axolotl: [
      "}\\ ___ /{\n  ({E} {E})\n  ( w )\n  /   \\",
      "{\\ ___ /}\n  ({E} {E})\n  ( w )\n  \\   /",
    ],
    cactus: [
      "   _\n _|{E}{E}|_\n| |  | |\n  |__|",
      "   _\n  |{E}{E}|_\n_|  | |\n  |__|",
    ],
    snail: [
      "    @@\n   @  @   {E} {E}\n    @@___/ /\n  ~~~~~~~~~",
      "    @@\n   @  @  {E} {E}\n    @@__/ /\n ~~~~~~~~~~",
    ],
    octopus: [
      "  .---.\n ( {E} {E} )\n  )   (\n /(/|\\)\\",
      "  .---.\n ( {E} {E} )\n  )   (\n \\(\\|/)/",
    ],
  };

  const EYES = ["o", "•", "°", "^", "x", "@", "-", "◉", "ʘ"];
  const HATS = {
    none: "",
    crown: "  \\^^^/",
    tophat: "  _|_|_",
    beanie: "  (___)",
    halo: "  (   )",
    propeller: "  -+-",
    wizard: "   /^\\",
  };

  const STATS = ["DEBUGGING", "PATIENCE", "CHAOS", "WISDOM", "SNARK"];

  const NAME_A = ["Pip", "Mo", "Bix", "Lu", "Ziggy", "Nim", "Tofu", "Wren", "Kip", "Dot", "Juno", "Fig", "Sprocket", "Mochi", "Quill", "Rune"];
  const NAME_B = ["", "", "", "bert", "o", "let", "kins", "ster", "ly", "-9000"];

  function hatch(owner) {
    const seed = hash(String(owner).trim().toLowerCase() + ":buddy");
    const r = rng(seed);

    const rarity = weighted(r, RARITIES);
    const species = pick(r, Object.keys(SPECIES));
    const eye = pick(r, EYES);
    const hat = rarity === "common" ? "none" : pick(r, Object.keys(HATS));
    const shiny = r() < 0.01;

    // One peak stat, one dump stat, the rest scattered above the rarity floor.
    const floor = RARITY_FLOOR[rarity];
    const peak = Math.floor(r() * STATS.length);
    let dump = Math.floor(r() * (STATS.length - 1));
    if (dump >= peak) dump++;
    const stats = {};
    STATS.forEach((s, i) => {
      if (i === peak) stats[s] = Math.min(100, floor + 50 + Math.floor(r() * 30));
      else if (i === dump) stats[s] = Math.max(1, floor - 10 + Math.floor(r() * 15));
      else stats[s] = floor + Math.floor(r() * 40);
    });

    const name = pick(r, NAME_A) + pick(r, NAME_B);

    return { owner, seed, name, species, rarity, eye, hat, shiny, stats, peak: STATS[peak], dump: STATS[dump] };
  }

  function render(b, frame, opts) {
    opts = opts || {};
    const frames = SPECIES[b.species];
    const eye = opts.blink ? "-" : opts.sleep ? "u" : b.eye;
    let art = frames[frame % frames.length].split("{E}").join(eye);
    const hat = HATS[b.hat];
    if (hat) art = hat + "\n" + art;
    if (opts.sleep) art = "      z Z\n" + art;
    return art;
  }

  function bio(b) {
    const traits = {
      DEBUGGING: "can smell an off-by-one from across the room",
      PATIENCE: "will wait out any build, however long",
      CHAOS: "has knocked over at least one production server",
      WISDOM: "speaks rarely and only about root causes",
      SNARK: "has opinions about your variable names",
    };
    const weak = {
      DEBUGGING: "still thinks console.log is a lifestyle",
      PATIENCE: "taps the desk when tests take over 2 seconds",
      CHAOS: "deeply uncomfortable with merge conflicts",
      WISDOM: "once mass-renamed a file to 'final_final2'",
      SNARK: "too polite to mention your bugs",
    };
    return `A ${b.rarity} ${b.species} who ${traits[b.peak]}, but ${weak[b.dump]}.`;
  }

  // Keyword-driven reactions, flavored by the buddy's strongest stat.
  const TOPICS = [
    [/\b(bug|error|crash|broken|exception|fail(ed|ing)?|undefined|null)\b/i, "bug"],
    [/\b(test|tests|spec|ci|green)\b/i, "test"],
    [/\b(deploy|ship|release|prod|production|merge)\b/i, "ship"],
    [/\b(refactor|clean|rename|simplify)\b/i, "refactor"],
    [/\b(tired|sleep|late|exhausted|break)\b/i, "tired"],
    [/\b(thanks|thank you|good (boy|girl|buddy)|love you|nice)\b/i, "love"],
    [/\b(hi|hello|hey|yo|morning)\b/i, "hi"],
  ];

  const LINES = {
    bug: {
      DEBUGGING: ["Check the line above the one you're staring at.", "It's always the cache. Or DNS. Probably the cache."],
      PATIENCE: ["Breathe. Read the stack trace slowly.", "We'll find it. Bugs can't hide forever."],
      CHAOS: ["Have you tried deleting node_modules? And then the repo?", "Ship it. The bug is a feature now."],
      WISDOM: ["The bug is in the assumption, not the code.", "What changed since it last worked?"],
      SNARK: ["Bold of you to assume it ever worked.", "Ah yes, the classic 'works on my machine'."],
    },
    test: {
      DEBUGGING: ["Add a test for the edge case first.", "Red, green, refactor. In that order."],
      PATIENCE: ["Let the suite finish. I'll wait with you.", "Slow tests are still tests."],
      CHAOS: ["Tests are just suggestions.", "What if we tested... in production?"],
      WISDOM: ["A failing test is a gift.", "Test behavior, not implementation."],
      SNARK: ["Coverage: 100%. Assertions: 0.", "Did you skip that one? I saw that."],
    },
    ship: {
      DEBUGGING: ["Check the logs right after it lands.", "Got a rollback plan?"],
      PATIENCE: ["No rush. Friday deploys can wait till Monday.", "One more review won't hurt."],
      CHAOS: ["YOLO. Push to main.", "Deploy on Friday at 4:59pm. Live a little."],
      WISDOM: ["Small releases, small fires.", "The best deploy is a boring deploy."],
      SNARK: ["Bold. I'll be over here with popcorn.", "Sure, what could possibly go wrong."],
    },
    refactor: {
      DEBUGGING: ["Keep the tests green between every step.", "Rename first, move second."],
      PATIENCE: ["One function at a time.", "Leave the campsite a little cleaner."],
      CHAOS: ["Rewrite it in Rust.", "Delete everything and see what screams."],
      WISDOM: ["Make the change easy, then make the easy change.", "Less code, fewer bugs."],
      SNARK: ["'Quick refactor.' Famous last words.", "Ah, rearranging deck chairs."],
    },
    tired: {
      any: ["Go get some water. I'll guard the terminal.", "Bugs look smaller after sleep.", "Stretch break? I'll stretch too."],
    },
    love: {
      any: ["♥", "*happy {S} noises*", "You're my favorite human.", "*wiggles*"],
    },
    hi: {
      any: ["Hi! Ready to build something?", "Oh hey! Missed you.", "*waves a tiny {S} appendage*"],
    },
    idle: {
      any: ["...", "*hums*", "What are we working on?", "*watches the cursor blink*", "I believe in you.", "*stares into the void*"],
    },
  };

  function react(b, text) {
    let topic = "idle";
    for (const [re, t] of TOPICS) {
      if (re.test(text)) { topic = t; break; }
    }
    const set = LINES[topic];
    const pool = set.any || set[b.peak];
    const line = pool[Math.floor(Math.random() * pool.length)];
    return { topic, line: line.replace("{S}", b.species) };
  }

  const api = { hash, rng, hatch, render, bio, react, SPECIES, STATS, RARITIES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Buddy = api;
})(this);
