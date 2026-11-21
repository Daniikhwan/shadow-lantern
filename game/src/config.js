// Shadow Lantern — shared tuning and layout constants.
// One job: every number the game balances on lives here, so tuning is a
// one-line change and every other file reads the same values.
export const TILE = 44;
export const COLS = 26;
export const ROWS = 16;
export const VIEW_W = 1280;
export const VIEW_H = 800;
export const PLAY_X = 68;
export const PLAY_Y = 84;
export const FIELD_W = COLS * TILE;
export const FIELD_H = ROWS * TILE;

export const PLAYER_RADIUS = 13;
export const PLAYER_WALK_SPEED = 150;
export const PLAYER_RUN_SPEED = 235;
export const PLAYER_SNEAK_SPEED = 74;
export const PLAYER_CATCH_RADIUS = 26;

export const GUARD_RADIUS = 14;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 178;
export const GUARD_INVESTIGATE_SPEED = 105;
export const GUARD_VISION_RANGE = 225;
export const GUARD_VISION_FOV = (82 * Math.PI) / 180;
export const GUARD_PAUSE_AT_WAYPOINT = 1.4;
export const GUARD_SCAN_SWEEP = (70 * Math.PI) / 180;

export const SUSPICION_MAX = 100;
export const SUSPICION_ALERT = 100;
export const SUSPICION_CURIOUS = 34;
export const SUSPICION_RISE_BASE = 58;
export const SUSPICION_DECAY = 16;
export const ALERT_MEMORY_SECONDS = 3.5;
export const SEARCH_SECONDS = 3.2;

export const NOISE_RUN_RADIUS = 105;
export const NOISE_RUN_INTERVAL = 0.38;
export const NOISE_PEBBLE_RADIUS = 155;

export const DARK_DETECTION = 0.45;
export const BUSH_DETECTION = 0.12;
export const BUSH_REVEAL_RANGE = 78;
export const SNEAK_DETECTION = 0.55;
export const RUN_DETECTION = 1.5;

export const COLOURS = {
  floorLit: '#343a49',
  floorLitAlt: '#2e3340',
  floorDark: '#222636',
  floorDarkAlt: '#1d2130',
  wall: '#3d4457',
  wallTop: '#5a637e',
  wallEdge: '#232838',
  crate: '#6b4a2b',
  crateEdge: '#8a6238',
  bush: '#2a6540',
  bushLight: '#3f8256',
  relic: '#ffd76a',
  exitLocked: '#5b6b7a',
  exitOpen: '#58e08a',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneCurious: 'rgba(255, 158, 44, 0.30)',
  coneAlert: 'rgba(255, 64, 64, 0.38)',
  guardCalm: '#e8b64c',
  guardCurious: '#ff9e2c',
  guardAlert: '#ff4040',
  player: '#7fd4ff',
  cloak: '#2c4a6b',
  hud: '#e8e4d8',
  hudDim: '#9aa3b5',
  danger: '#ff5a5a',
};
