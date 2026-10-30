"use strict";

// ---------------------------------------------------------------------------
// Frame
// ---------------------------------------------------------------------------

function drawFrame(now) {
  const w = view.w;
  const h = view.h;
  const shake = game.shake;
  const sx = shake > 0.2 ? rand(-shake, shake) : 0;
  const sy = shake > 0.2 ? rand(-shake, shake) : 0;
  const zoom = 1;

  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(sx, sy);

  drawBackground(now);

  drawShadow(enemy);
  drawShadow(player);

  drawFighter(enemy, now);
  drawFighter(player, now);

  drawProjectiles(now);
  drawBeams(now);
  drawParticles(now);
  drawCombo(now);

  ctx.restore();
  drawScreenFX(now);
}

function drawBackground(now) {
  const w = view.w;
  const h = view.h;
  const cam = game.camX;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#03030e");
  sky.addColorStop(0.32, "#08081e");
  sky.addColorStop(0.62, "#141033");
  sky.addColorStop(0.82, "#29153e");
  sky.addColorStop(1, "#0a0615");
  ctx.fillStyle = sky;
  ctx.fillRect(-30, -30, w + 60, h + 60);

  drawNebula(w, h, cam);
  drawPlanet(now, cam);
  drawDragon(now, cam);
  drawStars(now, cam);
  drawHorizonHaze(now);

  drawArena(now);
  drawPillars(now);
  drawFloatingRocks(now, cam);
  drawDragonBalls(now, cam);
  drawMotes(now, cam);
  drawGroundMist(now);
}

function drawNebula(w, h, cam) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g1 = ctx.createRadialGradient(w * 0.2 - cam * 0.08, h * 0.35, 0, w * 0.2 - cam * 0.08, h * 0.35, w * 0.45);
  g1.addColorStop(0, "rgba(255,91,29,0.10)");
  g1.addColorStop(0.45, "rgba(165,43,92,0.055)");
  g1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, w, h);

  const g2 = ctx.createRadialGradient(w * 0.8 - cam * 0.13, h * 0.4, 0, w * 0.8 - cam * 0.13, h * 0.4, w * 0.5);
  g2.addColorStop(0, "rgba(31,196,255,0.11)");
  g2.addColorStop(0.5, "rgba(34,80,196,0.05)");
  g2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, w, h);

  const g3 = ctx.createRadialGradient(w * 0.5, h * 0.72, 0, w * 0.5, h * 0.72, w * 0.7);
  g3.addColorStop(0, "rgba(255,151,50,0.06)");
  g3.addColorStop(0.65, "rgba(126,39,131,0.03)");
  g3.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g3;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawStars(now, cam) {
  const w = view.w;
  const h = view.h;
  for (const s of stars) {
    const x = (s.x * w - cam * s.depth * 0.35 + w * 2) % w;
    const y = s.y * h;
    const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * s.speed + s.phase));
    let color = "255,255,255";
    if (s.tint === "warm") color = "255,220,167";
    if (s.tint === "cool") color = "168,224,255";
    ctx.fillStyle = "rgba(" + color + "," + (twinkle * 0.68).toFixed(3) + ")";
    ctx.beginPath();
    ctx.arc(x, y, s.size * (0.7 + twinkle * 0.5), 0, TAU);
    ctx.fill();
    if (s.size > 1.3 && twinkle > 0.82) {
      ctx.strokeStyle = "rgba(" + color + "," + (twinkle * 0.18).toFixed(3) + ")";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x - s.size * 2.2, y);
      ctx.lineTo(x + s.size * 2.2, y);
      ctx.moveTo(x, y - s.size * 2.2);
      ctx.lineTo(x, y + s.size * 2.2);
      ctx.stroke();
    }
  }

  const shoot = (now * 0.085) % 1;
  if (shoot < 0.025) {
    const p = shoot / 0.025;
    const x = view.w * 0.18 + p * view.w * 0.36;
    const y = view.h * 0.12 + p * view.h * 0.1;
    const grad = ctx.createLinearGradient(x, y, x - view.base * 3.6, y - view.base * 0.7);
    grad.addColorStop(0, "rgba(255,255,255,0.8)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - view.base * 3.6, y - view.base * 0.7);
    ctx.stroke();
  }
}

function drawPlanet(now, cam) {
  const w = view.w;
  const h = view.h;
  const base = view.base;
  const px = w * (view.portrait ? 0.77 : 0.78) - cam * 0.18;
  const py = h * (view.portrait ? 0.19 : 0.22);
  const r = clamp(Math.min(w, h) * 0.15, 58, 148);

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(-0.28);

  ctx.strokeStyle = "rgba(253,191,99,0.14)";
  ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.9, r * 0.43, 0, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "rgba(112,225,255,0.08)";
  ctx.lineWidth = r * 0.035;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 2.02, r * 0.47, 0, 0, TAU);
  ctx.stroke();

  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, "#ffd88b");
  g.addColorStop(0.35, "#e78943");
  g.addColorStop(0.62, "#8c3b66");
  g.addColorStop(0.86, "#3d1a4d");
  g.addColorStop(1, "#170b27");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.clip();
  ctx.fillStyle = "rgba(255,212,135,0.16)";
  for (let i = 0; i < 5; i++) {
    const y = -r * 0.52 + i * r * 0.27;
    ctx.beginPath();
    ctx.ellipse(0, y, r * 0.95, r * (0.07 + i * 0.013), -0.15, 0, TAU);
    ctx.fill();
  }
  const shade = ctx.createLinearGradient(-r, 0, r, 0);
  shade.addColorStop(0, "rgba(1,1,14,0)");
  shade.addColorStop(0.7, "rgba(2,2,16,0.12)");
  shade.addColorStop(1, "rgba(2,2,16,0.62)");
  ctx.fillStyle = shade;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(-r * 2.2, 0, r * 4.4, r * 1.2);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,204,118,0.23)";
  ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.9, r * 0.43, 0, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "rgba(124,240,255,0.13)";
  ctx.lineWidth = r * 0.035;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 2.02, r * 0.47, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();

  ctx.restore();

  const moonX = w * 0.1 - cam * 0.11;
  const moonY = h * 0.15;
  const mr = clamp(base * 0.23, 11, 34);
  const mg = ctx.createRadialGradient(moonX - mr * 0.3, moonY - mr * 0.3, 1, moonX, moonY, mr);
  mg.addColorStop(0, "rgba(220,252,255,0.85)");
  mg.addColorStop(0.6, "rgba(91,205,255,0.55)");
  mg.addColorStop(1, "rgba(21,83,154,0)");
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(moonX, moonY, mr, 0, TAU);
  ctx.fill();

  if (!reducedMotion) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.45);
    ctx.strokeStyle = "rgba(113,239,255," + (0.04 + pulse * 0.025).toFixed(3) + ")";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(moonX, moonY, mr * 1.55, mr * 1.55, 0, 0, TAU);
    ctx.stroke();
  }
}

function drawDragon(now, cam) {
  const w = view.w;
  const h = view.h;
  const base = view.base;
  const drift = Math.sin(now * 0.11) * base * 0.2;
  const y = h * 0.21 + drift;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const grad = ctx.createLinearGradient(w * 0.05, y, w * 0.95, y + base * 0.7);
  grad.addColorStop(0, "rgba(255,100,40,0.03)");
  grad.addColorStop(0.4, "rgba(82,238,207,0.075)");
  grad.addColorStop(0.75, "rgba(91,199,255,0.055)");
  grad.addColorStop(1, "rgba(255,105,203,0.025)");
  ctx.strokeStyle = grad;
  ctx.lineCap = "round";
  ctx.lineWidth = base * 0.48;
  ctx.beginPath();
  ctx.moveTo(w * 0.06 - cam * 0.3, y + base * 0.35);
  ctx.bezierCurveTo(w * 0.23, y - base * 0.45, w * 0.38, y + base * 0.48, w * 0.51, y + base * 0.05);
  ctx.bezierCurveTo(w * 0.64, y - base * 0.4, w * 0.79, y + base * 0.27, w * 0.96, y - base * 0.02);
  ctx.stroke();

  ctx.strokeStyle = "rgba(163,255,232,0.065)";
  ctx.lineWidth = base * 0.11;
  ctx.beginPath();
  ctx.moveTo(w * 0.06 - cam * 0.3, y + base * 0.35);
  ctx.bezierCurveTo(w * 0.23, y - base * 0.45, w * 0.38, y + base * 0.48, w * 0.51, y + base * 0.05);
  ctx.bezierCurveTo(w * 0.64, y - base * 0.4, w * 0.79, y + base * 0.27, w * 0.96, y - base * 0.02);
  ctx.stroke();

  const hx = w * 0.075 - cam * 0.3;
  const hy = y + base * 0.34;
  ctx.translate(hx, hy);
  ctx.fillStyle = "rgba(118,242,216,0.06)";
  ctx.beginPath();
  ctx.ellipse(0, 0, base * 0.28, base * 0.16, -0.15, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(154,255,232,0.16)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-base * 0.18, -base * 0.05);
  ctx.quadraticCurveTo(-base * 0.38, -base * 0.26, -base * 0.27, -base * 0.4);
  ctx.moveTo(-base * 0.1, -base * 0.1);
  ctx.quadraticCurveTo(-base * 0.2, -base * 0.38, -base * 0.02, -base * 0.46);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,198,105,0.65)";
  ctx.beginPath();
  ctx.arc(-base * 0.05, -base * 0.035, 1.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawHorizonHaze(now) {
  const w = view.w;
  const h = view.h;
  const ground = view.ground;
  const g = ctx.createLinearGradient(0, ground - view.base * 1.8, 0, ground + view.base * 0.5);
  g.addColorStop(0, "rgba(255,113,45,0)");
  g.addColorStop(0.65, "rgba(238,102,63,0.035)");
  g.addColorStop(1, "rgba(255,154,71,0.07)");
  ctx.fillStyle = g;
  ctx.fillRect(0, ground - view.base * 1.8, w, view.base * 2.3);
}

// ---------------------------------------------------------------------------
// Arena
// ---------------------------------------------------------------------------

function drawArena(now) {
  const w = view.w;
  const ground = view.ground;
  const base = view.base;
  const cx = w * 0.5;
  const cy = ground + base * 0.055;
  const rx = w * (view.portrait ? 0.69 : 0.59);
  const ry = base * (view.portrait ? 0.3 : 0.26);

  const under = ctx.createLinearGradient(0, cy, 0, cy + base * 0.65);
  under.addColorStop(0, "#24152e");
  under.addColorStop(0.45, "#120b1d");
  under.addColorStop(1, "rgba(4,3,12,0)");
  ctx.fillStyle = under;
  ctx.beginPath();
  ctx.ellipse(cx, cy + base * 0.23, rx, ry, 0, 0, TAU);
  ctx.fill();

  const rimGlow = ctx.createRadialGradient(cx, cy, base * 0.1, cx, cy, rx * 0.6);
  rimGlow.addColorStop(0, "rgba(255,157,67,0.07)");
  rimGlow.addColorStop(0.55, "rgba(84,218,255,0.035)");
  rimGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rimGlow;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  ctx.fill();

  const top = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
  top.addColorStop(0, "#4a314e");
  top.addColorStop(0.38, "#29203a");
  top.addColorStop(0.72, "#1d152c");
  top.addColorStop(1, "#0e0a19");
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,184,94,0.45)";
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = "rgba(101,232,255,0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.895, ry * 0.84, 0, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,215,134,0.13)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.64, ry * 0.62, 0, 0, TAU);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  ctx.clip();

  ctx.strokeStyle = "rgba(6,4,12,0.5)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 22; i++) {
    const a = -Math.PI * 0.06 + i * 0.145;
    const x1 = cx + Math.cos(a) * rx * 0.08;
    const y1 = cy + Math.sin(a) * ry * 0.08;
    const x2 = cx + Math.cos(a + rand(-0.05, 0.05)) * rx * 0.98;
    const y2 = cy + Math.sin(a + rand(-0.08, 0.08)) * ry * 0.98;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  for (let i = 0; i < 7; i++) {
    const a = i * 0.9;
    const rr = base * (0.32 + (i % 3) * 0.18);
    ctx.save();
    ctx.translate(cx + Math.cos(a) * base * 0.75, cy + Math.sin(a) * base * 0.16);
    ctx.rotate(a);
    ctx.strokeStyle = "rgba(104,239,255,0.12)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-rr * 0.18, 0);
    ctx.lineTo(rr * 0.12, 0);
    ctx.lineTo(rr * 0.05, rr * 0.12);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const pulse = 0.65 + Math.sin(now * 1.4) * 0.25;
  ctx.strokeStyle = "rgba(104,239,255," + (0.07 * pulse).toFixed(3) + ")";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.53, ry * 0.52, 0, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,188,90,0.035)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.42, ry * 0.4, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  for (let i = 0; i < 26; i++) {
    const a = -Math.PI * 0.03 + i * 0.121;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    ctx.fillStyle = i % 2 ? "rgba(74,53,82,0.9)" : "rgba(38,29,54,0.95)";
    ctx.beginPath();
    ctx.moveTo(x, y - 2);
    ctx.lineTo(x + Math.cos(a) * base * 0.08, y + base * 0.13);
    ctx.lineTo(x - base * 0.035, y + base * 0.15);
    ctx.closePath();
    ctx.fill();
  }

  const underGlow = ctx.createRadialGradient(cx, cy + base * 0.15, 0, cx, cy + base * 0.15, rx * 0.6);
  underGlow.addColorStop(0, "rgba(255,157,64,0.11)");
  underGlow.addColorStop(0.55, "rgba(60,194,255,0.035)");
  underGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = underGlow;
  ctx.beginPath();
  ctx.ellipse(cx, cy + base * 0.24, rx * 0.7, ry * 0.9, 0, 0, TAU);
  ctx.fill();
}

function drawPillars(now) {
  const w = view.w;
  const ground = view.ground;
  const base = view.base;
  const cam = game.camX;
  const sides = [-1, 1];
  for (const side of sides) {
    const x = side < 0 ? w * 0.055 - cam * 0.4 : w * 0.945 - cam * 0.4;
    const top = ground - base * 2.25;
    const width = base * 0.24;
    ctx.save();
    ctx.translate(x, ground + base * 0.12);

    const body = ctx.createLinearGradient(-width, 0, width, 0);
    body.addColorStop(0, "#151123");
    body.addColorStop(0.42, "#33233d");
    body.addColorStop(0.7, "#22182f");
    body.addColorStop(1, "#0d0a18");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-width, 0);
    ctx.lineTo(-width * 0.7 + side * base * 0.03, top - ground);
    ctx.lineTo(width * 0.62 + side * base * 0.03, top - ground - base * 0.08);
    ctx.lineTo(width, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,187,96,0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-width * 0.7, top - ground + base * 0.03);
    ctx.lineTo(width * 0.55, top - ground - base * 0.04);
    ctx.stroke();

    for (let i = 0; i < 5; i++) {
      const yy = -base * 0.35 - i * base * 0.36;
      ctx.strokeStyle = "rgba(126,238,255,0.05)";
      ctx.beginPath();
      ctx.moveTo(-width * 0.6, yy);
      ctx.lineTo(width * 0.55, yy - base * 0.04);
      ctx.stroke();
    }

    const runeY = -base * 1.15;
    ctx.save();
    ctx.translate(0, runeY);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = "rgba(110,240,255,0.4)";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-base * 0.055, -base * 0.055, base * 0.11, base * 0.11);
    ctx.restore();

    ctx.fillStyle = "rgba(255,159,62,0.4)";
    ctx.beginPath();
    ctx.arc(side * base * 0.08, top - ground - base * 0.28, base * 0.032, 0, TAU);
    ctx.fill();

    const orbG = ctx.createRadialGradient(0, top - ground - base * 0.25, 0, 0, top - ground - base * 0.25, base * 0.23);
    orbG.addColorStop(0, "rgba(255,212,110,0.55)");
    orbG.addColorStop(1, "rgba(255,126,34,0)");
    ctx.fillStyle = orbG;
    ctx.beginPath();
    ctx.arc(0, top - ground - base * 0.25, base * 0.23, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "rgba(117,242,255,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, top - ground - base * 0.25, base * 0.18, base * 0.04, 0, 0, TAU);
    ctx.stroke();

    ctx.restore();
  }
}

function drawFloatingRocks(now, cam) {
  const w = view.w;
  const h = view.h;
  const base = view.base;
  for (const rock of floatingRocks) {
    const x = rock.x * w - cam * rock.depth * 0.5;
    const y = rock.y * h + Math.sin(now * 0.35 + rock.phase) * base * 0.12;
    const size = base * rock.s;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(now * 0.18 + rock.phase) * 0.08 + rock.phase * 0.2);
    const g = ctx.createLinearGradient(-size, -size, size, size);
    g.addColorStop(0, "rgba(60,45,74,0.92)");
    g.addColorStop(0.55, "rgba(29,23,45,0.9)");
    g.addColorStop(1, "rgba(10,8,20,0.68)");
    ctx.fillStyle = g;
    ctx.beginPath();
    const pts = 8;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * TAU;
      const rr = size * (0.62 + Math.sin(i * 2.4 + rock.phase) * 0.23);
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr * 0.7;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,186,93,0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "rgba(111,239,255,0.18)";
    ctx.beginPath();
    ctx.ellipse(size * 0.12, -size * 0.27, size * 0.26, size * 0.04, 0.3, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "rgba(111,239,255,0.09)";
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, 0);
    ctx.lineTo(size * 0.18, size * 0.1);
    ctx.stroke();
    ctx.restore();
  }
}

function starPath(x, y, outer, inner, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawDragonBalls(now, cam) {
  const w = view.w;
  const h = view.h;
  const base = view.base;
  for (const ball of dragonBalls) {
    const x = ball.x * w - cam * 0.4;
    const y = ball.y * h + Math.sin(now * 0.55 + ball.phase) * base * 0.16;
    const r = Math.max(5, base * ball.s * 1.4);
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 0, x, y, r * 2.1);
    g.addColorStop(0, "rgba(255,245,185,0.92)");
    g.addColorStop(0.22, "rgba(255,196,63,0.8)");
    g.addColorStop(0.5, "rgba(255,120,26,0.26)");
    g.addColorStop(1, "rgba(255,93,22,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.1, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "rgba(255,165,45,0.92)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,244,188,0.8)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "rgba(189,33,30,0.88)";
    const count = Math.min(7, ball.stars);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + 0.4;
      const rr = i === 0 ? 0 : r * 0.52;
      starPath(x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * 0.2, r * 0.085, 5);
      ctx.fill();
    }
  }
}

function drawMotes(now, cam) {
  const w = view.w;
  const h = view.h;
  const base = view.base;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const m of ambientMotes) {
    const drift = (now * m.speed) % 1;
    const x = ((m.x + drift * 0.03) % 1) * w - cam * m.depth * 0.3;
    const y = h - ((m.y + drift * 0.45) % 1) * h * 0.86;
    const alpha = 0.12 + 0.3 * (0.5 + 0.5 * Math.sin(now * 0.8 + m.phase));
    ctx.fillStyle = m.warm
      ? "rgba(255,190,92," + alpha.toFixed(3) + ")"
      : "rgba(115,238,255," + (alpha * 0.8).toFixed(3) + ")";
    ctx.beginPath();
    ctx.arc(x, y, m.size, 0, TAU);
    ctx.fill();
  }

  const emberCount = reducedMotion ? 9 : 20;
  for (let i = 0; i < emberCount; i++) {
    const seedX = (i * 0.137 + now * 0.012) % 1;
    const x = seedX * w;
    const y = view.ground - ((now * (0.035 + (i % 5) * 0.012) + i * 0.13) % 1) * base * 1.8;
    const a = 0.15 + 0.2 * Math.sin(now * 2 + i);
    ctx.fillStyle = i % 2 ? "rgba(255,172,65," + a.toFixed(3) + ")" : "rgba(92,229,255," + (a * 0.6).toFixed(3) + ")";
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3) * 0.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawGroundMist(now) {
  const w = view.w;
  const h = view.h;
  const ground = view.ground;
  const base = view.base;
  const g = ctx.createLinearGradient(0, ground - base * 0.4, 0, h);
  g.addColorStop(0, "rgba(97,77,142,0)");
  g.addColorStop(0.35, "rgba(73,52,111,0.09)");
  g.addColorStop(0.7, "rgba(24,16,48,0.26)");
  g.addColorStop(1, "rgba(3,3,12,0.62)");
  ctx.fillStyle = g;
  ctx.fillRect(-20, ground - base * 0.4, w + 40, h - ground + base * 0.4);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i++) {
    const x = ((i * 0.27 + now * 0.006) % 1) * w;
    const y = ground + base * (0.12 + i * 0.04);
    const rx = base * (1.4 + i * 0.4);
    const rg = ctx.createRadialGradient(x, y, 0, x, y, rx);
    rg.addColorStop(0, "rgba(122,103,179,0.035)");
    rg.addColorStop(1, "rgba(122,103,179,0)");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, base * 0.12, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------

function drawShadow(f) {
  if (!f) return;
  const x = f.x * view.w;
  const y = view.ground + view.base * 0.085;
  const lift = clamp(f.y / (view.base * 1.25), 0, 1);
  const rx = view.base * 0.82 * (1 - lift * 0.22);
  const ry = view.base * 0.18 * (1 - lift * 0.25);
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, "rgba(1,1,7," + (0.58 - lift * 0.25).toFixed(3) + ")");
  g.addColorStop(0.65, "rgba(4,3,12," + (0.32 - lift * 0.12).toFixed(3) + ")");
  g.addColorStop(1, "rgba(4,3,12,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Projectiles / beams
// ---------------------------------------------------------------------------

function drawProjectiles(now) {
  for (const p of game.projectiles) {
    if (p.type === "repulsor") {
      const r = view.base * 0.22;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.4);
      g.addColorStop(0, "rgba(255,255,255,0.98)");
      g.addColorStop(0.2, "rgba(166,250,255,0.95)");
      g.addColorStop(0.55, "rgba(41,203,255,0.4)");
      g.addColorStop(1, "rgba(17,117,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 2.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.35, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(128,246,255,0.55)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(p.x - p.dir * r * 0.7, p.y);
      ctx.lineTo(p.x - p.dir * r * 4.6, p.y + Math.sin(now * 70) * 2);
      ctx.stroke();
      ctx.restore();
    } else if (p.type === "spirit") {
      const r = p.radius;
      const x = p.x;
      const y = p.y;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 2.3);
      halo.addColorStop(0, "rgba(255,255,255,0.98)");
      halo.addColorStop(0.15, "rgba(217,254,255,0.88)");
      halo.addColorStop(0.38, "rgba(78,225,255,0.5)");
      halo.addColorStop(0.7, "rgba(33,108,255,0.17)");
      halo.addColorStop(1, "rgba(18,49,255,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.3, 0, TAU);
      ctx.fill();

      const core = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
      core.addColorStop(0, "#ffffff");
      core.addColorStop(0.35, "#d9fcff");
      core.addColorStop(0.7, "#49d8ff");
      core.addColorStop(1, "rgba(28,136,255,0.4)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = "rgba(196,252,255,0.65)";
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 4; i++) {
        const a = now * (1.3 + i * 0.2) + i * 1.8;
        ctx.beginPath();
        ctx.ellipse(x, y, r * (1.15 + i * 0.12), r * (0.3 + i * 0.04), a, 0, TAU);
        ctx.stroke();
      }
      for (let i = 0; i < 5; i++) {
        const a = now * 2.1 + i * 1.27;
        ctx.strokeStyle = "rgba(205,253,255,0.35)";
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r * 1.08, y + Math.sin(a) * r * 1.08);
        ctx.lineTo(x + Math.cos(a + 0.18) * r * (1.5 + Math.sin(now * 5 + i) * 0.1), y + Math.sin(a + 0.18) * r * 1.5);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

function drawBeams(now) {
  for (const b of game.beams) {
    const fade = clamp(1 - b.t / b.dur, 0, 1);
    const endX = b.dir > 0 ? view.w + view.base : -view.base;
    const y = b.y + Math.sin(now * 70 + b.x) * view.base * 0.012;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    const outer = b.type === "kame" ? "120,246,255" : "183,253,255";
    const mid = b.type === "kame" ? "43,199,255" : "87,217,255";

    ctx.strokeStyle = "rgba(" + outer + "," + (0.18 * fade).toFixed(3) + ")";
    ctx.lineWidth = b.width * 3.2;
    ctx.beginPath();
    ctx.moveTo(b.x, y);
    ctx.lineTo(endX, y);
    ctx.stroke();

    const g = ctx.createLinearGradient(b.x, y - b.width, b.x, y + b.width);
    g.addColorStop(0, "rgba(" + mid + "," + (0.06 * fade).toFixed(3) + ")");
    g.addColorStop(0.28, "rgba(" + outer + "," + (0.72 * fade).toFixed(3) + ")");
    g.addColorStop(0.5, "rgba(255,255,255," + (0.98 * fade).toFixed(3) + ")");
    g.addColorStop(0.72, "rgba(" + outer + "," + (0.72 * fade).toFixed(3) + ")");
    g.addColorStop(1, "rgba(" + mid + "," + (0.06 * fade).toFixed(3) + ")");
    ctx.strokeStyle = g;
    ctx.lineWidth = b.width;
    ctx.beginPath();
    ctx.moveTo(b.x, y);
    ctx.lineTo(endX, y);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255," + (0.72 * fade).toFixed(3) + ")";
    ctx.lineWidth = b.width * 0.22;
    ctx.beginPath();
    ctx.moveTo(b.x, y - b.width * 0.04);
    ctx.lineTo(endX, y - b.width * 0.04);
    ctx.stroke();

    for (let i = 0; i < 5; i++) {
      const yy = y + Math.sin(now * 50 + i * 4.7) * b.width * 0.35;
      ctx.strokeStyle = "rgba(255,255,255," + (0.28 * fade).toFixed(3) + ")";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(b.x + b.dir * b.width * 0.4, yy);
      ctx.lineTo(endX, yy + Math.sin(now * 9 + i) * b.width * 0.07);
      ctx.stroke();
    }

    const orb = ctx.createRadialGradient(b.x, y, 0, b.x, y, b.width * 1.25);
    orb.addColorStop(0, "rgba(255,255,255," + fade.toFixed(3) + ")");
    orb.addColorStop(0.38, "rgba(" + outer + "," + (0.65 * fade).toFixed(3) + ")");
    orb.addColorStop(1, "rgba(" + mid + ",0)");
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.width * 1.3, 0, TAU);
    ctx.fill();

    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Particles / combo / screen effects
// ---------------------------------------------------------------------------

function drawParticles(now) {
  for (const p of game.particles) {
    const lifeRatio = clamp(p.life / p.maxLife, 0, 1);
    if (p.kind === "text") {
      const alpha = clamp(lifeRatio * 2.2, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "italic 900 " + Math.round(p.size) + "px 'Arial Black', Impact, sans-serif";
      ctx.lineWidth = Math.max(2, p.size * 0.16);
      ctx.strokeStyle = "rgba(9,5,20,0.88)";
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
      continue;
    }

    if (p.kind === "ring") {
      const grow = easeOut(1 - lifeRatio);
      const alpha = lifeRatio * (p.glow ? 0.85 : 0.5);
      ctx.save();
      ctx.globalCompositeOperation = p.glow ? "lighter" : "source-over";
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(0.5, p.width * lifeRatio);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size * grow, p.size * grow * 0.58, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    if (p.kind === "after") {
      ctx.save();
      ctx.globalAlpha = lifeRatio * 0.52;
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(p.x, p.y);
      ctx.scale(p.size * p.facing, p.size);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, -2.45, 0.28, 0.34, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0.02, -1.7, 0.42, 0.8, 0, 0, TAU);
      ctx.fill();
      ctx.fillRect(-0.4, -1.25, 0.22, 1.2);
      ctx.fillRect(0.18, -1.25, 0.22, 1.2);
      ctx.restore();
      continue;
    }

    const alpha = Math.min(1, lifeRatio * 1.5);
    ctx.save();
    if (p.glow) ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    if (p.kind === "spark") {
      const speed = Math.hypot(p.vx, p.vy);
      const len = Math.min(p.length || 10, speed * 0.035 + 2);
      const nx = (p.vx / (speed || 1)) * len;
      const ny = (p.vy / (speed || 1)) * len;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(0.6, p.size * 0.55);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - nx, p.y - ny);
      ctx.stroke();
    } else if (p.kind === "dust") {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size, p.size * 0.65, p.rot || 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + lifeRatio * 0.8), 0, TAU);
      ctx.fill();
      if (p.size > 3 && p.glow) {
        ctx.globalAlpha = alpha * 0.25;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.2, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

function drawCombo(now) {
  if (!game.combo || game.combo.count < 2 || game.combo.timer <= 0) return;
  const fade = clamp(game.combo.timer / 0.45, 0, 1);
  const pop = 1 + clamp(game.combo.timer - 1.3, 0, 0.3) * 0.4;
  const x = view.w * 0.5;
  const y = view.h * 0.34;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  ctx.globalAlpha = fade;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "italic 900 " + Math.round(clamp(view.base * 0.39, 20, 46)) + "px 'Arial Black', Impact, sans-serif";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(12,5,22,0.8)";
  ctx.strokeText("×" + game.combo.count, 0, 0);
  const grad = ctx.createLinearGradient(0, -25, 0, 25);
  grad.addColorStop(0, "#fff8d6");
  grad.addColorStop(0.5, "#ffd15c");
  grad.addColorStop(1, "#ff7c24");
  ctx.fillStyle = grad;
  ctx.fillText("×" + game.combo.count, 0, 0);
  ctx.font = "900 " + Math.round(clamp(view.base * 0.13, 8, 15)) + "px 'Arial Black', Impact, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.fillText("COMBO", 0, clamp(view.base * 0.31, 16, 38));
  ctx.restore();
}

function drawScreenFX(now) {
  const w = view.w;
  const h = view.h;
  const base = view.base;

  if (player && player.action && player.action.type === "bomb" && player.action.t < 1.46) {
    const p = clamp(player.action.t / 1.46, 0, 1);
    const vignette = ctx.createRadialGradient(w / 2, h * 0.44, base * 0.4, w / 2, h * 0.44, Math.max(w, h) * 0.72);
    vignette.addColorStop(0, "rgba(10,45,88,0)");
    vignette.addColorStop(0.46, "rgba(7,24,63," + (0.08 + p * 0.1).toFixed(3) + ")");
    vignette.addColorStop(1, "rgba(2,4,18," + (0.25 + p * 0.22).toFixed(3) + ")");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  if (game.flash > 0.01) {
    ctx.fillStyle = "rgba(" + game.flashColor + "," + (game.flash * 0.48).toFixed(3) + ")";
    ctx.fillRect(0, 0, w, h);
  }

  if (!reducedMotion) {
    const range = player && player.action && player.action.type === "bomb" ? 7 : 0;
    if (range) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 5; i++) {
        const a = now * 0.6 + (i * TAU) / 5;
        const x = w / 2 + Math.cos(a) * w * 0.36;
        const y = h * 0.45 + Math.sin(a) * h * 0.24;
        ctx.fillStyle = "rgba(144,243,255,0.06)";
        ctx.beginPath();
        ctx.arc(x, y, base * (0.08 + 0.04 * (i % 2)), 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
