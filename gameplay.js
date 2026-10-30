// ---------------------------------------------------------------------------
// Fighter state
// ---------------------------------------------------------------------------

function baseX() {
  return view.base;
}

function createFighter(id, x) {
  return {
    id,
    x,
    startX: x,
    facing: id === "goku" ? 1 : -1,
    y: 0,
    vy: 0,
    hp: 100,
    maxHp: 100,
    energy: id === "goku" ? 100 : 48,
    maxEnergy: 100,
    action: null,
    state: "idle",
    stateTime: 0,
    animTime: Math.random() * 8,
    walkPhase: 0,
    moveAxis: 0,
    grounded: true,
    hitTimer: 0,
    hitFlash: 0,
    invuln: 0,
    attackCd: 0,
    cooldown: { beam: 0, rush: 0, bomb: 0 },
    koTime: 0,
    koAngle: 0,
    superArmor: false,
    ai: {
      think: 0.7,
      mode: "approach",
      shootCd: 2.2,
      beamCd: 5.5,
      jumpCd: 3.5,
    },
  };
}

function resetFighter(f, x, energy) {
  f.x = x;
  f.startX = x;
  f.y = 0;
  f.vy = 0;
  f.hp = f.maxHp;
  f.energy = energy;
  f.facing = f.id === "goku" ? 1 : -1;
  f.action = null;
  f.state = "idle";
  f.stateTime = 0;
  f.walkPhase = 0;
  f.moveAxis = 0;
  f.hitTimer = 0;
  f.hitFlash = 0;
  f.invuln = 0.6;
  f.attackCd = 0.8;
  f.cooldown.beam = 0;
  f.cooldown.rush = 0;
  f.cooldown.bomb = 0;
  f.koTime = 0;
  f.koAngle = 0;
  f.superArmor = false;
  f.grounded = true;
  f.ai.think = rand(0.5, 1.2);
  f.ai.mode = "approach";
  f.ai.shootCd = rand(1.8, 3.1);
  f.ai.beamCd = rand(4.8, 7.2);
  f.ai.jumpCd = rand(2.5, 4.5);
}

function requestJump(f) {
  if (!f || game.phase !== "fight" || f.hp <= 0) return;
  if (!f.grounded || f.y > 0.01 || f.action) return;
  f.vy = view.base * 6.4;
  f.grounded = false;
  f.state = "jump";
  sfx.whoosh();
  for (let i = 0; i < 7; i++) {
    addParticle({
      kind: "dust",
      x: f.x * view.w + rand(-0.4, 0.4) * view.base,
      y: view.ground + rand(-3, 4),
      vx: rand(-45, 45),
      vy: rand(-40, -5),
      size: rand(4, 11),
      life: rand(0.3, 0.6),
      color: "rgba(201,179,220,0.35)",
      gravity: 40,
    });
  }
}

// ---------------------------------------------------------------------------
// Damage and combo
// ---------------------------------------------------------------------------

function damage(target, amount, source, opts) {
  if (!target || target.hp <= 0 || game.phase !== "fight") return;
  if (target.invuln > 0) return;
  const o = opts || {};
  target.hp = Math.max(0, target.hp - amount);
  target.hitFlash = 0.16;
  target.invuln = 0.06;
  target.energy = Math.min(target.maxEnergy, target.energy + amount * 0.35);
  if (source) source.energy = Math.min(source.maxEnergy, source.energy + amount * 0.5);
  if (!target.superArmor) {
    target.action = null;
    target.hitTimer = o.stun == null ? 0.3 : o.stun;
    target.state = "hit";
    target.stateTime = 0;
    target.vy = 0;
    target.y = 0;
    target.grounded = true;
  }
  const dir = source ? Math.sign(target.x - source.x) || 1 : 1;
  target.x = clamp(target.x + dir * (o.knock || 0.018), 0.075, 0.925);
  if (source) target.facing = -dir;
  game.shake = Math.max(game.shake, o.shake || 7);
  game.hitStop = Math.max(game.hitStop, o.hitStop || 0.035);
  addFloatText(
    target.x * view.w + rand(-12, 12),
    view.ground - target.y - view.base * 2.9,
    "-" + Math.round(amount),
    o.color || "#fff1c9",
    o.big ? 29 : 20
  );
  if (source === player) {
    game.combo.count += 1;
    game.combo.timer = 1.6;
  }
  updateHudNow();
  if (target.hp <= 0) knockOut(target, source);
}

function knockOut(loser, winner) {
  if (game.phase !== "fight") return;
  game.phase = "ko";
  game.phaseTime = 0;
  game.koTimer = 0;
  game.winner = winner ? winner.id : null;
  game.matchWinner = null;
  game.roundReason = "K.O.";
  loser.state = "ko";
  loser.action = null;
  loser.koTime = 0;
  loser.y = 0;
  loser.vy = 0;
  loser.hp = 0;
  loser.invuln = 99;
  game.slowTimer = 0.95;
  game.timeScale = 0.28;
  game.shake = 22;
  game.flash = 0.8;
  game.flashColor = "255,224,170";
  sfx.ko();
  haptic([25, 45, 90]);
  const lx = loser.x * view.w;
  const ly = view.ground - view.base * 1.9;
  burst(lx, ly, 50, ["#ffffff", "#ffd15a", "#ff7b2f", "#65efff"], {
    speedMin: 90,
    speedMax: 520,
    sizeMin: 1.5,
    sizeMax: 7,
    lifeMin: 0.5,
    lifeMax: 1.3,
    gravity: 230,
    glow: true,
  });
  addRing(lx, ly, "rgba(255,214,126,0.95)", view.base * 3.2, 0.8, 7);
  updateHudNow();
}

// ---------------------------------------------------------------------------
// Specials
// ---------------------------------------------------------------------------

function triggerSpecial(type) {
  if (!player || !enemy) return;
  if (game.phase === "intro") {
    showToast("Fight begins in a heartbeat");
    return;
  }
  if (game.phase !== "fight" || player.hp <= 0) return;
  if (player.action) return;
  const cfg = SPECIALS[type];
  if (player.cooldown[type] > 0.04) {
    showToast(cfg.label + " is cooling down");
    return;
  }
  if (player.energy < cfg.cost - (type === "bomb" ? 0.5 : 0)) {
    showToast(type === "bomb" ? "Spirit Bomb needs full energy" : cfg.label + " needs " + cfg.cost + " energy");
    sfx.ui();
    return;
  }
  player.energy = Math.max(0, player.energy - cfg.cost);
  player.cooldown[type] = cfg.cooldown;
  player.facing = enemy.x > player.x ? 1 : -1;
  player.attackCd = 0.4;
  if (type === "beam") {
    player.action = { type: "beam", t: 0, fired: false, dur: 1.35 };
    player.state = "beam";
    player.superArmor = false;
    sfx.charge();
    haptic(20);
  } else if (type === "rush") {
    player.action = { type: "rush", t: 0, step: 0, hits: 0, moved: false, dur: 1.18 };
    player.state = "rush";
    player.superArmor = true;
    sfx.teleport();
    haptic([10, 25, 15]);
  } else if (type === "bomb") {
    player.action = { type: "bomb", t: 0, launched: false, dur: 2.85 };
    player.state = "bomb";
    player.superArmor = true;
    player.energy = 0;
    sfx.charge();
    tone({ freq: 55, end: 110, dur: 1.5, type: "sawtooth", vol: 0.05, cutoff: 380 });
    haptic([20, 30, 40]);
  }
  updateHudDynamic();
}

function startPunch(f) {
  if (f.action || f.hp <= 0 || !f.grounded) return;
  f.action = { type: "punch", t: 0, hit: false, dur: 0.37, side: Math.random() > 0.5 ? 1 : -1 };
  f.attackCd = f.id === "goku" ? 0.64 : 0.92;
  f.state = "punch";
  f.stateTime = 0;
  sfx.whoosh();
}

function resolvePunch(f, target) {
  const gap = Math.abs(f.x - target.x) * view.w;
  if (gap > view.base * 1.86) return;
  if (target.y > view.base * 0.92) return;
  const dir = Math.sign(target.x - f.x) || f.facing;
  const hx = f.x * view.w + dir * view.base * 0.82;
  const hy = view.ground - f.y - view.base * 1.86;
  spawnSparks(hx, hy, f.id === "goku" ? "#ffd36c" : "#7ff8ff", 12);
  sfx.punch();
  damage(target, f.id === "goku" ? rand(3.8, 5.3) : rand(3.1, 4.5), f, {
    knock: 0.013,
    stun: 0.24,
    shake: 4.5,
  });
  haptic(7);
}

function updateActions(f, dt, target) {
  const a = f.action;
  if (!a) return false;
  a.t += dt;

  if (a.type === "punch") {
    if (!a.hit && a.t >= 0.115) {
      a.hit = true;
      resolvePunch(f, target);
    }
    if (a.t >= a.dur) {
      f.action = null;
      f.state = f.grounded ? "idle" : "jump";
    }
    return true;
  }

  if (a.type === "beam") {
    if (!a.fired && a.t >= 0.52) {
      a.fired = true;
      const dir = f.facing;
      const ox = f.x * view.w + dir * view.base * 0.9;
      const oy = view.ground - f.y - view.base * 1.78;
      game.beams.push({
        type: "kame",
        x: ox,
        y: oy,
        dir,
        t: 0,
        dur: 0.68,
        width: view.base * 0.62,
      });
      const targetInLine = Math.sign(target.x - f.x) === dir || Math.abs(target.x - f.x) < 0.05;
      if (targetInLine && target.y < view.base * 0.62) {
        damage(target, 17.5, f, {
          knock: 0.035,
          stun: 0.5,
          shake: 16,
          hitStop: 0.07,
          big: true,
          color: "#c8ffff",
        });
      }
      game.shake = Math.max(game.shake, 15);
      game.flash = 0.44;
      game.flashColor = "140,246,255";
      sfx.beam();
      haptic([10, 20, 30]);
      for (let i = 0; i < 34; i++) {
        addParticle({
          kind: "spark",
          x: ox,
          y: oy + rand(-1, 1) * view.base * 0.3,
          vx: dir * rand(220, 900),
          vy: rand(-80, 80),
          size: rand(1, 5),
          life: rand(0.18, 0.45),
          color: pick(["#ffffff", "#77f5ff", "#2cc7ff"]),
          gravity: 0,
          drag: 0.96,
          glow: true,
          length: rand(8, 22),
        });
      }
      addRing(ox, oy, "rgba(119,245,255,0.9)", view.base * 1.4, 0.45, 4);
    }
    if (a.t >= a.dur) {
      f.action = null;
      f.superArmor = false;
      f.state = "idle";
    }
    return true;
  }

  if (a.type === "rush") {
    f.superArmor = true;
    if (!a.moved && a.t >= 0.2) {
      a.moved = true;
      const oldX = f.x * view.w;
      addAfterImage(f, 0.5);
      addRing(oldX, view.ground - view.base * 1.6, "rgba(197,151,255,0.9)", view.base * 1.6, 0.42, 4);
      burst(oldX, view.ground - view.base * 1.5, 22, ["#d4b2ff", "#7c43c8", "#ffffff"], {
        speedMin: 40,
        speedMax: 240,
        sizeMin: 1,
        sizeMax: 4,
        lifeMin: 0.3,
        lifeMax: 0.7,
        gravity: 40,
      });
      const dirBehind = target.x > f.x ? 1 : -1;
      const offset = (view.base * 1.16) / view.w;
      f.x = clamp(target.x + dirBehind * offset, 0.075, 0.925);
      f.facing = target.x > f.x ? 1 : -1;
      f.y = 0;
      f.vy = 0;
      f.grounded = true;
      sfx.teleport();
      addAfterImage(f, 0.85);
      const nx = f.x * view.w;
      addRing(nx, view.ground - view.base * 1.7, "rgba(203,162,255,0.95)", view.base * 2, 0.5, 5);
      burst(nx, view.ground - view.base * 1.7, 28, ["#e0c8ff", "#a864ff", "#ffffff"], {
        speedMin: 60,
        speedMax: 330,
        sizeMin: 1,
        sizeMax: 5,
        lifeMin: 0.25,
        lifeMax: 0.8,
        gravity: 80,
      });
    }
    const strikeTimes = [0.34, 0.5, 0.66];
    if (a.step < 3 && a.t >= strikeTimes[a.step]) {
      a.step++;
      a.hits++;
      const dir = Math.sign(target.x - f.x) || f.facing;
      const hx = target.x * view.w - dir * view.base * 0.2;
      const hy = view.ground - view.base * (1.55 + a.step * 0.16);
      spawnSparks(hx, hy, "#d6b3ff", 14);
      damage(target, 5.4, f, {
        knock: a.step === 3 ? 0.038 : 0.006,
        stun: 0.28,
        shake: a.step === 3 ? 13 : 6,
        hitStop: 0.045,
        color: "#e6d4ff",
      });
      sfx.hit();
      haptic(a.step === 3 ? 24 : 9);
      addFloatText(hx, hy - view.base * 0.6, a.step === 3 ? "RUSH!" : "HIT", "#d9beff", a.step === 3 ? 24 : 15);
    }
    if (a.t >= a.dur) {
      f.action = null;
      f.superArmor = false;
      f.state = "idle";
    }
    return true;
  }

  if (a.type === "bomb") {
    f.superArmor = true;
    if (!a.launched && a.t >= 1.46) {
      a.launched = true;
      const startX = f.x * view.w + f.facing * view.base * 0.3;
      const startY = view.ground - f.y - view.base * 3.72;
      game.projectiles.push({
        type: "spirit",
        t: 0,
        dur: 0.98,
        sx: startX,
        sy: startY,
        tx: target.x * view.w,
        ty: view.ground - view.base * 2.05,
        target,
        source: f,
        radius: view.base * 1.04,
      });
      sfx.beam();
      tone({ freq: 92, end: 36, dur: 1.1, type: "sawtooth", vol: 0.08, cutoff: 480 });
      game.flash = 0.52;
      game.flashColor = "104,221,255";
      game.shake = 16;
      haptic([20, 30, 60]);
      addRing(startX, startY, "rgba(129,238,255,0.95)", view.base * 2.8, 0.65, 6);
    }
    if (a.t >= a.dur) {
      f.action = null;
      f.superArmor = false;
      f.state = "idle";
    }
    return true;
  }

  if (a.type === "repulsor") {
    if (!a.fired && a.t >= 0.27) {
      a.fired = true;
      const dir = f.facing;
      game.projectiles.push({
        type: "repulsor",
        x: f.x * view.w + dir * view.base * 0.9,
        y: view.ground - f.y - view.base * 1.48,
        vx: dir * view.base * 4.1,
        life: 2.2,
        source: f,
        dir,
      });
      sfx.repulsor();
      tone({ freq: 130, end: 68, dur: 0.28, type: "sawtooth", vol: 0.045, cutoff: 700 });
      addRing(
        f.x * view.w + dir * view.base * 0.9,
        view.ground - f.y - view.base * 1.48,
        "rgba(113,245,255,0.9)",
        view.base * 0.7,
        0.3,
        3
      );
    }
    if (a.t >= 0.7) {
      f.action = null;
      f.state = "idle";
    }
    return true;
  }

  if (a.type === "unibeam") {
    if (!a.fired && a.t >= 0.7) {
      a.fired = true;
      const dir = f.facing;
      const ox = f.x * view.w + dir * view.base * 0.5;
      const oy = view.ground - f.y - view.base * 1.9;
      game.beams.push({
        type: "unibeam",
        x: ox,
        y: oy,
        dir,
        t: 0,
        dur: 0.55,
        width: view.base * 0.44,
      });
      if (Math.abs(player.x - f.x) > 0.04 && player.y < view.base * 0.62) {
        damage(player, 12, f, {
          knock: 0.028,
          stun: 0.42,
          shake: 13,
          hitStop: 0.055,
          big: true,
          color: "#b9ffff",
        });
      }
      game.flash = 0.32;
      game.flashColor = "90,218,255";
      sfx.beam();
    }
    if (a.t >= 1.3) {
      f.action = null;
      f.state = "idle";
    }
    return true;
  }

  return false;
}

function startEnemyRepulsor(f) {
  if (f.action || f.hp <= 0) return;
  f.action = { type: "repulsor", t: 0, fired: false };
  f.state = "repulsor";
  f.facing = player.x > f.x ? 1 : -1;
  f.ai.shootCd = rand(2.0, 3.3);
  tone({ freq: 880, end: 420, dur: 0.2, type: "sine", vol: 0.03 });
}

function startEnemyUnibeam(f) {
  if (f.action || f.hp <= 0) return;
  f.action = { type: "unibeam", t: 0, fired: false };
  f.state = "unibeam";
  f.facing = player.x > f.x ? 1 : -1;
  f.ai.beamCd = rand(6.4, 9.0);
  sfx.charge();
}

// ---------------------------------------------------------------------------
// AI and fighter simulation
// ---------------------------------------------------------------------------

function updateEnemyAI(e, dt) {
  if (game.phase !== "fight" || e.hp <= 0 || e.action || e.hitTimer > 0) {
    e.moveAxis = 0;
    return;
  }
  const dx = player.x - e.x;
  const gap = Math.abs(dx) * view.w;
  e.ai.think -= dt;
  e.ai.shootCd -= dt;
  e.ai.beamCd -= dt;
  e.ai.jumpCd -= dt;

  if (
    player.action &&
    player.action.type === "beam" &&
    !player.action.fired &&
    e.grounded &&
    e.ai.jumpCd <= 0
  ) {
    requestJump(e);
    e.ai.jumpCd = rand(2.8, 4.6);
  }

  if (e.ai.think <= 0) {
    e.ai.think = rand(0.55, 1.45);
    if (gap < view.base * 1.25) e.ai.mode = Math.random() > 0.55 ? "retreat" : "approach";
    else if (gap > view.base * 3.2) e.ai.mode = "approach";
    else e.ai.mode = pick(["approach", "approach", "retreat", "hold"]);
  }

  if (e.ai.shootCd <= 0 && gap > view.base * 1.9 && e.grounded) {
    startEnemyRepulsor(e);
    return;
  }
  if (e.ai.beamCd <= 0 && gap > view.base * 2.35 && e.grounded) {
    startEnemyUnibeam(e);
    return;
  }

  let axis = 0;
  if (gap > view.base * 2.8) {
    axis = Math.sign(dx);
  } else if (gap < view.base * 1.18) {
    axis = -Math.sign(dx) * 0.72;
  } else if (e.ai.mode === "approach") {
    axis = Math.sign(dx) * 0.7;
  } else if (e.ai.mode === "retreat") {
    axis = -Math.sign(dx) * 0.5;
  }
  e.moveAxis = axis;
}

function updateLimbPhysics(f, dt) {
  if (!f.grounded || f.y > 0) {
    f.vy -= view.base * 18 * dt;
    f.y += f.vy * dt;
    if (f.y <= 0) {
      f.y = 0;
      f.vy = 0;
      f.grounded = true;
      if (f.state === "jump") f.state = "idle";
      for (let i = 0; i < 8; i++) {
        addParticle({
          kind: "dust",
          x: f.x * view.w + rand(-0.5, 0.5) * view.base,
          y: view.ground + rand(-3, 4),
          vx: rand(-70, 70),
          vy: rand(-55, -8),
          size: rand(4, 12),
          life: rand(0.3, 0.65),
          color: "rgba(211,192,229,0.36)",
          gravity: 60,
        });
      }
    }
  }
}

function updateFighter(f, dt, opponent) {
  f.animTime += dt;
  f.stateTime += dt;
  for (const key of ["beam", "rush", "bomb"]) {
    if (f.cooldown[key] > 0) f.cooldown[key] = Math.max(0, f.cooldown[key] - dt);
  }
  if (f.attackCd > 0) f.attackCd -= dt;
  if (f.invuln > 0) f.invuln -= dt;
  if (f.hitFlash > 0) f.hitFlash -= dt;
  f.energy = Math.min(f.maxEnergy, f.energy + (f.id === "goku" ? 3.4 : 2.6) * dt);

  updateLimbPhysics(f, dt);

  if (game.phase !== "fight" || f.hp <= 0) {
    if (game.phase === "ko" && f.state === "ko") f.koTime += dt;
    return;
  }

  if (f.hitTimer > 0) {
    f.hitTimer -= dt;
    f.moveAxis = 0;
    if (f.hitTimer <= 0) f.state = f.grounded ? "idle" : "jump";
    return;
  }

  if (f.action) {
    updateActions(f, dt, opponent);
    return;
  }

  let axis = 0;
  if (f === player) {
    const keyAxis = (input.keys.has("right") ? 1 : 0) - (input.keys.has("left") ? 1 : 0);
    axis = clamp(input.joyX + keyAxis + motionState.axis * 0.9, -1, 1);
    if (Math.abs(axis) < 0.12) axis = 0;
  } else {
    axis = f.moveAxis;
  }

  if (Math.abs(axis) > 0.1 && f.grounded) {
    const speed = f.id === "goku" ? view.base * 1.78 : view.base * 1.55;
    f.x = clamp(f.x + (axis * speed * dt) / view.w, 0.075, 0.925);
    f.walkPhase += dt * 9.5 * Math.abs(axis);
    f.state = "walk";
    if (Math.random() < dt * 7) {
      addParticle({
        kind: "dust",
        x: f.x * view.w + rand(-0.3, 0.3) * view.base,
        y: view.ground + rand(-2, 3),
        vx: -axis * rand(20, 70),
        vy: rand(-30, -4),
        size: rand(3, 9),
        life: rand(0.25, 0.55),
        color: "rgba(203,187,226,0.25)",
        gravity: 35,
      });
    }
  } else if (f.grounded) {
    f.state = "idle";
  } else {
    f.state = "jump";
  }

  if (!f.grounded) return;
  f.facing = opponent.x > f.x ? 1 : -1;

  const gap = Math.abs(opponent.x - f.x) * view.w;
  const facingGap = (opponent.x - f.x) * f.facing > 0;
  if (gap < view.base * 1.66 && facingGap && f.attackCd <= 0 && opponent.y < view.base * 0.9) {
    startPunch(f);
  }
}

function separateFighters() {
  if (!player || !enemy || game.phase !== "fight") return;
  const minGap = view.base * 1.02;
  const gap = Math.abs(player.x - enemy.x) * view.w;
  if (gap < minGap) {
    const push = (minGap - gap) / 2 / view.w;
    if (player.x < enemy.x) {
      player.x = clamp(player.x - push, 0.075, 0.925);
      enemy.x = clamp(enemy.x + push, 0.075, 0.925);
    } else {
      player.x = clamp(player.x + push, 0.075, 0.925);
      enemy.x = clamp(enemy.x - push, 0.075, 0.925);
    }
  }
}

// ---------------------------------------------------------------------------
// Projectiles
// ---------------------------------------------------------------------------

function explodeSpirit(p) {
  const x = p.tx;
  const y = p.ty;
  const t = p.target;
  game.flash = 1;
  game.flashColor = "190,249,255";
  game.shake = 28;
  game.hitStop = 0.11;
  sfx.explosion();
  haptic([40, 30, 80, 30, 120]);
  for (let i = 0; i < 90; i++) {
    const angle = rand(0, TAU);
    const speed = rand(70, 780);
    addParticle({
      kind: Math.random() > 0.4 ? "spark" : "dot",
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 80,
      size: rand(1.5, 9),
      life: rand(0.4, 1.5),
      color: pick(["#ffffff", "#c8fbff", "#58eaff", "#2f96ff", "#ffe38a"]),
      gravity: 260,
      drag: 0.92,
      glow: true,
      length: rand(8, 26),
    });
  }
  addRing(x, y, "rgba(202,252,255,0.98)", view.base * 5.4, 0.85, 10);
  addRing(x, y, "rgba(89,224,255,0.7)", view.base * 3.8, 1.15, 5);
  damage(t, 38, p.source, {
    knock: 0.055,
    stun: 0.85,
    shake: 28,
    hitStop: 0.12,
    big: true,
    color: "#d8ffff",
  });
}

function updateProjectiles(dt) {
  for (let i = game.projectiles.length - 1; i >= 0; i--) {
    const p = game.projectiles[i];
    if (p.type === "repulsor") {
      p.x += p.vx * dt;
      p.life -= dt;
      if (Math.random() < dt * 32) {
        addParticle({
          kind: "dot",
          x: p.x + rand(-6, 6),
          y: p.y + rand(-6, 6),
          vx: rand(-20, 20),
          vy: rand(-20, 20),
          size: rand(1, 3.6),
          life: rand(0.12, 0.28),
          color: pick(["#a9feff", "#50dfff", "#ffffff"]),
          gravity: 0,
          drag: 0.94,
          glow: true,
        });
      }
      const px = player.x * view.w;
      if (player.y < view.base * 0.55 && Math.abs(p.x - px) < view.base * 0.38) {
        addRing(p.x, p.y, "rgba(118,248,255,0.95)", view.base * 0.9, 0.32, 4);
        spawnSparks(p.x, p.y, "#7ff8ff", 16);
        damage(player, 7, p.source, {
          knock: 0.02,
          stun: 0.32,
          shake: 8,
          hitStop: 0.04,
          color: "#bffcff",
        });
        game.projectiles.splice(i, 1);
        continue;
      }
      if (p.life <= 0 || p.x < -80 || p.x > view.w + 80) game.projectiles.splice(i, 1);
    } else if (p.type === "spirit") {
      p.t += dt;
      const u = easeInOut(clamp(p.t / p.dur, 0, 1));
      const x = lerp(p.sx, p.tx, u);
      const y = lerp(p.sy, p.ty, u) - Math.sin(u * Math.PI) * view.base * 1.2;
      p.x = x;
      p.y = y;
      if (Math.random() < dt * 55) {
        addParticle({
          kind: "dot",
          x: x + rand(-1, 1) * p.radius * 0.9,
          y: y + rand(-1, 1) * p.radius * 0.9,
          vx: rand(-90, 90),
          vy: rand(-90, 90),
          size: rand(1.5, 5),
          life: rand(0.18, 0.45),
          color: pick(["#bdfaff", "#59e8ff", "#ffffff"]),
          gravity: 0,
          drag: 0.93,
          glow: true,
        });
      }
      if (p.t >= p.dur) {
        explodeSpirit(p);
        game.projectiles.splice(i, 1);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Round and match flow
// ---------------------------------------------------------------------------

function startMatch() {
  game.playerWins = 0;
  game.enemyWins = 0;
  game.round = 1;
  game.firstFight = true;
  updatePips();
  startRound(1, true);
}

function startRound(roundNumber, isMatchStart) {
  game.round = roundNumber;
  game.phase = "intro";
  game.phaseTime = 0;
  game.timer = 60;
  game.displayedSecond = 60;
  game.winner = null;
  game.matchWinner = null;
  game.resultShown = false;
  game.combo.count = 0;
  game.combo.timer = 0;
  game.particles.length = 0;
  game.beams.length = 0;
  game.projectiles.length = 0;
  game.shake = 0;
  game.flash = 0;
  game.hitStop = 0;
  game.timeScale = 1;
  game.slowTimer = 0;
  game.koTimer = 0;
  dom.clock.textContent = "60";
  dom.clock.classList.remove("warning");
  dom.roundLabel.textContent = "ROUND " + roundNumber;
  dom.introRound.textContent = roundNumber;
  resetFighter(player, 0.24, 100);
  resetFighter(enemy, 0.76, 50);
  player.facing = 1;
  enemy.facing = -1;
  updateHudNow();
  updatePips();
  hideResult();
  hidePause();
  restartIntroAnimation();
  if (isMatchStart) showToast("Move close to auto-strike · swipe up to jump", 2600);
}

function restartIntroAnimation() {
  dom.intro.classList.remove("play");
  void dom.intro.offsetWidth;
  dom.intro.classList.add("play");
  dom.intro.setAttribute("aria-hidden", "false");
  window.setTimeout(() => {
    if (game.phase === "fight" || game.phase === "intro") {
      dom.intro.classList.remove("play");
      dom.intro.setAttribute("aria-hidden", "true");
    }
  }, 3500);
}

function beginFight() {
  game.phase = "fight";
  game.phaseTime = 0;
  dom.intro.classList.remove("play");
  dom.intro.setAttribute("aria-hidden", "true");
  setClock(60);
  game.firstFight = false;
}

function finishByTime() {
  if (game.phase !== "fight") return;
  if (player.hp === enemy.hp) {
    game.phase = "ko";
    game.phaseTime = 0;
    game.koTimer = 0;
    game.winner = null;
    game.roundReason = "DRAW";
    game.slowTimer = 0.55;
    game.timeScale = 0.4;
    showToast("TIME · DRAW", 1500);
    return;
  }
  const winner = player.hp > enemy.hp ? player : enemy;
  const loser = winner === player ? enemy : player;
  finishRound(winner.id, "TIME");
  loser.state = "ko";
  loser.koTime = 0;
  loser.hp = Math.max(loser.hp, 1);
  game.slowTimer = 0.35;
  updateHudNow();
}

function finishRound(winnerId, reason) {
  if (game.phase === "result" || game.phase === "ko") return;
  game.phase = "ko";
  game.phaseTime = 0;
  game.koTimer = 0;
  game.winner = winnerId;
  game.roundReason = reason || "K.O.";
  if (winnerId === "goku") game.playerWins = Math.min(2, game.playerWins + 1);
  if (winnerId === "iron") game.enemyWins = Math.min(2, game.enemyWins + 1);
  if (game.playerWins >= 2) game.matchWinner = "goku";
  if (game.enemyWins >= 2) game.matchWinner = "iron";
  game.shake = Math.max(game.shake, 17);
  game.flash = 0.5;
  game.flashColor = "255,227,166";
  updatePips();
}

function showResult() {
  if (game.resultShown) return;
  game.resultShown = true;
  game.phase = "result";
  const winner = game.winner;
  const matchOver = !!game.matchWinner;
  const isPlayer = winner === "goku";
  dom.resultOverlay.hidden = false;
  dom.resultOverlay.querySelector(".result-modal").classList.toggle("enemy-win", winner === "iron");
  dom.resultScore.textContent = game.playerWins + " — " + game.enemyWins;
  dom.resultCopy.textContent = matchOver
    ? isPlayer
      ? "The cosmos is yours. Earth owes you one."
      : "The suit takes the cosmos. Stark Industries wins."
    : winner
      ? isPlayer
        ? pick(gokuLines)
        : pick(ironLines)
      : "The arena refuses to pick a side.";
  if (matchOver) {
    dom.resultKicker.textContent = "MATCH COMPLETE";
    dom.resultTitle.textContent = isPlayer ? "VICTORY" : "DEFEAT";
    dom.nextButton.textContent = "REMATCH";
    dom.resultMenuButton.hidden = true;
  } else {
    dom.resultKicker.textContent = (game.roundReason || "K.O.") + " · ROUND " + game.round;
    dom.resultTitle.textContent = winner ? (isPlayer ? "GOKU WINS" : "IRON MAN WINS") : "DRAW";
    dom.nextButton.textContent = "NEXT ROUND";
    dom.resultMenuButton.hidden = false;
  }
  if (isPlayer) {
    const cx = view.w / 2;
    const cy = view.h * 0.42;
    burst(cx, cy, 50, ["#ffd15a", "#ff8c2a", "#fff6d0", "#6ff2ff"], {
      speedMin: 120,
      speedMax: 600,
      sizeMin: 1.5,
      sizeMax: 6,
      lifeMin: 0.6,
      lifeMax: 1.5,
      gravity: 180,
      glow: true,
    });
  }
}

function hideResult() {
  dom.resultOverlay.hidden = true;
}

function advanceFromResult() {
  hideResult();
  if (game.matchWinner) {
    game.playerWins = 0;
    game.enemyWins = 0;
    game.round = 1;
    startRound(1, true);
  } else {
    startRound(game.round + 1, false);
  }
}

function resetMatch() {
  hidePause();
  hideResult();
  game.playerWins = 0;
  game.enemyWins = 0;
  game.round = 1;
  updatePips();
  startRound(1, true);
}

function openPause() {
  if (game.phase === "paused" || game.phase === "result") return;
  if (game.phase !== "fight" && game.phase !== "intro" && game.phase !== "ko") return;
  game.pausedFrom = game.phase;
  game.phase = "paused";
  dom.pauseOverlay.hidden = false;
  input.joyX = 0;
  input.joyY = 0;
  input.joyPointer = null;
  input.jumpLock = false;
  dom.joystick.classList.remove("active");
  dom.joystickKnob.style.transform = "translate(-50%, -50%)";
}

function hidePause() {
  dom.pauseOverlay.hidden = true;
  if (game.phase === "paused") {
    game.phase = game.pausedFrom || "fight";
    game.lastFrame = performance.now();
  }
}

function togglePause() {
  if (game.phase === "paused") {
    hidePause();
    return;
  }
  openPause();
}

// ---------------------------------------------------------------------------
// Main update loop
// ---------------------------------------------------------------------------

function updateGame(dt, rawDt) {
  game.time += dt;

  if (game.phase === "paused") return;

  const targetCam = (player.x + enemy.x - 1) * view.w * 0.045 + motionState.axis * 16;
  game.camX = lerp(game.camX, targetCam, 1 - Math.exp(-dt * 3));
  game.shake *= Math.exp(-dt * 7.5);
  game.flash *= Math.exp(-dt * 6.5);
  if (game.flash < 0.005) game.flash = 0;

  updateParticles(dt);
  updateBeams(dt);
  updateProjectiles(dt);

  if (game.combo.timer > 0) {
    game.combo.timer -= dt;
    if (game.combo.timer <= 0) game.combo.count = 0;
  }

  if (game.phase === "intro") {
    game.phaseTime += rawDt;
    player.animTime += dt;
    enemy.animTime += dt;
    if (game.phaseTime >= 2.15) beginFight();
  } else if (game.phase === "fight") {
    game.timer -= dt;
    setClock(game.timer);

    updateFighter(player, dt, enemy);
    updateEnemyAI(enemy, dt);
    updateFighter(enemy, dt, player);
    separateFighters();

    if (game.timer <= 0) finishByTime();
  } else if (game.phase === "ko") {
    game.koTimer += rawDt;
    if (player.state === "ko") player.koTime += dt;
    if (enemy.state === "ko") enemy.koTime += dt;
    if (game.koTimer > 1.9 && !game.resultShown) {
      if (!game.winner && game.roundReason === "DRAW") {
        game.roundReason = "DRAW";
      }
      showResult();
    }
  } else if (game.phase === "result") {
    player.animTime += dt * 0.25;
    enemy.animTime += dt * 0.25;
  }

  updateHudDynamic();
}

function frame(now) {
  requestAnimationFrame(frame);
  if (!game.lastFrame) game.lastFrame = now;
  const rawDt = Math.min(0.05, Math.max(0.001, (now - game.lastFrame) / 1000));
  game.lastFrame = now;

  let dt = rawDt;
  if (game.hitStop > 0) {
    game.hitStop = Math.max(0, game.hitStop - rawDt);
    dt *= 0.07;
  }
  if (game.slowTimer > 0) {
    game.slowTimer = Math.max(0, game.slowTimer - rawDt);
    game.timeScale = 0.3;
  } else if (game.phase === "ko") {
    game.timeScale = 0.65;
  } else {
    game.timeScale = 1;
  }
  dt *= game.timeScale;

  updateGame(dt, rawDt);
  drawFrame(now / 1000);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function bootGame() {
  player = createFighter("goku", 0.24);
  enemy = createFighter("iron", 0.76);
  resize();
  window.addEventListener("resize", resize);
  buildPips();
  setupInput();
  updateSoundButton();
  updateHudNow();
  startMatch();
  requestAnimationFrame(frame);
}

bootGame();
