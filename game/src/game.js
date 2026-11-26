// Sky Courier: the game itself. Title, flying, landing and game over; rings, fuel,
// lives, score and the crash/landing rules. The plane, the terrain and the renderer
// are separate modules; this one only decides what happens.
import { COURSE, PLANE, SCORE, STEP } from './config.js';
import { createPlane, stepPlane } from './plane.js';
import { buildClouds, buildRings, groundHeight } from './terrain.js';
import { clamp } from './random.js';

export const MODE_TITLE = 'title';
export const MODE_PLAY = 'play';
export const MODE_OVER = 'over';

export function createGame(seed) {
  const game = {
    seed,
    mode: MODE_TITLE,
    plane: createPlane(),
    rings: buildRings(seed),
    clouds: buildClouds(seed),
    ringIndex: 0,
    score: 0,
    best: 0,
    lives: PLANE.lives,
    time: 0,
    message: '',
    messageTime: 0,
    landed: false,
    crashReason: '',
    events: [],
  };
  return game;
}

export function resetRun(game) {
  game.plane = createPlane();
  game.rings = buildRings(game.seed);
  game.clouds = buildClouds(game.seed);
  game.ringIndex = 0;
  game.score = 0;
  game.lives = PLANE.lives;
  game.time = 0;
  game.landed = false;
  game.crashReason = '';
  game.message = 'Fly through all 12 rings, then land on the runway.';
  game.messageTime = 4;
  game.mode = MODE_PLAY;
}

function respawn(game) {
  const ring = game.rings[Math.max(0, game.ringIndex - 1)];
  const plane = game.plane;
  plane.x = ring ? ring.x : 0;
  plane.y = (ring ? ring.y : 15) + 6;
  plane.z = Math.max(0, (ring ? ring.z : 200) - 120);
  plane.speed = PLANE.cruiseSpeed;
  plane.throttle = 0.65;
  plane.bank = 0;
  plane.pitch = 0;
  plane.heading = 0;
  plane.fuel = Math.max(plane.fuel, 55);
}

function crash(game, reason) {
  game.events.push('crash');
  game.lives -= 1;
  game.crashReason = reason;
  if (game.lives > 0) {
    respawn(game);
    game.message = `${reason} — ${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left!`;
    game.messageTime = 3;
  } else {
    game.mode = MODE_OVER;
    game.best = Math.max(game.best, game.score);
  }
}

function land(game) {
  const plane = game.plane;
  const centre = Math.abs(plane.x);
  const speedOff = Math.abs(plane.speed - SCORE.landSpeed);
  const bonus = Math.max(50, Math.round(SCORE.landBase - centre * 8 - speedOff * 4));
  game.score += bonus;
  game.landed = true;
  game.mode = MODE_OVER;
  game.best = Math.max(game.best, game.score);
  game.events.push('land');
}

/** Advance the game one fixed step. `ctl` is the input control for this frame. */
export function stepGame(game, ctl, dt) {
  game.events.length = 0;
  if (game.mode !== MODE_PLAY) return game.events;
  game.time += dt;
  if (game.messageTime > 0) game.messageTime -= dt;
  const plane = game.plane;
  stepPlane(plane, ctl, dt);

  // Rings: crossing a ring's plane inside its radius scores it.
  const ring = game.rings[game.ringIndex];
  if (ring && plane.z >= ring.z) {
    const dx = plane.x - ring.x;
    const dy = plane.y - ring.y;
    if (Math.hypot(dx, dy) < PLANE.ringRadius) {
      ring.passed = true;
      game.ringIndex += 1;
      const fast = plane.speed > 85 ? SCORE.fastRing : 0;
      game.score += SCORE.ring + fast;
      plane.fuel = Math.min(PLANE.fuelMax, plane.fuel + PLANE.fuelPerRing);
      game.message = `Ring ${game.ringIndex} of ${COURSE.ringCount}! +${SCORE.ring + fast}`;
      game.messageTime = 2;
      game.events.push('ring');
    } else {
      game.message = 'Missed the ring — keep flying!';
      game.messageTime = 2;
      game.ringIndex += 1;
    }
  }

  // The runway: touch down slow and centred after the last ring to land.
  if (game.ringIndex >= COURSE.ringCount) {
    const ground = groundHeight(plane.x, plane.z, game.seed);
    if (plane.z > COURSE.runwayZ - 40 && plane.z < COURSE.runwayZ + COURSE.runwayLength / 2) {
      if (plane.y <= ground + 1.6 && plane.speed < 70) {
        land(game);
        return game.events;
      }
      if (plane.y <= ground + 1.6) {
        crash(game, 'Too fast for the runway');
        return game.events;
      }
    }
  }

  // Ground and mountain collision, and fuel starvation.
  const ground = groundHeight(plane.x, plane.z, game.seed);
  if (plane.y <= ground + 0.8) {
    crash(game, ground > 20 ? 'Clipped a mountain' : 'Hit the ground');
    return game.events;
  }
  if (plane.fuel <= 0) {
    crash(game, 'Out of fuel');
    return game.events;
  }
  if (plane.z > COURSE.courseEndZ) {
    crash(game, 'Overshot the runway');
    return game.events;
  }
  return game.events;
}

/**
 * Autopilot for the deterministic screenshot scenes: steer for the next ring (or the
 * runway) and hold its height. `skill` 1 flies well, 0 flies sloppily.
 */
export function autopilot(game, skill) {
  const plane = game.plane;
  const ring = game.rings[game.ringIndex];
  // After the last ring there is no ring to chase: line up on the runway centre and
  // come down on the terrain ahead — never below the ground in front of the plane —
  // then settle onto the strip itself once over it.
  let targetX;
  let targetY;
  let cruise;
  if (ring) {
    targetX = ring.x;
    targetY = ring.y;
    cruise = skill > 0.5 ? 0.72 : 0.55;
  } else if (plane.z > COURSE.runwayZ - 40) {
    targetX = 0;
    targetY = 0.9;
    cruise = 0.3;
  } else {
    targetX = 0;
    targetY = groundHeight(plane.x, plane.z + 80, game.seed) + 3;
    cruise = 0.3;
  }
  // Steer for the target with bank feedback, so the plane settles on the line instead
  // of swinging past it, and hold a cruise throttle rather than flooring it.
  const steer = clamp((targetX - plane.x) * 0.06 - plane.bank * 1.5, -1, 1);
  const climb = clamp((targetY - plane.y) * 0.12 * skill, -1, 1);
  const throttle = clamp((cruise - plane.throttle) * 3, -1, 1);
  return { steer, climb, throttle };
}

export { STEP };
