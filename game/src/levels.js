// Shadow Lantern — the three levels of the Ember Manor.
// One job: the maps, the patrol routes and the spawn points, nothing else.
// Legend: # wall · . lit floor · , dark floor (hard to spot in) · B bush
// (hide inside) · C crate (solid, blocks sight) · R relic · E exit ·
// P player start · G guard spawn. Patrols are tile waypoints, walked in
// order and back again; a guard pauses and scans at each waypoint.
// Maps are built from wall segments (never full-height dividers without a
// door gap) so every relic, guard and exit is reachable from the start.
import { COLS, ROWS, TILE, PLAY_X, PLAY_Y } from './config.js';

function buildMap(spec) {
  const grid = [];
  for (let row = 0; row < ROWS; row += 1) {
    const line = new Array(COLS).fill('.');
    line[0] = '#';
    line[COLS - 1] = '#';
    grid.push(line);
  }
  for (let col = 0; col < COLS; col += 1) {
    grid[0][col] = '#';
    grid[ROWS - 1][col] = '#';
  }
  for (const [c1, r1, c2, r2] of spec.walls) {
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r += 1) {
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c += 1) grid[r][c] = '#';
    }
  }
  const put = (ch, spots) => {
    for (const [c, r] of spots) grid[r][c] = ch;
  };
  put(',', spec.dark || []);
  put('B', spec.bushes || []);
  put('C', spec.crates || []);
  put('R', spec.relics);
  put('E', [spec.exit]);
  put('P', [spec.player]);
  put('G', spec.guards);
  return grid.map((line) => line.join(''));
}

export const LEVELS = [
  {
    name: 'I — The Garden Gate',
    sub: 'Three relics. The gardener patrols the beds — stay out of the light.',
    par: 75,
    map: buildMap({
      walls: [[13, 4, 13, 13], [14, 4, 17, 4], [16, 5, 16, 6], [17, 7, 20, 7], [20, 7, 20, 10], [17, 10, 20, 10], [3, 7, 6, 7], [3, 7, 3, 11], [3, 11, 6, 11]],
      dark: [[6, 1], [6, 2], [6, 14], [12, 13]],
      bushes: [[3, 3], [8, 9], [3, 13]],
      crates: [[3, 5], [23, 5], [23, 10]],
      relics: [[20, 1], [21, 6], [20, 13]],
      exit: [22, 13],
      player: [1, 1],
      guards: [[10, 3], [21, 7], [10, 13]],
    }),
    patrols: [
      [[10, 3], [21, 3], [21, 2], [10, 2]],
      [[21, 7], [21, 12], [24, 12], [24, 7]],
      [[10, 13], [4, 13], [4, 14], [10, 14]],
    ],
  },
  {
    name: 'II — The Grand Hall',
    sub: 'Four guards cross the hall. The dark corners are your friends.',
    par: 110,
    map: buildMap({
      walls: [[7, 1, 7, 6], [7, 9, 7, 14], [13, 7, 13, 14], [19, 3, 19, 6], [19, 9, 19, 14], [4, 9, 7, 9], [4, 9, 4, 11], [4, 11, 7, 11], [20, 3, 21, 3], [20, 4, 21, 4], [16, 11, 18, 11]],
      dark: [[15, 1], [15, 2], [16, 5], [17, 5], [16, 6], [17, 6], [20, 12], [20, 13], [21, 14]],
      bushes: [[3, 3], [8, 11]],
      crates: [[10, 3], [3, 7], [15, 12]],
      relics: [[21, 1], [22, 9], [5, 14]],
      exit: [23, 14],
      player: [1, 1],
      guards: [[12, 9], [21, 14], [5, 2], [10, 13]],
    }),
    patrols: [
      [[5, 2], [5, 8], [2, 8], [2, 2]],
      [[12, 4], [17, 4], [17, 6], [12, 6]],
      [[10, 13], [10, 6], [12, 6], [12, 13]],
      [[21, 14], [21, 10], [24, 10], [24, 14]],
    ],
  },
  {
    name: 'III — The Vault',
    sub: 'Five guards, one vault. Ghost it: never raise a full alarm.',
    par: 150,
    map: buildMap({
      walls: [[7, 1, 7, 6], [7, 9, 7, 14], [13, 7, 13, 14], [19, 3, 19, 6], [19, 9, 19, 12], [4, 9, 7, 9], [4, 9, 4, 11], [4, 11, 7, 11], [16, 3, 17, 3], [16, 4, 17, 4], [20, 11, 21, 11]],
      dark: [[15, 1], [15, 2], [15, 5], [15, 6], [20, 13], [21, 13], [22, 13]],
      bushes: [[3, 3], [8, 11]],
      crates: [[9, 3], [3, 7], [15, 12]],
      relics: [[21, 1], [19, 7], [5, 14]],
      exit: [22, 13],
      player: [1, 1],
      guards: [[12, 9], [12, 13], [5, 2], [20, 3], [9, 13]],
    }),
    patrols: [
      [[5, 2], [5, 8], [2, 8], [2, 2]],
      [[20, 3], [20, 8], [23, 8], [23, 3]],
      [[12, 9], [12, 4], [15, 4], [15, 6], [12, 6]],
      [[9, 13], [9, 6], [11, 6], [11, 13]],
      [[12, 13], [12, 10], [10, 10], [10, 13]],
    ],
  },
];

export function tileAt(level, col, row) {
  if (col < 0 || row < 0 || col >= level.map[0].length || row >= level.map.length) return '#';
  return level.map[row][col];
}

export function isSolidTile(ch) {
  return ch === '#' || ch === 'C';
}

export function blocksSightTile(ch) {
  return ch === '#' || ch === 'C';
}

export function isDarkTile(ch) {
  return ch === ',';
}

export function isBushTile(ch) {
  return ch === 'B';
}

export function findTiles(level, ch) {
  const found = [];
  for (let row = 0; row < level.map.length; row += 1) {
    for (let col = 0; col < level.map[row].length; col += 1) {
      if (level.map[row][col] === ch) found.push({ col, row });
    }
  }
  return found;
}

export function tileCentre(col, row) {
  return { x: PLAY_X + col * TILE + TILE / 2, y: PLAY_Y + row * TILE + TILE / 2 };
}
