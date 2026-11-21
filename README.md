# Shadow Lantern — A Stealth Heist in the Ember Manor

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![make.fun rank](https://make.fun/badge/best-stealth-game-20261121-1759/Daniikhwan/shadow-lantern/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![make.fun reward](https://make.fun/badge/best-stealth-game-20261121-1759/Daniikhwan/shadow-lantern/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

A complete, original top-down stealth game for
[make.fun's "Make the best stealth game" bounty](https://make.fun/bounty/best-stealth-game-20261121-1759).
You are the Lantern Thief: slip into the Ember Manor at night, steal all
three relics on each floor, and reach the exit — unseen.

## The game

Three floors, each harder than the last:

1. **I — The Garden Gate** — 3 guards, open beds and hedges to learn the ropes
2. **II — The Grand Hall** — 4 guards crossing the hall, dark corners to hide in
3. **III — The Vault** — 5 guards, one vault, and a ghost bonus for never being spotted

Guards patrol routes you can learn, pause at waypoints and sweep the room
with their lanterns. Their vision cones turn from gold to orange as they
grow suspicious, and red when they give chase. A near miss raises the
alarm — but breaking line of sight lets you recover: guards search the
last place they saw you, then return to patrol.

## How to play

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Run — fast, but loud (guards hear footsteps) |
| C | Sneak — slow, quiet, hard to spot |
| Click | Throw a pebble — the clink pulls guards off patrol |
| P / Esc | Pause · M mute · R retry · Enter confirm |

Dark floor hides you, bushes hide you better (unless a guard gets very
close), and crates block sight entirely. Running footsteps and landing
pebbles make noise rings guards investigate. Collect all 3 relics to
unlock the exit, then slip out. Finish fast and unspotted for the ghost
bonus.

## Tech

- Plain static files under `game/` — no build step, no library, no network
  request. Open `game/index.html` in desktop Chrome and play.
- Vanilla Canvas 2D with a raycast vision cone, a lantern-lighting pass,
  and fully synthesized WebAudio sound (footsteps, alarm stings, relic
  chimes, ambience) — no audio or image assets.
- Source split by job: `config.js` (tuning), `levels.js` (maps + patrols),
  `vision.js` (cones + line of sight), `guards.js` (guard AI),
  `player.js` (movement + noise), `audio.js` (synth), `game.js` (rules),
  `render.js` (drawing + HUD), `shots.js` (deterministic screenshots),
  `main.js` (input + loop).
- `node serve.ts` serves the game at http://localhost:8080.
- `?shot=cover|patrol|alert|exit` renders one deterministic frame of the
  real game — that is how the screenshots in `screenshots/` were taken.
