// The deterministic screenshot scenes behind ?shot=start|play|end&seed=1. Each one plays
// the real rules forward from a fresh run for a fixed time, steered by the autopilot, so
// the frame is what a short game really looks like and the same seed always gives the
// same frame.
import { STEP } from './config.js';
import { MODE_OVER, MODE_PLAY, MODE_TITLE, autopilot, resetRun, stepGame } from './game.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 16;
const END_LIMIT_SECONDS = 600;

/**
 * Set `game` to the named scene (start, play or end; any other name is start).
 * The play pilot flies well; the end pilot flies sloppily and comes down in the valley.
 */
export function stageShot(name, game) {
  resetRun(game);
  if (name !== 'play' && name !== 'end') {
    game.mode = MODE_TITLE;
    for (let i = 0; i < START_SECONDS / STEP; i += 1) stepGame(game, autopilot(game, 1), STEP);
    game.mode = MODE_TITLE;
    return;
  }
  const skill = name === 'end' ? 0.15 : 1;
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  for (let i = 0; i < limit / STEP; i += 1) {
    const ctl = autopilot(game, skill);
    // The sloppy pilot also drifts down: it never quite climbs back out of the valley,
    // so the end frame is a real crash rather than a plane that flew on forever.
    if (name === 'end') ctl.climb = Math.min(ctl.climb, -0.25);
    stepGame(game, ctl, STEP);
    if (game.mode === MODE_OVER) break;
  }
  if (name === 'end' && game.mode === MODE_PLAY) {
    // A sloppy pilot should have come down by now; force the end frame if it has not.
    game.mode = MODE_OVER;
    game.crashReason = 'Out of fuel';
  }
}

export { MODE_OVER, MODE_PLAY, MODE_TITLE };
