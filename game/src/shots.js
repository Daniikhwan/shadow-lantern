// Shadow Lantern — the screenshot scenes behind ?shot=cover|patrol|alert|exit.
// One job: stage a real frame of the real game, deterministically. Each
// scene places the thief and the guards, then plays the rules forward for
// a fixed number of steps at a fixed seed, so the frame is what a short
// game really looks like and the same seed always gives the same frame.
import { Game, GAME_STATE } from './game.js';
import { Renderer } from './render.js';
import { tileCentre } from './levels.js';
import { GUARD_STATE } from './guards.js';

const STEP = 1 / 60;

function stepFor(game, seconds, input) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) game.update(STEP, input || {});
}

function placePlayer(game, col, row, sneaking) {
  const centre = tileCentre(col, row);
  game.player.x = centre.x;
  game.player.y = centre.y;
  game.player.sneaking = !!sneaking;
}

function placeGuard(game, index, col, row, angle, state, suspicion) {
  const guard = game.guards[index];
  const centre = tileCentre(col, row);
  guard.x = centre.x;
  guard.y = centre.y;
  guard.angle = angle;
  if (state) guard.state = state;
  if (suspicion !== undefined) guard.suspicion = suspicion;
  guard.pauseTimer = 0;
  return guard;
}

/** The cover: a near miss in the garden — the thief crouched by the beds. */
function sceneCover(game) {
  game.startLevel(0);
  placePlayer(game, 8, 2, true);
  game.player.angle = Math.PI / 2;
  placeGuard(game, 0, 13, 3, Math.PI * 0.75, GUARD_STATE.CURIOUS, 52);
  placeGuard(game, 1, 21, 10, -Math.PI / 2, GUARD_STATE.PATROL, 0);
  game.toast = 'Stay out of the light…';
  game.toastTimer = 99;
  stepFor(game, 0.4, { sneak: true });
}

/** A quiet patrol: the thief hidden in the bushes, two cones sweeping. */
function scenePatrol(game) {
  game.startLevel(0);
  placePlayer(game, 3, 3, true);
  game.player.angle = Math.PI / 4;
  placeGuard(game, 0, 12, 3, 0, GUARD_STATE.PATROL, 0);
  placeGuard(game, 2, 21, 9, Math.PI, GUARD_STATE.PATROL, 0);
  game.toast = '';
  game.toastTimer = 0;
  stepFor(game, 1.2, { sneak: true });
}

/** The alarm: a guard has the thief dead to rights and gives chase. */
function sceneAlert(game) {
  game.startLevel(0);
  placePlayer(game, 12, 6, false);
  game.player.angle = Math.PI;
  game.player.running = true;
  const guard = placeGuard(game, 0, 10, 5, Math.PI / 3, GUARD_STATE.ALERT, 100);
  guard.lastSeen = { x: game.player.x, y: game.player.y };
  guard.lastSeenTimer = 0;
  placeGuard(game, 1, 21, 10, -Math.PI / 2, GUARD_STATE.CURIOUS, 48);
  game.toast = 'SPOTTED!';
  game.toastTimer = 99;
  stepFor(game, 0.25, { left: true, run: true });
}

/** The getaway: every relic taken, the exit open, the thief almost out. */
function sceneExit(game) {
  game.startLevel(2);
  for (const relic of game.relics) relic.taken = true;
  game.exitOpen = true;
  game.score = 2450;
  placePlayer(game, 19, 13, false);
  game.player.angle = Math.PI / 2;
  placeGuard(game, 3, 20, 6, Math.PI / 2, GUARD_STATE.PATROL, 0);
  placeGuard(game, 1, 12, 11, 0, GUARD_STATE.PATROL, 0);
  game.toast = 'All relics taken — reach the exit!';
  game.toastTimer = 99;
  stepFor(game, 0.6, { down: true });
}

const SCENES = { cover: sceneCover, patrol: scenePatrol, alert: sceneAlert, exit: sceneExit };

export function runShot(canvas, name, seed) {
  const game = new Game(0, seed || 7);
  const renderer = new Renderer(canvas);
  const scene = SCENES[name] || SCENES.cover;
  scene(game);
  game.state = GAME_STATE.PLAY;
  renderer.draw(game);
  return game;
}
