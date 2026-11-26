// Sky Courier bootstrap: canvas setup, the fixed-step loop, screens and sound wiring.
// ?shot=start|play|end&seed=1 stages a deterministic screenshot scene instead of the
// live title screen.
import { STEP, VIEW } from './config.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import { MODE_OVER, MODE_PLAY, MODE_TITLE, createGame, resetRun, stepGame } from './game.js';
import { draw } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 1) || 1;

canvas.width = VIEW.width;
canvas.height = VIEW.height;

const game = createGame(seed);
const input = new Input(canvas);
const sound = new SoundEngine();

if (params.get('shot')) {
  stageShot(params.get('shot'), game);
  draw(ctx, game);
} else {
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    if (input.consume('enter') || input.consume(' ') || input.consume('click')) {
      sound.ensure();
      if (game.mode === MODE_TITLE || game.mode === MODE_OVER) resetRun(game);
    }
    if (input.consume('m')) sound.muted = !sound.muted;
    while (acc >= STEP) {
      acc -= STEP;
      const events = game.mode === MODE_PLAY ? stepGame(game, input.control(), STEP) : [];
      for (const event of events) {
        if (event === 'ring') sound.chime();
        if (event === 'crash') sound.crash();
        if (event === 'land') sound.land();
      }
    }
    sound.setEngine(game.plane.throttle, game.plane.speed, game.mode === MODE_PLAY);
    draw(ctx, game);
    status.textContent =
      game.mode === MODE_PLAY
        ? `Score ${game.score}, ring ${game.ringIndex} of 12, fuel ${Math.round(game.plane.fuel)}`
        : game.mode === MODE_OVER
          ? `Flight over, score ${game.score}`
          : 'Sky Courier, press Enter to take off';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
