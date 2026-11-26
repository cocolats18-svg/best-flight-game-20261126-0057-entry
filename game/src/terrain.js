// Pine Valley: the procedural course. One deterministic height field gives rolling
// valley floor, mountain walls on both sides, a winding river, a flat town and a flat
// runway; the rings and clouds are placed from the same seed.
import { COURSE } from './config.js';
import { clamp, hash2, mulberry32, valueNoise } from './random.js';

export function riverX(z) {
  return 26 * Math.sin(z * 0.0016 + 1.7) + 10 * Math.sin(z * 0.0041 + 0.4);
}

export function isTown(x, z) {
  return z > COURSE.townZ0 && z < COURSE.townZ1 && Math.abs(x) < 55;
}

export function isRunway(x, z) {
  return (
    z > COURSE.runwayZ - COURSE.runwayLength / 2 &&
    z < COURSE.runwayZ + COURSE.runwayLength / 2 &&
    Math.abs(x) < COURSE.runwayHalfWidth
  );
}

/** Ground height at (x, z) for the given seed. */
export function groundHeight(x, z, seed) {
  const ax = Math.abs(x);
  // Gentle valley floor that rises slowly down the course.
  let h = 2.5 + 2.2 * valueNoise(x * 0.03, z * 0.012, seed) + 1.4 * valueNoise(x * 0.09, z * 0.05, seed + 7);
  h += z * 0.0035;
  // Mountain walls closing in on both sides, lower and further out than the valley
  // floor so they frame the course instead of swallowing it.
  const wall = clamp((ax - 75) / 130, 0, 1);
  h += wall * wall * (30 + 20 * valueNoise(x * 0.02, z * 0.008, seed + 13));
  // The river carves a channel down to the water.
  const dRiver = Math.abs(x - riverX(z));
  if (dRiver < 14) h = Math.min(h, -1.5 + dRiver * 0.25);
  // The town and the runway are flattened pads.
  if (isTown(x, z)) h = 2.5 + z * 0.0035;
  if (isRunway(x, z)) h = 0;
  return h;
}

/** The ring course: one ring per gap, weaving across the valley. Each ring hangs a
 * safe height above the ground beneath it, so no ring is ever under the terrain. */
export function buildRings(seed) {
  const rings = [];
  for (let i = 0; i < COURSE.ringCount; i += 1) {
    const z = COURSE.firstRingZ + i * COURSE.ringGap;
    const x = 30 * Math.sin(i * 0.9 + seed * 0.7);
    rings.push({
      index: i,
      z,
      x,
      y: groundHeight(x, z, seed) + 13 + 4 * Math.sin(i * 1.3 + 1.1),
      passed: false,
    });
  }
  return rings;
}

/** Puffy clouds drifting over the valley, placed from the seed. */
export function buildClouds(seed) {
  const rng = mulberry32(seed * 31 + 5);
  const clouds = [];
  for (let i = 0; i < 26; i += 1) {
    clouds.push({
      x: (rng() - 0.5) * 420,
      y: 55 + rng() * 55,
      z: 120 + rng() * 3300,
      size: 26 + rng() * 42,
      speed: 1.5 + rng() * 2.5,
    });
  }
  return clouds;
}

/** A deterministic coin-flip per world cell, for trees and houses. */
export function cellChance(cx, cz, seed) {
  return hash2(cx, cz, seed + 101);
}
