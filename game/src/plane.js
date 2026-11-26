// The courier plane: position, speed, bank and pitch, and how the controls move it.
// The plane always flies forward down the valley; banking turns it sideways, pitching
// climbs or dives, and the throttle sets the speed. Fuel burns faster at full throttle.
import { PLANE } from './config.js';
import { clamp } from './random.js';

export function createPlane() {
  return {
    x: PLANE.startX,
    y: PLANE.startY,
    z: PLANE.startZ,
    speed: PLANE.cruiseSpeed,
    throttle: 0.65,
    bank: 0,
    pitch: 0,
    heading: 0,
    fuel: PLANE.fuelMax,
  };
}

/**
 * Step the plane one tick. `ctl` carries steer (-1..1, left/right), climb (-1..1,
 * down/up) and throttle (-1..1, slower/faster). Returns the distance flown.
 */
export function stepPlane(plane, ctl, dt) {
  plane.throttle = clamp(plane.throttle + ctl.throttle * dt * 0.7, 0, 1);
  const targetSpeed = PLANE.minSpeed + (PLANE.maxSpeed - PLANE.minSpeed) * plane.throttle;
  plane.speed += (targetSpeed - plane.speed) * Math.min(1, dt * 1.2);
  plane.bank = clamp(plane.bank + ctl.steer * PLANE.bankRate * dt, -PLANE.maxBank, PLANE.maxBank);
  plane.bank *= Math.max(0, 1 - dt * 1.4);
  // Banking slides the plane sideways; the heading follows the bank and then eases
  // back to the course heading, so a turn does not keep carrying the plane sideways
  // long after the pilot has levelled the wings.
  plane.x += plane.bank * plane.speed * 0.6 * dt;
  plane.heading += plane.bank * PLANE.turnRate * dt * (plane.speed / PLANE.cruiseSpeed);
  plane.heading *= Math.max(0, 1 - dt * 0.9);
  const targetPitch = clamp(ctl.climb, -1, 1) * 0.55;
  plane.pitch += (targetPitch - plane.pitch) * Math.min(1, dt * 2.2);
  plane.y += plane.pitch * PLANE.climbRate * dt;
  // The floor is just above the ground: low enough that a dive into the valley floor
  // or a mountain slope is a real crash, not a slide along an invisible cushion.
  plane.y = Math.max(plane.y, 0.2);
  plane.z += plane.speed * dt;
  plane.fuel = Math.max(0, plane.fuel - PLANE.fuelBurn * (0.45 + plane.throttle) * dt);
  return plane.speed * dt;
}
