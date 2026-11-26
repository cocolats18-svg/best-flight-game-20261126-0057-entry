// Sky Courier: constants for the whole game. One place for every tuned number so the
// course, the plane and the HUD all agree.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const COURSE = {
  ringCount: 12,
  firstRingZ: 260,
  ringGap: 230,
  runwayZ: 3050,
  runwayLength: 340,
  runwayHalfWidth: 12,
  townZ0: 1700,
  townZ1: 2350,
  courseEndZ: 3400,
};
export const PLANE = {
  startX: 0,
  startY: 22,
  startZ: 0,
  minSpeed: 26,
  maxSpeed: 118,
  cruiseSpeed: 62,
  climbRate: 30,
  sinkRate: 34,
  bankRate: 2.6,
  maxBank: 0.9,
  turnRate: 0.55,
  fuelMax: 100,
  fuelBurn: 1.05,
  fuelPerRing: 9,
  ringRadius: 11,
  lives: 3,
};
export const SCORE = { ring: 100, fastRing: 25, landBase: 500, landSpeed: 40 };
export const CAMERA = { behind: 16, above: 5, horizon: 0.42, focal: 640 };
