// Everything on screen: the sky, the valley seen from behind the plane, the rings and
// the runway, the plane itself, and the lit instruments and HUD. All drawing is plain
// 2D canvas; the world is projected from the chase camera behind the plane.
import { CAMERA, COURSE, PLANE, VIEW } from './config.js';
import { cellChance, groundHeight, isRunway, isTown, riverX } from './terrain.js';
import { clamp, lerp, valueNoise } from './random.js';
import { MODE_OVER, MODE_PLAY, MODE_TITLE } from './game.js';

const SLICES = 46;
const COLUMNS = 17;
const SPAN = 150;

function project(cam, x, y, z) {
  const dz = z - cam.z;
  if (dz < 4) return null;
  const scale = CAMERA.focal / dz;
  return {
    x: VIEW.width / 2 + (x - cam.x) * scale,
    y: VIEW.height * CAMERA.horizon - (y - cam.y) * scale,
    scale,
  };
}

/** Ground colour at (x, z), hazed toward the horizon sky colour with distance. */
function groundColour(x, z, h, seed, dz) {
  let r;
  let g;
  let b;
  const dRiver = Math.abs(x - riverX(z));
  if (dRiver < 7) {
    r = 46;
    g = 111;
    b = 158;
  } else if (dRiver < 10) {
    r = 122;
    g = 154;
    b = 106;
  } else if (isRunway(x, z)) {
    r = 60;
    g = 63;
    b = 69;
  } else if (isTown(x, z)) {
    r = 141;
    g = 133;
    b = 120;
  } else if (h > 30) {
    r = 238;
    g = 243;
    b = 246;
  } else if (h > 20) {
    r = 122;
    g = 125;
    b = 132;
  } else {
    const n = valueNoise(x * 0.15, z * 0.15, seed + 3) * 0.5 + 0.5;
    r = 58;
    g = Math.round(lerp(118, 158, n));
    b = 62;
  }
  const t = clamp(dz / 430, 0, 1) * 0.35;
  r = Math.round(lerp(r, 207, t));
  g = Math.round(lerp(g, 228, t));
  b = Math.round(lerp(b, 242, t));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Draw the terrain as projected ground slices, far to near. */
function drawTerrain(ctx, game) {
  const plane = game.plane;
  const cam = { x: plane.x * 0.85, y: plane.y + CAMERA.above, z: plane.z - CAMERA.behind };
  const zNear = cam.z + 8;
  const zFar = cam.z + 430;
  const slices = [];
  for (let i = 0; i < SLICES; i += 1) {
    const t = i / (SLICES - 1);
    slices.push(zNear + (zFar - zNear) * t * t);
  }
  // Far to near so near ground paints over far ground.
  for (let s = SLICES - 1; s > 0; s -= 1) {
    const z0 = slices[s - 1];
    const z1 = slices[s];
    for (let c = 0; c < COLUMNS; c += 1) {
      const x0 = -SPAN + (c / COLUMNS) * SPAN * 2;
      const x1 = -SPAN + ((c + 1) / COLUMNS) * SPAN * 2;
      const xc = (x0 + x1) / 2;
      // Heights at the column's own edges, not its centre, so neighbouring columns
      // share exact edge vertices and no dark sliver of page background shows through
      // where the ground falls away into the river or up a mountain.
      const h00 = groundHeight(x0, z0, game.seed);
      const h10 = groundHeight(x1, z0, game.seed);
      const h01 = groundHeight(x0, z1, game.seed);
      const h11 = groundHeight(x1, z1, game.seed);
      const a = project(cam, x0, h00, z0);
      const b = project(cam, x1, h10, z0);
      const d = project(cam, x1, h11, z1);
      const e = project(cam, x0, h01, z1);
      if (!a || !b || !d || !e) continue;
      ctx.fillStyle = groundColour(xc, z1, (h01 + h11) / 2, game.seed, z1 - cam.z);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(d.x, d.y);
      ctx.lineTo(e.x, e.y);
      ctx.closePath();
      ctx.fill();
    }
  }
  return cam;
}

/** Trees, houses and runway dashes, drawn after the ground. */
function drawDetails(ctx, game, cam) {
  const plane = game.plane;
  for (let s = 1; s < SLICES; s += 2) {
    const t = s / (SLICES - 1);
    const z = cam.z + 8 + 422 * t * t;
    for (let c = 0; c < COLUMNS; c += 1) {
      const x = -SPAN + ((c + 0.5) / COLUMNS) * SPAN * 2;
      const h = groundHeight(x, z, game.seed);
      const p = project(cam, x, h, z);
      if (!p || p.x < -40 || p.x > VIEW.width + 40) continue;
      if (isTown(x, z) && cellChance(c * 7 + 1, Math.floor(z / 18), game.seed) < 0.5) {
        const w = 26 * p.scale;
        const hh = 20 * p.scale;
        ctx.fillStyle = '#6b5d4f';
        ctx.fillRect(p.x - w / 2, p.y - hh, w, hh);
        ctx.fillStyle = '#a34a3a';
        ctx.beginPath();
        ctx.moveTo(p.x - w / 2, p.y - hh);
        ctx.lineTo(p.x, p.y - hh - w * 0.32);
        ctx.lineTo(p.x + w / 2, p.y - hh);
        ctx.closePath();
        ctx.fill();
      } else if (
        Math.abs(x) > 16 &&
        Math.abs(x - riverX(z)) > 11 &&
        !isRunway(x, z) &&
        p.scale < 7 &&
        cellChance(c * 3 + 2, Math.floor(z / 14), game.seed) < 0.34
      ) {
        // Near trees would be giants on screen, so only draw them once they are far
        // enough away to read as pines, and cap their size.
        const size = Math.min(15 * p.scale, 54);
        ctx.fillStyle = '#1e4d2a';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - size * 1.6);
        ctx.lineTo(p.x - size * 0.7, p.y);
        ctx.lineTo(p.x + size * 0.7, p.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  // Runway centre dashes.
  for (let z = COURSE.runwayZ - COURSE.runwayLength / 2; z < COURSE.runwayZ + COURSE.runwayLength / 2; z += 26) {
    const a = project(cam, 0, 0.4, z);
    const b = project(cam, 0, 0.4, z + 13);
    if (!a || !b) continue;
    ctx.strokeStyle = '#f2f2e8';
    ctx.lineWidth = Math.max(1, 1.6 * a.scale);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function drawClouds(ctx, game, cam) {
  for (const cloud of game.clouds) {
    const p = project(cam, cloud.x, cloud.y, cloud.z);
    if (!p || p.y > VIEW.height * CAMERA.horizon + 30) continue;
    const r = cloud.size * p.scale;
    if (r < 2) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 0.42, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x - r * 0.6, p.y + r * 0.08, r * 0.6, r * 0.3, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + r * 0.6, p.y + r * 0.06, r * 0.65, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRings(ctx, game, cam) {
  const rings = [...game.rings].sort((a, b) => b.z - a.z);
  for (const ring of rings) {
    if (ring.z < cam.z + 6 || ring.z > cam.z + 430) continue;
    const p = project(cam, ring.x, ring.y, ring.z);
    if (!p) continue;
    const r = PLANE.ringRadius * p.scale;
    if (r < 3) continue;
    const near = ring.z - game.plane.z < 90;
    ctx.lineWidth = Math.max(2, r * 0.14);
    ctx.strokeStyle = ring.passed ? 'rgba(120,220,140,0.85)' : near ? '#ffd94a' : '#ff9d2e';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    if (ring.index === game.ringIndex) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(12, Math.round(r * 0.3))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`RING ${ring.index + 1}`, p.x, p.y - r - 8);
    }
  }
}

/** The courier plane from behind: fuselage, wings, tail and spinning prop blur. */
function drawPlane(ctx, game) {
  const plane = game.plane;
  const cx = VIEW.width / 2;
  const cy = VIEW.height * 0.74 + plane.pitch * 26;
  const scale = 1 + plane.speed / 240;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-plane.bank * 0.55);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#c33';
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8e8e8';
  ctx.beginPath();
  ctx.ellipse(0, -6, 17, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9ecfe8';
  ctx.beginPath();
  ctx.ellipse(0, -18, 9, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c33';
  ctx.beginPath();
  ctx.moveTo(-14, 8);
  ctx.lineTo(-86, 22);
  ctx.lineTo(-84, 30);
  ctx.lineTo(-12, 18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, 8);
  ctx.lineTo(86, 22);
  ctx.lineTo(84, 30);
  ctx.lineTo(12, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a2a2a';
  ctx.beginPath();
  ctx.moveTo(-8, 26);
  ctx.lineTo(-30, 40);
  ctx.lineTo(-26, 44);
  ctx.lineTo(-6, 34);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, 26);
  ctx.lineTo(30, 40);
  ctx.lineTo(26, 44);
  ctx.lineTo(6, 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 30, 5, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function dial(ctx, x, y, r, label, value, max, unit) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(8,14,20,0.82)';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7ee7ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#7ee7ff';
  for (let i = 0; i <= 10; i += 1) {
    const a = -Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    const inner = i % 5 === 0 ? r - 12 : r - 8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
    ctx.stroke();
  }
  const angle = -Math.PI * 0.75 + clamp(value / max, 0, 1) * Math.PI * 1.5;
  ctx.strokeStyle = '#ffd94a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(angle) * (r - 14), Math.sin(angle) * (r - 14));
  ctx.stroke();
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, r * 0.45);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#9fd8ef';
  ctx.fillText(`${Math.round(value)} ${unit}`, 0, r * 0.68);
  ctx.restore();
}

function drawCompass(ctx, game) {
  const heading = ((game.plane.heading * 180) / Math.PI) % 360;
  const deg = (heading + 360) % 360;
  const points = [
    [0, 'N'],
    [45, 'NE'],
    [90, 'E'],
    [135, 'SE'],
    [180, 'S'],
    [225, 'SW'],
    [270, 'W'],
    [315, 'NW'],
  ];
  ctx.save();
  ctx.fillStyle = 'rgba(8,14,20,0.82)';
  ctx.fillRect(VIEW.width / 2 - 190, 12, 380, 34);
  ctx.strokeStyle = '#7ee7ff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(VIEW.width / 2 - 190, 12, 380, 34);
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px sans-serif';
  for (const [d, name] of points) {
    let diff = d - deg;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    if (Math.abs(diff) > 95) continue;
    const x = VIEW.width / 2 + diff * 2;
    ctx.fillStyle = Math.abs(diff) < 6 ? '#ffd94a' : '#cfeeff';
    ctx.fillText(name, x, 34);
  }
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath();
  ctx.moveTo(VIEW.width / 2, 12);
  ctx.lineTo(VIEW.width / 2 - 6, 4);
  ctx.lineTo(VIEW.width / 2 + 6, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, game) {
  const plane = game.plane;
  ctx.fillStyle = 'rgba(8,14,20,0.82)';
  ctx.fillRect(14, 12, 250, 62);
  ctx.strokeStyle = '#7ee7ff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(14, 12, 250, 62);
  ctx.fillStyle = '#eaf6ff';
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`SCORE ${game.score}`, 26, 38);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#9fd8ef';
  ctx.fillText(`RINGS ${game.ringIndex}/${COURSE.ringCount}   TIME ${game.time.toFixed(1)}s`, 26, 60);
  // Fuel gauge, top right.
  ctx.fillStyle = 'rgba(8,14,20,0.82)';
  ctx.fillRect(VIEW.width - 224, 12, 210, 62);
  ctx.strokeStyle = '#7ee7ff';
  ctx.strokeRect(VIEW.width - 224, 12, 210, 62);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('FUEL', VIEW.width - 212, 34);
  ctx.fillStyle = '#123';
  ctx.fillRect(VIEW.width - 212, 42, 186, 14);
  ctx.fillStyle = plane.fuel < 25 ? '#ff5a4a' : '#4ad07a';
  ctx.fillRect(VIEW.width - 212, 42, 186 * (plane.fuel / PLANE.fuelMax), 14);
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('♥'.repeat(game.lives), VIEW.width - 212, 70 - 8);
  drawCompass(ctx, game);
  // Lit instruments, bottom corners.
  dial(ctx, 92, VIEW.height - 92, 62, 'ALT', plane.y * 32, 2200, 'ft');
  dial(ctx, 236, VIEW.height - 92, 62, 'SPEED', plane.speed * 2.2, 260, 'kt');
  // Throttle bar, bottom right.
  ctx.fillStyle = 'rgba(8,14,20,0.82)';
  ctx.fillRect(VIEW.width - 76, VIEW.height - 168, 52, 156);
  ctx.strokeStyle = '#7ee7ff';
  ctx.strokeRect(VIEW.width - 76, VIEW.height - 168, 52, 156);
  ctx.fillStyle = '#4ad07a';
  const th = plane.throttle * 128;
  ctx.fillRect(VIEW.width - 66, VIEW.height - 26 - th, 32, th);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THR', VIEW.width - 50, VIEW.height - 176);
  if (game.messageTime > 0) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.message, VIEW.width / 2, 84);
  }
  if (game.ringIndex >= COURSE.ringCount && game.mode === MODE_PLAY) {
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ALL RINGS DONE — LAND ON THE RUNWAY!', VIEW.width / 2, 112);
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(4,8,14,0.48)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = accent;
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW.width / 2, 210);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '20px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 270 + i * 34));
}

export function draw(ctx, game) {
  // Sky.
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height * CAMERA.horizon + 40);
  sky.addColorStop(0, '#2f6fb2');
  sky.addColorStop(0.7, '#8ec3e8');
  sky.addColorStop(1, '#d8ecf7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height * CAMERA.horizon + 40);
  // Sun.
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(VIEW.width - 190, 96, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,243,196,0.35)';
  ctx.beginPath();
  ctx.arc(VIEW.width - 190, 96, 52, 0, Math.PI * 2);
  ctx.fill();

  const cam = drawTerrain(ctx, game);
  drawClouds(ctx, game, cam);
  drawDetails(ctx, game, cam);
  drawRings(ctx, game, cam);
  drawPlane(ctx, game);

  if (game.mode === MODE_PLAY) drawHud(ctx, game);

  if (game.mode === MODE_TITLE) {
    overlay(ctx, 'SKY COURIER', [
      'Ring run over Pine Valley — fly all 12 rings, then land on the runway.',
      'Arrows / WASD: steer and climb  •  Shift / Ctrl: throttle  •  Mouse: steer',
      'Rings refuel you. Mountains and the ground do not forgive.',
      'Press ENTER or click to take off',
    ], '#ffd94a');
  }
  if (game.mode === MODE_OVER) {
    if (game.landed) {
      overlay(ctx, 'DELIVERED!', [
        `You landed the courier run. Score ${game.score} — best ${game.best}.`,
        'Press ENTER or click to fly again',
      ], '#4ad07a');
    } else {
      overlay(ctx, 'FLIGHT OVER', [
        `${game.crashReason}. Rings ${game.ringIndex}/${COURSE.ringCount} — score ${game.score}, best ${game.best}.`,
        'Press ENTER or click to fly again',
      ], '#ff5a4a');
    }
  }
}
