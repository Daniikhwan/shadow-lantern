// Shadow Lantern — the thief.
// One job: the player's movement, stance and noise. Walk is quiet, run is
// fast and loud, sneak is slow and hard to spot; a thrown pebble (mouse
// click) clinks where it lands and pulls guards off their patrol.
import {
  TILE, PLAYER_RADIUS, PLAYER_WALK_SPEED, PLAYER_RUN_SPEED, PLAYER_SNEAK_SPEED,
  NOISE_RUN_RADIUS, NOISE_RUN_INTERVAL, PLAY_X, PLAY_Y,
} from './config.js';
import { tileAt } from './levels.js';

export class Player {
  constructor(startTile) {
    const start = { x: PLAY_X + startTile.col * TILE + TILE / 2, y: PLAY_Y + startTile.row * TILE + TILE / 2 };
    this.x = start.x;
    this.y = start.y;
    this.radius = PLAYER_RADIUS;
    this.angle = -Math.PI / 2;
    this.sneaking = false;
    this.running = false;
    this.moving = false;
    this.noiseTimer = 0;
    this.pebbles = [];
    this.pebbleCount = 6;
    this.stepPhase = 0;
    this.stepTimer = 0;
  }

  update(dt, input, level, events) {
    let dx = 0;
    let dy = 0;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    const len = Math.hypot(dx, dy);
    this.sneaking = !!input.sneak;
    this.running = !!input.run && !this.sneaking && len > 0;
    this.moving = len > 0;
    const speed = this.sneaking ? PLAYER_SNEAK_SPEED : this.running ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;
    if (len > 0) {
      dx /= len;
      dy /= len;
      this.angle = Math.atan2(dy, dx);
      const nx = this.x + dx * speed * dt;
      const ny = this.y + dy * speed * dt;
      const canStand = (x, y) => {
        const col = Math.floor((x - PLAY_X) / TILE);
        const row = Math.floor((y - PLAY_Y) / TILE);
        const ch = tileAt(level, col, row);
        return ch !== '#' && ch !== 'C';
      };
      const r = this.radius - 2;
      const blocked = (x, y) =>
        !canStand(x - r, y - r) || !canStand(x + r, y - r) || !canStand(x - r, y + r) || !canStand(x + r, y + r);
      if (!blocked(nx, this.y)) this.x = nx;
      if (!blocked(this.x, ny)) this.y = ny;
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.running ? 0.26 : this.sneaking ? 0.62 : 0.42;
        this.stepPhase += 1;
        events.onStep(this.running);
      }
      if (this.running) {
        this.noiseTimer -= dt;
        if (this.noiseTimer <= 0) {
          this.noiseTimer = NOISE_RUN_INTERVAL;
          events.onNoise({ x: this.x, y: this.y, radius: NOISE_RUN_RADIUS, kind: 'run' });
        }
      }
    }
    for (const pebble of this.pebbles) {
      pebble.ttl -= dt;
      pebble.x += pebble.vx * dt;
      pebble.y += pebble.vy * dt;
      if (pebble.ttl <= 0 && !pebble.landed) {
        pebble.landed = true;
        events.onNoise({ x: pebble.x, y: pebble.y, radius: 155, kind: 'pebble' });
        events.onPebbleLand(pebble);
      }
    }
    this.pebbles = this.pebbles.filter((p) => p.ttl > -0.6);
  }

  throwPebble(targetX, targetY) {
    if (this.pebbleCount <= 0) return false;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 30 || dist > 420) return false;
    this.pebbleCount -= 1;
    const flight = 0.45;
    this.pebbles.push({
      x: this.x,
      y: this.y,
      vx: (dx / dist) * (dist / flight),
      vy: (dy / dist) * (dist / flight),
      ttl: flight,
      landed: false,
    });
    return true;
  }
}
