// Shadow Lantern — the guard: patrols, suspicion and the chase.
// One job: one guard's brain. States: patrol (walk waypoints, pause and
// scan) → curious (walk to the noise or the glimpse) → alert (chase the
// thief) → search (comb the last seen spot) → patrol again. Suspicion
// rises only while the thief is actually visible, and falls when hidden,
// so a careful player always has a way back.
import {
  GUARD_RADIUS, GUARD_PATROL_SPEED, GUARD_CHASE_SPEED, GUARD_INVESTIGATE_SPEED,
  GUARD_PAUSE_AT_WAYPOINT, GUARD_SCAN_SWEEP, SUSPICION_MAX, SUSPICION_ALERT,
  SUSPICION_CURIOUS, SUSPICION_RISE_BASE, SUSPICION_DECAY, ALERT_MEMORY_SECONDS,
  SEARCH_SECONDS, DARK_DETECTION, BUSH_DETECTION, BUSH_REVEAL_RANGE,
  SNEAK_DETECTION, RUN_DETECTION, TILE, PLAY_X, PLAY_Y,
} from './config.js';
import { pointInVision, angleDifference } from './vision.js';
import { tileAt, tileCentre, isDarkTile, isBushTile } from './levels.js';

export const GUARD_STATE = {
  PATROL: 'patrol',
  CURIOUS: 'curious',
  ALERT: 'alert',
  SEARCH: 'search',
};

export class Guard {
  constructor(level, spawnTile, patrolTiles) {
    const start = tileCentre(spawnTile.col, spawnTile.row);
    this.x = start.x;
    this.y = start.y;
    this.angle = 0;
    this.state = GUARD_STATE.PATROL;
    this.suspicion = 0;
    this.waypoints = patrolTiles.map(([c, r]) => tileCentre(c, r));
    this.waypointIndex = 0;
    this.pauseTimer = 0.6;
    this.scanDirection = 1;
    this.scanAngle = 0;
    this.lastSeen = null;
    this.lastSeenTimer = 0;
    this.searchTimer = 0;
    this.investigateTarget = null;
    this.level = level;
    this.stepPhase = Math.random() * Math.PI * 2;
    this.stepTimer = 0;
    this.caughtPlayer = false;
  }

  /** How fast this guard spots the player right now (0 when not visible). */
  spotRate(player, level) {
    const seen = pointInVision(level, this.x, this.y, this.angle, player.x, player.y);
    if (!seen.visible) return 0;
    const closeness = 1 - seen.dist / 225;
    let rate = SUSPICION_RISE_BASE * (0.35 + 0.65 * closeness);
    const tile = tileAt(level, Math.floor((player.x - PLAY_X) / TILE), Math.floor((player.y - PLAY_Y) / TILE));
    if (isDarkTile(tile)) rate *= DARK_DETECTION;
    if (isBushTile(tile)) rate *= seen.dist < BUSH_REVEAL_RANGE ? 0.6 : BUSH_DETECTION;
    if (player.sneaking) rate *= SNEAK_DETECTION;
    if (player.running) rate *= RUN_DETECTION;
    return rate;
  }

  hearNoise(noise) {
    if (this.state === GUARD_STATE.ALERT) return;
    const dist = Math.hypot(noise.x - this.x, noise.y - this.y);
    if (dist > noise.radius) return;
    this.investigateTarget = { x: noise.x, y: noise.y };
    if (this.state !== GUARD_STATE.CURIOUS) {
      this.state = GUARD_STATE.CURIOUS;
      this.suspicion = Math.max(this.suspicion, SUSPICION_CURIOUS);
    }
  }

  update(dt, context) {
    const { player, noises, onFootstep } = context;
    const level = this.level;

    for (const noise of noises) this.hearNoise(noise);

    const rate = this.spotRate(player, level);
    if (rate > 0) {
      this.suspicion = Math.min(SUSPICION_MAX, this.suspicion + rate * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.lastSeenTimer = 0;
      if (this.suspicion >= SUSPICION_ALERT && this.state !== GUARD_STATE.ALERT) {
        this.state = GUARD_STATE.ALERT;
        context.onAlarm(this);
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - SUSPICION_DECAY * dt);
      this.lastSeenTimer += dt;
    }

    if (this.state === GUARD_STATE.ALERT) {
      if (this.lastSeenTimer > ALERT_MEMORY_SECONDS) {
        this.state = GUARD_STATE.SEARCH;
        this.searchTimer = SEARCH_SECONDS;
        this.investigateTarget = this.lastSeen ? { ...this.lastSeen } : { x: this.x, y: this.y };
      }
    } else if (this.state === GUARD_STATE.SEARCH) {
      this.searchTimer -= dt;
      if (this.searchTimer <= 0) {
        this.state = GUARD_STATE.PATROL;
        this.investigateTarget = null;
      }
    } else if (this.state === GUARD_STATE.CURIOUS) {
      if (this.suspicion < SUSPICION_CURIOUS * 0.5 && !this.investigateTarget) {
        this.state = GUARD_STATE.PATROL;
      }
    }

    const target = this.pickTarget(dt);
    this.moveToward(dt, target, context);
    this.stepTimer -= dt;
    if (this.stepTimer <= 0 && this.isMoving) {
      this.stepTimer = this.state === GUARD_STATE.ALERT ? 0.3 : 0.55;
      this.stepPhase += 1;
      if (onFootstep) onFootstep(this);
    }
    if (this.state === GUARD_STATE.ALERT) {
      const d = Math.hypot(player.x - this.x, player.y - this.y);
      if (d < 26) this.caughtPlayer = true;
    }
  }

  pickTarget(dt) {
    if (this.state === GUARD_STATE.ALERT && this.lastSeen) return { ...this.lastSeen, speed: GUARD_CHASE_SPEED };
    if ((this.state === GUARD_STATE.CURIOUS || this.state === GUARD_STATE.SEARCH) && this.investigateTarget) {
      return { ...this.investigateTarget, speed: GUARD_INVESTIGATE_SPEED };
    }
    const wp = this.waypoints[this.waypointIndex];
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      this.scanAngle += this.scanDirection * dt * 1.1;
      if (Math.abs(this.scanAngle) > GUARD_SCAN_SWEEP / 2) this.scanDirection *= -1;
      return null;
    }
    const d = Math.hypot(wp.x - this.x, wp.y - this.y);
    if (d < 6) {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      this.pauseTimer = GUARD_PAUSE_AT_WAYPOINT;
      this.scanAngle = 0;
      return null;
    }
    return { ...wp, speed: GUARD_PATROL_SPEED };
  }

  moveToward(dt, target, context) {
    this.isMoving = false;
    if (!target) return;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return;
    const step = Math.min(dist, target.speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    const level = this.level;
    const canStand = (x, y) => {
      const col = Math.floor((x - PLAY_X) / TILE);
      const row = Math.floor((y - PLAY_Y) / TILE);
      const ch = tileAt(level, col, row);
      return ch !== '#' && ch !== 'C';
    };
    if (canStand(nx, this.y)) this.x = nx;
    if (canStand(this.x, ny)) this.y = ny;
    this.angle = Math.atan2(dy, dx);
    this.isMoving = true;
    if (this.state === GUARD_STATE.PATROL) this.scanAngle = 0;
  }

  get faceAngle() {
    if (this.state === GUARD_STATE.PATROL && this.pauseTimer > 0) return this.angle + this.scanAngle;
    return this.angle;
  }
}
