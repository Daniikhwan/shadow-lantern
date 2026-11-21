// Shadow Lantern — everything the player sees.
// One job: draw the world, the lantern light, the vision cones, the
// people and the HUD, in that order, so cover reads at a glance, guards
// stay visible against the floor, and light shows what is safe.
import {
  TILE, COLS, ROWS, VIEW_W, VIEW_H, PLAY_X, PLAY_Y, FIELD_W, FIELD_H,
  GUARD_VISION_RANGE, GUARD_VISION_FOV, COLOURS,
} from './config.js';
import { tileAt, tileCentre } from './levels.js';
import { conePolygon } from './vision.js';
import { GUARD_STATE } from './guards.js';
import { GAME_STATE } from './game.js';

function hashTile(col, row) {
  let h = (col * 374761393 + row * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  return ((h * 1274126177) | 0) / 2147483647;
}

function coneColour(guard) {
  if (guard.state === GUARD_STATE.ALERT) return COLOURS.coneAlert;
  if (guard.state === GUARD_STATE.CURIOUS || guard.suspicion > 34) return COLOURS.coneCurious;
  return COLOURS.coneCalm;
}

function guardColour(guard) {
  if (guard.state === GUARD_STATE.ALERT) return COLOURS.guardAlert;
  if (guard.state === GUARD_STATE.CURIOUS || guard.suspicion > 34) return COLOURS.guardCurious;
  return COLOURS.guardCalm;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = VIEW_W;
    this.lightCanvas.height = VIEW_H;
    this.lightCtx = this.lightCanvas.getContext('2d');
  }

  draw(game) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#0b0e17';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.drawWorld(ctx, game);
    this.drawLighting(ctx, game);
    this.drawCones(ctx, game);
    this.drawEntities(ctx, game);
    this.drawHud(ctx, game);
    if (game.state !== GAME_STATE.PLAY) this.drawOverlay(ctx, game);
    if (game.anyAlert && game.state === GAME_STATE.PLAY) this.drawAlertVignette(ctx, game);
  }

  drawWorld(ctx, game) {
    const level = game.level;
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const ch = tileAt(level, col, row);
        const x = PLAY_X + col * TILE;
        const y = PLAY_Y + row * TILE;
        const vary = hashTile(col, row);
        if (ch === '#') {
          ctx.fillStyle = COLOURS.wall;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = COLOURS.wallTop;
          ctx.fillRect(x, y, TILE, 5);
          ctx.fillStyle = COLOURS.wallEdge;
          ctx.fillRect(x, y + TILE - 3, TILE, 3);
          ctx.fillRect(x + TILE - 3, y, 3, TILE);
        } else if (ch === ',') {
          ctx.fillStyle = vary > 0 ? COLOURS.floorDark : COLOURS.floorDarkAlt;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = 'rgba(120, 150, 255, 0.05)';
          ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
        } else {
          ctx.fillStyle = vary > 0 ? COLOURS.floorLit : COLOURS.floorLitAlt;
          ctx.fillRect(x, y, TILE, TILE);
          if (vary > 0.6) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.fillRect(x + 8, y + 8, TILE - 16, TILE - 16);
          }
        }
        if (ch === 'C') {
          ctx.fillStyle = COLOURS.crate;
          ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
          ctx.strokeStyle = COLOURS.crateEdge;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 4);
          ctx.lineTo(x + TILE - 4, y + TILE - 4);
          ctx.moveTo(x + TILE - 4, y + 4);
          ctx.lineTo(x + 4, y + TILE - 4);
          ctx.stroke();
        } else if (ch === 'B') {
          ctx.fillStyle = COLOURS.bush;
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, TILE / 2 - 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = COLOURS.bushLight;
          for (let i = 0; i < 5; i += 1) {
            const a = hashTile(col * 3 + i, row * 5 + i) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(x + TILE / 2 + Math.cos(a) * 10, y + TILE / 2 + Math.sin(a) * 10, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    this.drawExit(ctx, game);
  }

  drawExit(ctx, game) {
    const { x, y } = game.exitCentre;
    const open = game.exitOpen;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = open ? COLOURS.exitOpen : COLOURS.exitLocked;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0b0e17';
    ctx.fillRect(-11, -14, 22, 28);
    ctx.fillStyle = open ? '#b8ffd2' : '#8a97a8';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(open ? 'EXIT' : 'LOCK', 0, 1);
    if (open) {
      ctx.strokeStyle = 'rgba(88, 224, 138, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 27 + Math.sin(game.time * 3) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawLighting(ctx, game) {
    const lc = this.lightCtx;
    lc.clearRect(0, 0, VIEW_W, VIEW_H);
    lc.globalCompositeOperation = 'source-over';
    lc.fillStyle = 'rgba(4, 7, 18, 0.46)';
    lc.fillRect(PLAY_X, PLAY_Y, FIELD_W, FIELD_H);
    lc.globalCompositeOperation = 'destination-out';
    const pool = (x, y, r, strength) => {
      const g = lc.createRadialGradient(x, y, 8, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${strength})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.beginPath();
      lc.arc(x, y, r, 0, Math.PI * 2);
      lc.fill();
    };
    const player = game.player;
    pool(player.x, player.y, 235, 0.95);
    for (const relic of game.relics) {
      if (!relic.taken) pool(relic.x, relic.y, 62, 0.75);
    }
    pool(game.exitCentre.x, game.exitCentre.y, 85, 0.7);
    for (const guard of game.guards) pool(guard.x, guard.y, 90, 0.6);
    ctx.drawImage(this.lightCanvas, 0, 0);
  }

  drawCones(ctx, game) {
    for (const guard of game.guards) {
      const angle = guard.faceAngle;
      const poly = conePolygon(game.level, guard.x, guard.y, angle);
      ctx.fillStyle = coneColour(guard);
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i].x, poly[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = coneColour(guard).replace(/[\d.]+\)$/, '0.55)');
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  drawEntities(ctx, game) {
    for (const relic of game.relics) {
      if (relic.taken) continue;
      const bob = Math.sin(relic.shimmer) * 2;
      ctx.save();
      ctx.translate(relic.x, relic.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = COLOURS.relic;
      ctx.shadowColor = COLOURS.relic;
      ctx.shadowBlur = 14;
      ctx.fillRect(-7, -7, 14, 14);
      ctx.restore();
    }
    for (const pebble of game.player.pebbles) {
      ctx.fillStyle = '#c9c2b0';
      ctx.beginPath();
      ctx.arc(pebble.x, pebble.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const ring of game.rings) {
      ctx.strokeStyle = `rgba(255, 220, 120, ${0.55 * (ring.ttl / 0.7)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const guard of game.guards) this.drawGuard(ctx, game, guard);
    this.drawPlayer(ctx, game);
  }

  drawGuard(ctx, game, guard) {
    const colour = guardColour(guard);
    const distToPlayer = Math.hypot(guard.x - game.player.x, guard.y - game.player.y);
    const alpha = Math.max(0.6, Math.min(1, 1.25 - distToPlayer / 300));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(guard.x, guard.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 9, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#232838';
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(guard.faceAngle);
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(4, -6);
    ctx.lineTo(4, 6);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(-guard.faceAngle);
    if (guard.suspicion > 2) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 19, -Math.PI / 2, -Math.PI / 2 + (guard.suspicion / 100) * Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (guard.state === GUARD_STATE.ALERT) {
      this.drawMark(ctx, guard.x, guard.y - 30, '!', '#ff4040');
    } else if (guard.state === GUARD_STATE.CURIOUS || guard.suspicion > 34) {
      this.drawMark(ctx, guard.x, guard.y - 30, '?', '#ffb02c');
    }
  }

  drawMark(ctx, x, y, text, colour) {
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = colour;
    ctx.fillText(text, x, y);
  }

  drawPlayer(ctx, game) {
    const player = game.player;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 9, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(player.angle);
    ctx.fillStyle = COLOURS.cloak;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-9, -11);
    ctx.lineTo(-13, 0);
    ctx.lineTo(-9, 11);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(-player.angle);
    ctx.fillStyle = COLOURS.player;
    ctx.strokeStyle = '#dff2ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, player.sneaking ? 11 : 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd76a';
    ctx.shadowColor = '#ffd76a';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (player.sneaking) {
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(232, 228, 216, 0.85)';
      ctx.fillText('sneaking', player.x, player.y + 28);
    }
  }

  drawHud(ctx, game) {
    ctx.fillStyle = '#10131d';
    ctx.fillRect(0, 0, VIEW_W, 56);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(0, 56, VIEW_W, 1);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = COLOURS.hud;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(`SHADOW LANTERN · ${game.level.name}`, 16, 29);
    const relicX = 560;
    for (let i = 0; i < 3; i += 1) {
      const taken = game.relics[i] && game.relics[i].taken;
      ctx.save();
      ctx.translate(relicX + i * 34, 28);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = taken ? COLOURS.relic : 'rgba(255,215,106,0.18)';
      ctx.strokeStyle = taken ? COLOURS.relic : 'rgba(255,215,106,0.45)';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-7, -7, 14, 14);
      ctx.strokeRect(-7, -7, 14, 14);
      ctx.restore();
    }
    const minutes = Math.floor(game.time / 60);
    const seconds = Math.floor(game.time % 60);
    ctx.textAlign = 'right';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = COLOURS.hudDim;
    ctx.fillText(`${minutes}:${String(seconds).padStart(2, '0')}  ·  Score ${game.score}`, 1106, 29);
    const alert = game.alertLevel;
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(1120, 20, 132, 16);
    ctx.fillStyle = alert >= 100 ? COLOURS.danger : alert >= 34 ? '#ffb02c' : '#58e08a';
    ctx.fillRect(1120, 20, (132 * alert) / 100, 16);
    ctx.fillStyle = COLOURS.hud;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(alert >= 100 ? 'SPOTTED' : alert >= 34 ? 'SUSPICIOUS' : 'HIDDEN', 1186, 29);
    ctx.textAlign = 'left';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = COLOURS.hudDim;
    const hints = 'WASD move · Shift run (loud) · C sneak · Click throw pebble · P pause · M mute';
    ctx.fillText(hints, 16, VIEW_H - 16);
    ctx.textAlign = 'right';
    ctx.fillText(`Pebbles: ${game.player.pebbleCount}`, VIEW_W - 16, VIEW_H - 16);
    if (game.toastTimer > 0 && game.state === GAME_STATE.PLAY) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(game.toast, VIEW_W / 2, 96);
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(game.toast, VIEW_W / 2, 96);
    }
  }

  drawAlertVignette(ctx) {
    const pulse = 0.25 + 0.15 * Math.sin(Date.now() / 130);
    ctx.strokeStyle = `rgba(255, 64, 64, ${pulse})`;
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, VIEW_W - 14, VIEW_H - 14);
  }

  buttonsFor(game) {
    const cx = VIEW_W / 2;
    const bw = 260;
    const bh = 46;
    const by = (row) => 470 + row * 60;
    switch (game.state) {
      case GAME_STATE.TITLE:
        return [
          { id: 'start', label: '▶  Start the heist', x: cx - bw / 2, y: by(0), w: bw, h: bh },
          { id: 'level2', label: 'Level II — Grand Hall', x: cx - bw / 2, y: by(1), w: bw, h: bh },
          { id: 'level3', label: 'Level III — The Vault', x: cx - bw / 2, y: by(2), w: bw, h: bh },
        ];
      case GAME_STATE.PAUSED:
        return [
          { id: 'resume', label: 'Resume', x: cx - bw / 2, y: by(0), w: bw, h: bh },
          { id: 'retry', label: 'Restart level', x: cx - bw / 2, y: by(1), w: bw, h: bh },
          { id: 'title', label: 'Quit to title', x: cx - bw / 2, y: by(2), w: bw, h: bh },
        ];
      case GAME_STATE.CAUGHT:
        return [
          { id: 'retry', label: 'Try again  (R)', x: cx - bw / 2, y: by(0), w: bw, h: bh },
          { id: 'title', label: 'Back to title', x: cx - bw / 2, y: by(1), w: bw, h: bh },
        ];
      case GAME_STATE.LEVEL_DONE:
        return [
          { id: 'next', label: 'Next level  →', x: cx - bw / 2, y: by(0), w: bw, h: bh },
          { id: 'retry', label: 'Replay level', x: cx - bw / 2, y: by(1), w: bw, h: bh },
          { id: 'title', label: 'Back to title', x: cx - bw / 2, y: by(2), w: bw, h: bh },
        ];
      case GAME_STATE.WON:
        return [
          { id: 'again', label: 'Play again', x: cx - bw / 2, y: by(0), w: bw, h: bh },
          { id: 'title', label: 'Back to title', x: cx - bw / 2, y: by(1), w: bw, h: bh },
        ];
      default:
        return [];
    }
  }

  drawOverlay(ctx, game) {
    ctx.fillStyle = 'rgba(5, 7, 14, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = VIEW_W / 2;
    if (game.state === GAME_STATE.TITLE) {
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 64px Georgia, serif';
      ctx.fillText('SHADOW LANTERN', cx, 210);
      ctx.fillStyle = '#e8e4d8';
      ctx.font = 'italic 21px Georgia, serif';
      ctx.fillText('A stealth heist in the Ember Manor', cx, 258);
      ctx.fillStyle = '#9aa3b5';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('Steal all three relics on each floor, then slip out the exit — unseen.', cx, 300);
      ctx.fillText('Guards watch with cones of light. Darkness and bushes hide you.', cx, 326);
      ctx.fillText('Running is loud. A thrown pebble is louder — and very useful.', cx, 352);
      ctx.fillStyle = '#7fd4ff';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('WASD / arrows — move      Shift — run      C — sneak      Click — throw pebble', cx, 400);
    } else if (game.state === GAME_STATE.PAUSED) {
      ctx.fillStyle = '#e8e4d8';
      ctx.font = 'bold 48px Georgia, serif';
      ctx.fillText('Paused', cx, 250);
    } else if (game.state === GAME_STATE.CAUGHT) {
      ctx.fillStyle = '#ff5a5a';
      ctx.font = 'bold 52px Georgia, serif';
      ctx.fillText('CAUGHT!', cx, 230);
      ctx.fillStyle = '#e8e4d8';
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText(`A guard laid hands on you after ${Math.floor(game.time)}s in ${game.level.name}.`, cx, 290);
      ctx.fillStyle = '#9aa3b5';
      ctx.fillText('Next time: watch the cones, use the dark, and never sprint past a guard.', cx, 320);
    } else if (game.state === GAME_STATE.LEVEL_DONE) {
      ctx.fillStyle = '#58e08a';
      ctx.font = 'bold 52px Georgia, serif';
      ctx.fillText('CLEAN GETAWAY', cx, 230);
      ctx.fillStyle = '#e8e4d8';
      ctx.font = '18px system-ui, sans-serif';
      const clear = game.levelClear || {};
      ctx.fillText(`${game.level.name} cleared in ${Math.floor(game.time)}s`, cx, 290);
      ctx.fillStyle = '#9aa3b5';
      ctx.fillText(`Time bonus +${clear.timeBonus || 0}   ·   Ghost bonus +${clear.ghostBonus || 0}   ·   Alerts −${clear.alertPenalty || 0}`, cx, 322);
      ctx.fillText(`Score: ${game.score}`, cx, 352);
    } else if (game.state === GAME_STATE.WON) {
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 52px Georgia, serif';
      ctx.fillText('THE VAULT IS YOURS', cx, 230);
      ctx.fillStyle = '#e8e4d8';
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText('All three floors of the Ember Manor, picked clean.', cx, 290);
      ctx.fillStyle = '#9aa3b5';
      ctx.fillText(`Final score: ${game.score}   ·   Times spotted: ${game.timesSeen}`, cx, 322);
    }
    for (const button of this.buttonsFor(game)) {
      ctx.fillStyle = '#1c2233';
      ctx.strokeStyle = '#ffd76a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(button.x, button.y, button.w, button.h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.fillText(button.label, button.x + button.w / 2, button.y + button.h / 2 + 1);
    }
  }
}
