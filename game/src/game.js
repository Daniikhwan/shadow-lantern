// Shadow Lantern — the game itself: state, rules and scoring.
// One job: own the level, the thief, the guards, the relics and the clock,
// and decide when a level is won, lost or ghosted. Rendering lives in
// render.js; input lives in main.js; this file only runs the rules.
import { LEVELS, findTiles, tileCentre, tileAt, isDarkTile, isBushTile } from './levels.js';
import { TILE, PLAY_X, PLAY_Y } from './config.js';
import { Guard, GUARD_STATE } from './guards.js';
import { Player } from './player.js';
import { SoundBank } from './audio.js';
import { mulberry32 } from './rng.js';

export const GAME_STATE = {
  TITLE: 'title',
  PLAY: 'play',
  PAUSED: 'paused',
  CAUGHT: 'caught',
  LEVEL_DONE: 'levelDone',
  WON: 'won',
};

export class Game {
  constructor(levelIndex, seed) {
    this.levelIndex = levelIndex;
    this.level = LEVELS[levelIndex];
    this.rng = mulberry32(seed || 20261122 + levelIndex * 7919);
    this.state = GAME_STATE.TITLE;
    this.time = 0;
    this.score = 0;
    this.totalScore = 0;
    this.alertsRaised = 0;
    this.timesSeen = 0;
    this.ghost = true;
    this.sound = new SoundBank();
    this.noises = [];
    this.rings = [];
    this.toast = '';
    this.toastTimer = 0;
    this.levelStartScore = 0;
    this.resetLevel();
  }

  resetLevel() {
    const level = this.level;
    const playerTile = findTiles(level, 'P')[0];
    this.player = new Player(playerTile);
    const guardTiles = findTiles(level, 'G');
    this.guards = guardTiles.map((tile, i) => new Guard(level, tile, level.patrols[i]));
    this.relics = findTiles(level, 'R').map((tile) => {
      const centre = tileCentre(tile.col, tile.row);
      return { ...centre, taken: false, shimmer: this.rng() * Math.PI * 2 };
    });
    this.exitTile = findTiles(level, 'E')[0];
    this.exitCentre = tileCentre(this.exitTile.col, this.exitTile.row);
    this.exitOpen = false;
    this.time = 0;
    this.alertsRaised = 0;
    this.timesSeen = 0;
    this.ghost = true;
    this.noises = [];
    this.rings = [];
    this.toast = level.name;
    this.toastTimer = 3.2;
    this.levelStartScore = this.totalScore;
  }

  get relicsLeft() {
    return this.relics.filter((r) => !r.taken).length;
  }

  get alertLevel() {
    let max = 0;
    for (const guard of this.guards) max = Math.max(max, guard.suspicion);
    return max;
  }

  get anyAlert() {
    return this.guards.some((g) => g.state === GUARD_STATE.ALERT);
  }

  start() {
    this.sound.ensure();
    this.state = GAME_STATE.PLAY;
  }

  startLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.resetLevel();
    this.state = GAME_STATE.PLAY;
  }

  togglePause() {
    if (this.state === GAME_STATE.PLAY) this.state = GAME_STATE.PAUSED;
    else if (this.state === GAME_STATE.PAUSED) this.state = GAME_STATE.PLAY;
  }

  /** Title-screen life: guards patrol while the thief waits off-stage. */
  updateAttract(dt) {
    const dummy = { x: -1000, y: -1000, sneaking: false, running: false };
    const context = {
      player: dummy,
      noises: [],
      onFootstep: () => {},
      onAlarm: () => {},
    };
    for (const guard of this.guards) guard.update(dt, context);
  }

  update(dt, input) {
    if (this.state !== GAME_STATE.PLAY) return;
    this.time += dt;
    if (this.toastTimer > 0) this.toastTimer -= dt;
    const player = this.player;
    const events = {
      onStep: (running) => this.sound.footstep(running, false),
      onNoise: (noise) => {
        this.noises.push({ ...noise, ttl: 0.9 });
        this.rings.push({ x: noise.x, y: noise.y, radius: 6, maxRadius: noise.radius, ttl: 0.7 });
      },
      onPebbleLand: () => this.sound.pebbleLand(),
    };
    player.update(dt, input, this.level, events);
    if (input.pebble) {
      if (player.pebbleCount > 0 && player.throwPebble(input.pebble.x, input.pebble.y)) this.sound.pebbleThrow();
      input.pebble = null;
    }
    const context = {
      player,
      noises: this.noises,
      onFootstep: (guard) => this.sound.footstep(false, true),
      onAlarm: (guard) => {
        this.alertsRaised += 1;
        this.timesSeen += 1;
        this.ghost = false;
        this.sound.alarm();
        this.toast = 'SPOTTED!';
        this.toastTimer = 1.6;
      },
    };
    for (const guard of this.guards) {
      const before = guard.state;
      guard.update(dt, context);
      if (before !== GUARD_STATE.CURIOUS && guard.state === GUARD_STATE.CURIOUS) this.sound.suspicious();
      if (guard.caughtPlayer) {
        this.state = GAME_STATE.CAUGHT;
        this.sound.caught();
        return;
      }
    }
    this.noises = this.noises.filter((n) => (n.ttl -= dt) > 0);
    this.rings = this.rings.filter((r) => (r.ttl -= dt) > 0);
    for (const ring of this.rings) ring.radius += (ring.maxRadius - ring.radius) * dt * 4;
    for (const relic of this.relics) {
      if (relic.taken) continue;
      relic.shimmer += dt * 3;
      if (Math.hypot(player.x - relic.x, player.y - relic.y) < 26) {
        relic.taken = true;
        this.score += 150;
        this.sound.pickup();
        this.toast = this.relicsLeft === 0 ? 'All relics taken — reach the exit!' : `Relic taken (${3 - this.relicsLeft}/3)`;
        this.toastTimer = 2;
        if (this.relicsLeft === 0) this.exitOpen = true;
      }
    }
    if (this.exitOpen && Math.hypot(player.x - this.exitCentre.x, player.y - this.exitCentre.y) < 30) {
      const timeBonus = Math.max(0, Math.round((this.level.par - this.time) * 4));
      const ghostBonus = this.ghost ? 300 : 0;
      const alertPenalty = this.alertsRaised * 150;
      this.score += 1000 + timeBonus + ghostBonus - alertPenalty;
      this.totalScore += this.score - this.levelStartScore;
      this.levelClear = { timeBonus, ghostBonus, alertPenalty, ghost: this.ghost };
      if (this.levelIndex >= LEVELS.length - 1) {
        this.state = GAME_STATE.WON;
        this.sound.win();
      } else {
        this.state = GAME_STATE.LEVEL_DONE;
        this.sound.levelClear();
      }
    }
  }

  playerTileKind() {
    const col = Math.floor((this.player.x - PLAY_X) / TILE);
    const row = Math.floor((this.player.y - PLAY_Y) / TILE);
    return tileAt(this.level, col, row);
  }

  playerHidden() {
    const kind = this.playerTileKind();
    return isBushTile(kind) || isDarkTile(kind);
  }
}
