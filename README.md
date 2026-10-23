# buddy

A tiny ASCII companion that lives in your browser, inspired by the `/buddy` pet in Claude Code.

## Run it

No build step. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## How it works

- **Hatching is deterministic.** Your name is hashed (FNV-1a) and fed to a seeded PRNG (mulberry32), so the same name always hatches the same buddy.
- **12 species:** duck, cat, blob, owl, ghost, dragon, capybara, robot, axolotl, cactus, snail and octopus. Each has idle animation frames, random eyes and blinking.
- **Rarity:** common 60%, uncommon 25%, rare 10%, epic 4%, legendary 1%. Non-common buddies can wear hats, and 1% of buddies are ✦ shiny.
- **Stats:** DEBUGGING, PATIENCE, CHAOS, WISDOM and SNARK. Each buddy has one peak stat and one dump stat, and higher rarities get a higher floor.
- **Personality:** chat with your buddy. It picks up on topics (bugs, tests, deploys, refactors, being tired, thanks, greetings) and answers in the voice of its peak stat.
- **Care:** pet it (or click it), feed it, play, nap. Mood and energy drift down slowly while you're away.
- **Persistence:** state is kept in `localStorage`. *Release* forgets your buddy; hatching the same name brings it back.

## Files

- `buddy.js`: core logic (hashing, hatching, sprites, reactions). It doesn't touch the DOM and also loads under Node.
- `app.js`: UI, animation loop, actions and persistence.
- `index.html`, `style.css`: layout and theme (light and dark).
