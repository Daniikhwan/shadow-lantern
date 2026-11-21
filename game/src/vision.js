// Shadow Lantern — vision cones and line of sight.
// One job: answer "can this guard see that point?" and build the cone
// polygon the renderer draws. Walls and crates block sight; bushes do
// not (they hide the player instead, handled by the guard's detection).
import { TILE, PLAY_X, PLAY_Y, GUARD_VISION_RANGE, GUARD_VISION_FOV } from './config.js';
import { blocksSightTile, tileAt } from './levels.js';

export function pixelToTile(x, y) {
  return {
    col: Math.floor((x - PLAY_X) / TILE),
    row: Math.floor((y - PLAY_Y) / TILE),
  };
}

export function pointBlocked(level, x, y) {
  const { col, row } = pixelToTile(x, y);
  return blocksSightTile(tileAt(level, col, row));
}

/** True when no wall or crate stands between the two pixel points. */
export function hasLineOfSight(level, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (pointBlocked(level, x1 + dx * t, y1 + dy * t)) return false;
  }
  return true;
}

/** Distance from (x, y) along `angle` until a sight-blocking tile. */
export function castRay(level, x, y, angle, maxDist) {
  const step = 5;
  for (let d = step; d <= maxDist; d += step) {
    const px = x + Math.cos(angle) * d;
    const py = y + Math.sin(angle) * d;
    if (pointBlocked(level, px, py)) return d - step / 2;
  }
  return maxDist;
}

/** The vision cone as a polygon of pixel points, clipped by walls. */
export function conePolygon(level, x, y, angle, range = GUARD_VISION_RANGE, fov = GUARD_VISION_FOV) {
  const rays = 26;
  const points = [{ x, y }];
  for (let i = 0; i <= rays; i += 1) {
    const a = angle - fov / 2 + (fov * i) / rays;
    const d = castRay(level, x, y, a, range);
    points.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
  }
  return points;
}

export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Cheap cone test (angle + range + line of sight) for one target point. */
export function pointInVision(level, gx, gy, angle, tx, ty) {
  const dx = tx - gx;
  const dy = ty - gy;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_VISION_RANGE) return { visible: false, dist };
  const targetAngle = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(targetAngle, angle)) > GUARD_VISION_FOV / 2) return { visible: false, dist };
  if (!hasLineOfSight(level, gx, gy, tx, ty)) return { visible: false, dist };
  return { visible: true, dist };
}
