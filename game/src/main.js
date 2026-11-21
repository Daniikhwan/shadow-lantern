// Shadow Lantern — the entry point: canvas, input and the game loop.
// One job: wire the browser to the game. Keyboard moves the thief, the
// mouse throws pebbles and presses menu buttons, and ?shot=cover|patrol|
// alert|exit renders one deterministic frame for the screenshots.
import { Game, GAME_STATE } from './game.js';
import { Renderer } from './render.js';
import { runShot } from './shots.js';
import { VIEW_W, VIEW_H } from './config.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotSeed = Number(params.get('seed') || 7);

if (shotName) {
  runShot(canvas, shotName, shotSeed);
} else {
  const game = new Game(0, 20261122);
  const renderer = new Renderer(canvas);
  window.__game = game;
  const input = { up: false, down: false, left: false, right: false, run: false, sneak: false, pebble: null };

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'run', ShiftRight: 'run',
    KeyC: 'sneak', ControlLeft: 'sneak',
  };

  function primaryAction() {
    const buttons = renderer.buttonsFor(game);
    if (buttons.length > 0) handleButton(buttons[0].id);
  }

  function handleButton(id) {
    game.sound.ensure();
    game.sound.click();
    if (id === 'start') game.startLevel(0);
    else if (id === 'level2') game.startLevel(1);
    else if (id === 'level3') game.startLevel(2);
    else if (id === 'resume') game.togglePause();
    else if (id === 'retry') game.startLevel(game.levelIndex);
    else if (id === 'next') game.startLevel(game.levelIndex + 1);
    else if (id === 'again') { game.totalScore = 0; game.score = 0; game.startLevel(0); }
    else if (id === 'title') { game.startLevel(game.levelIndex); game.state = GAME_STATE.TITLE; }
  }

  window.addEventListener('keydown', (event) => {
    game.sound.ensure();
    const mapped = KEYMAP[event.code];
    if (mapped) {
      input[mapped] = true;
      event.preventDefault();
      return;
    }
    if (event.code === 'KeyP' || event.code === 'Escape') {
      if (game.state === GAME_STATE.PLAY || game.state === GAME_STATE.PAUSED) game.togglePause();
    } else if (event.code === 'KeyM') {
      game.sound.muted = !game.sound.muted;
    } else if (event.code === 'KeyR') {
      if (game.state === GAME_STATE.CAUGHT || game.state === GAME_STATE.PAUSED) game.startLevel(game.levelIndex);
    } else if (event.code === 'Enter') {
      if (game.state !== GAME_STATE.PLAY) primaryAction();
    }
  });

  window.addEventListener('keyup', (event) => {
    const mapped = KEYMAP[event.code];
    if (mapped) input[mapped] = false;
  });

  canvas.addEventListener('click', (event) => {
    game.sound.ensure();
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * VIEW_W;
    const y = ((event.clientY - rect.top) / rect.height) * VIEW_H;
    if (game.state === GAME_STATE.PLAY) {
      input.pebble = { x, y };
      return;
    }
    for (const button of renderer.buttonsFor(game)) {
      if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
        handleButton(button.id);
        return;
      }
    }
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (game.state === GAME_STATE.TITLE) game.updateAttract(dt);
    else if (game.state === GAME_STATE.PLAY) game.update(dt, input);
    renderer.draw(game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
