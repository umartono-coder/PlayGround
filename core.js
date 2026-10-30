"use strict";

const $ = (id) => document.getElementById(id);
const canvas = $("game");
const ctx = canvas.getContext("2d", { alpha: false });

const dom = {
  playerHp: $("playerHp"),
  playerHpGhost: $("playerHpGhost"),
  playerEnergy: $("playerEnergy"),
  enemyHp: $("enemyHp"),
  enemyHpGhost: $("enemyHpGhost"),
  enemyEnergy: $("enemyEnergy"),
  playerWins: $("playerWins"),
  enemyWins: $("enemyWins"),
  clock: $("clock"),
  roundLabel: $("roundLabel"),
  intro: $("intro"),
  introRound: $("introRound"),
  toast: $("toast"),
  pauseOverlay: $("pauseOverlay"),
  resultOverlay: $("resultOverlay"),
  resultKicker: $("resultKicker"),
  resultTitle: $("resultTitle"),
  resultScore: $("resultScore"),
  resultCopy: $("resultCopy"),
  nextButton: $("nextButton"),
  resultMenuButton: $("resultMenuButton"),
  soundButton: $("soundButton"),
  tiltButton: $("tiltButton"),
  pauseButton: $("pauseButton"),
  resumeButton: $("resumeButton"),
  restartButton: $("restartButton"),
  beamButton: $("beamButton"),
  rushButton: $("rushButton"),
  bombButton: $("bombButton"),
  joystick: $("joystick"),
  joystickKnob: $("joystickKnob"),
  moveZone: $("moveZone"),
};

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeInOut = (t) => {
  t = clamp(t, 0, 1);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const view = {
  w: 0,
  h: 0,
  dpr: 1,
  ground: 0,
  base: 100,
  portrait: true,
};

const game = {
  phase: "boot",
  phaseTime: 0,
  round: 1,
  timer: 60,
  displayedSecond: 60,
  playerWins: 0,
  enemyWins: 0,
  time: 0,
  hitStop: 0,
  slowTimer: 0,
  timeScale: 1,
  shake: 0,
  flash: 0,
  flashColor: "255,255,255",
  camX: 0,
  particles: [],
  beams: [],
  projectiles: [],
  combo: { count: 0, timer: 0 },
  firstFight: true,
  pausedFrom: null,
  koTimer: 0,
  resultShown: false,
  winner: null,
  matchWinner: null,
  roundReason: "",
  lastFrame: 0,
};

const input = {
  joyX: 0,
  joyY: 0,
  joyActive: false,
  joyPointer: null,
  joyOrigin: { x: 0, y: 0 },
  joyRadius: 44,
  jumpLock: false,
  keys: new Set(),
};

const motionState = {
  enabled: false,
  listening: false,
  baseline: null,
  axis: 0,
  raw: null,
  supported: "DeviceOrientationEvent" in window,
  denied: false,
};

const SPECIALS = {
  beam: { cost: 25, cooldown: 4.1, label: "KAMEHAMEHA" },
  rush: { cost: 30, cooldown: 6.2, label: "INSTANT RUSH" },
  bomb: { cost: 100, cooldown: 15, label: "SPIRIT BOMB" },
};

const gokuLines = [
  "A perfect burst of ki.",
  "That one shook the arena.",
  "Nothing a Saiyan can't handle.",
  "The cosmos felt that.",
];

const ironLines = [
  "Repulsor tech wins again.",
  "A very Stark victory.",
  "The suit never misses.",
  "Powered by a dying star.",
];

let player = null;
let enemy = null;

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

const audio = {
  ctx: null,
  master: null,
  noiseBuffer: null,
  muted: localStorage.getItem("cosmic-clash-muted") === "1",
};

function ensureAudio() {
  if (audio.muted) return;
  if (!audio.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio.ctx = new AC();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.5;
    audio.master.connect(audio.ctx.destination);
    const len = Math.floor(audio.ctx.sampleRate * 1.4);
    const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    audio.noiseBuffer = buffer;
  }
  if (audio.ctx.state === "suspended") audio.ctx.resume();
}

function tone(o) {
  if (!audio.ctx || audio.muted) return;
  const c = audio.ctx;
  const now = c.currentTime + (o.delay || 0);
  const dur = o.dur || 0.2;
  const osc = c.createOscillator();
  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  osc.type = o.type || "sine";
  osc.frequency.setValueAtTime(Math.max(1, o.freq || 220), now);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(1, o.end == null ? o.freq || 220 : o.end),
    now + dur
  );
  filter.type = o.filter || "lowpass";
  filter.frequency.setValueAtTime(o.cutoff || 4000, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(o.vol || 0.08, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audio.master);
  osc.start(now);
  osc.stop(now + dur + 0.03);
}

function noise(dur, vol, cutoff, type, delay) {
  if (!audio.ctx || audio.muted || !audio.noiseBuffer) return;
  const c = audio.ctx;
  const now = c.currentTime + (delay || 0);
  const src = c.createBufferSource();
  src.buffer = audio.noiseBuffer;
  const filter = c.createBiquadFilter();
  filter.type = type || "lowpass";
  filter.frequency.setValueAtTime(cutoff || 1200, now);
  filter.frequency.exponentialRampToValueAtTime(Math.max(60, (cutoff || 1200) * 0.35), now + dur);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audio.master);
  src.start(now);
  src.stop(now + dur + 0.02);
}

const sfx = {
  ui() {
    tone({ freq: 520, end: 720, dur: 0.06, type: "triangle", vol: 0.035 });
  },
  punch() {
    tone({ freq: 155, end: 54, dur: 0.11, type: "sine", vol: 0.1 });
    noise(0.075, 0.045, 900, "bandpass");
  },
  whoosh() {
    noise(0.14, 0.045, 1400, "bandpass");
  },
  hit() {
    tone({ freq: 260, end: 70, dur: 0.09, type: "square", vol: 0.04, cutoff: 1200 });
    noise(0.1, 0.045, 1800, "highpass");
  },
  charge() {
    tone({ freq: 85, end: 620, dur: 0.5, type: "sawtooth", vol: 0.045, cutoff: 1000 });
    tone({ freq: 170, end: 940, dur: 0.46, type: "sine", vol: 0.025, delay: 0.04 });
  },
  beam() {
    noise(0.65, 0.12, 3200, "lowpass");
    tone({ freq: 82, end: 36, dur: 0.65, type: "sawtooth", vol: 0.07, cutoff: 500 });
    tone({ freq: 460, end: 90, dur: 0.45, type: "sine", vol: 0.03 });
  },
  teleport() {
    tone({ freq: 1300, end: 180, dur: 0.23, type: "sine", vol: 0.055 });
    noise(0.16, 0.035, 4200, "highpass");
  },
  explosion() {
    noise(1.1, 0.2, 480, "lowpass");
    tone({ freq: 64, end: 24, dur: 1.0, type: "sine", vol: 0.13 });
    tone({ freq: 150, end: 40, dur: 0.45, type: "square", vol: 0.03, cutoff: 500 });
  },
  repulsor() {
    tone({ freq: 880, end: 170, dur: 0.2, type: "sawtooth", vol: 0.045, cutoff: 2400 });
    noise(0.16, 0.03, 3200, "highpass");
  },
  ready() {
    tone({ freq: 660, end: 990, dur: 0.18, type: "triangle", vol: 0.045 });
    tone({ freq: 990, end: 1320, dur: 0.24, type: "triangle", vol: 0.035, delay: 0.12 });
  },
  ko() {
    tone({ freq: 220, end: 48, dur: 0.9, type: "sawtooth", vol: 0.08, cutoff: 700 });
    noise(0.9, 0.09, 700, "lowpass");
  },
};

function haptic(pattern) {
  if (audio.muted) return;
  try {
    navigator.vibrate?.(pattern);
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Deterministic background dressing
// ---------------------------------------------------------------------------

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seed = mulberry32(193601);
const stars = Array.from({ length: 150 }, () => ({
  x: seed(),
  y: seed() * 0.77,
  size: 0.35 + seed() * 1.45,
  depth: 0.2 + seed() * 0.8,
  phase: seed() * TAU,
  speed: 0.35 + seed() * 0.9,
  tint: seed() > 0.82 ? "warm" : seed() > 0.38 ? "cool" : "white",
}));

const ambientMotes = Array.from({ length: 34 }, () => ({
  x: seed(),
  y: 0.08 + seed() * 0.74,
  size: 0.6 + seed() * 1.4,
  speed: 0.008 + seed() * 0.025,
  phase: seed() * TAU,
  depth: 0.2 + seed() * 0.8,
  warm: seed() > 0.6,
}));

const floatingRocks = [
  { x: 0.075, y: 0.5, s: 0.42, phase: 0.2, depth: 0.8 },
  { x: 0.925, y: 0.45, s: 0.5, phase: 2.4, depth: 0.75 },
  { x: 0.16, y: 0.29, s: 0.2, phase: 3.1, depth: 0.5 },
  { x: 0.855, y: 0.25, s: 0.27, phase: 1.3, depth: 0.55 },
  { x: 0.055, y: 0.7, s: 0.22, phase: 4.4, depth: 0.9 },
  { x: 0.95, y: 0.65, s: 0.18, phase: 5.1, depth: 0.85 },
];

const dragonBalls = [
  { x: 0.115, y: 0.6, s: 0.065, phase: 0.3, stars: 3 },
  { x: 0.875, y: 0.56, s: 0.055, phase: 2.1, stars: 5 },
  { x: 0.195, y: 0.37, s: 0.04, phase: 4.2, stars: 2 },
  { x: 0.805, y: 0.33, s: 0.045, phase: 5.5, stars: 7 },
];

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  view.w = w;
  view.h = h;
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.portrait = h > w * 1.03;
  view.base = clamp(Math.min(w * 0.215, h * 0.18), 58, 178);
  view.ground = h * (view.portrait ? 0.67 : 0.745);
  if (h < 470 && w > h) view.ground = h * 0.72;
  canvas.width = Math.round(w * view.dpr);
  canvas.height = Math.round(h * view.dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  if (player && enemy) {
    player.x = clamp(player.x, 0.08, 0.92);
    enemy.x = clamp(enemy.x, 0.08, 0.92);
  }
}

// ---------------------------------------------------------------------------
// Motion controls
// ---------------------------------------------------------------------------

function handleOrientation(event) {
  if (!motionState.enabled) return;
  const gamma = typeof event.gamma === "number" ? event.gamma : null;
  if (gamma == null) return;
  motionState.raw = gamma;
  if (motionState.baseline == null) {
    motionState.baseline = gamma;
    return;
  }
  let delta = gamma - motionState.baseline;
  if (Math.abs(delta) < 3.2) delta = 0;
  else delta = Math.sign(delta) * (Math.abs(delta) - 3.2);
  const target = clamp(delta / 22, -1, 1);
  motionState.axis += (target - motionState.axis) * 0.18;
}

async function toggleTilt() {
  ensureAudio();
  if (motionState.enabled) {
    disableTilt(true);
    return;
  }
  if (!("DeviceOrientationEvent" in window)) {
    motionState.denied = true;
    dom.tiltButton.classList.add("denied");
    showToast("Tilt is not available on this device");
    return;
  }
  try {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const result = await DeviceOrientationEvent.requestPermission();
      if (result !== "granted") {
        motionState.denied = true;
        dom.tiltButton.classList.add("denied");
        showToast("Motion access was not granted");
        return;
      }
    }
    if (!motionState.listening) {
      window.addEventListener("deviceorientation", handleOrientation, true);
      motionState.listening = true;
    }
    motionState.enabled = true;
    motionState.denied = false;
    motionState.baseline = null;
    motionState.axis = 0;
    dom.tiltButton.classList.add("active");
    dom.tiltButton.classList.remove("denied");
    dom.tiltButton.setAttribute("aria-pressed", "true");
    dom.tiltButton.setAttribute("aria-label", "Disable accelerometer tilt controls");
    localStorage.setItem("cosmic-clash-tilt", "1");
    showToast("Tilt active · lean left or right to move");
    sfx.ready();
    haptic(18);
  } catch (_) {
    motionState.denied = true;
    dom.tiltButton.classList.add("denied");
    showToast("Motion access is unavailable");
  }
}

function disableTilt(announce) {
  motionState.enabled = false;
  motionState.axis = 0;
  motionState.baseline = null;
  dom.tiltButton.classList.remove("active", "denied");
  dom.tiltButton.setAttribute("aria-pressed", "false");
  dom.tiltButton.setAttribute("aria-label", "Enable accelerometer tilt controls");
  localStorage.setItem("cosmic-clash-tilt", "0");
  if (announce) showToast("Tilt controls off");
}

// ---------------------------------------------------------------------------
// Touch and keyboard input
// ---------------------------------------------------------------------------

function updateJoystick(clientX, clientY) {
  const dx = clientX - input.joyOrigin.x;
  const dy = clientY - input.joyOrigin.y;
  const len = Math.hypot(dx, dy);
  const max = input.joyRadius;
  const scale = len > max ? max / len : 1;
  const ox = dx * scale;
  const oy = dy * scale;
  input.joyX = clamp(ox / max, -1, 1);
  input.joyY = clamp(oy / max, -1, 1);
  dom.joystickKnob.style.transform =
    "translate(-50%, -50%) translate(" + ox.toFixed(1) + "px," + oy.toFixed(1) + "px)";
  if (input.joyY < -0.58 && !input.jumpLock) {
    input.jumpLock = true;
    requestJump(player);
  }
  if (input.joyY > -0.22) input.jumpLock = false;
}

function joyStart(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  event.preventDefault();
  ensureAudio();
  if (input.joyPointer !== null) return;
  const rect = dom.joystick.getBoundingClientRect();
  input.joyPointer = event.pointerId;
  input.joyOrigin.x = rect.left + rect.width / 2;
  input.joyOrigin.y = rect.top + rect.height / 2;
  input.joyRadius = rect.width * 0.36;
  input.joyActive = true;
  input.jumpLock = false;
  dom.joystick.classList.add("active");
  try {
    dom.moveZone.setPointerCapture(event.pointerId);
  } catch (_) {}
  updateJoystick(event.clientX, event.clientY);
}

function joyMove(event) {
  if (event.pointerId !== input.joyPointer) return;
  event.preventDefault();
  updateJoystick(event.clientX, event.clientY);
}

function joyEnd(event) {
  if (event.pointerId !== input.joyPointer) return;
  input.joyPointer = null;
  input.joyActive = false;
  input.joyX = 0;
  input.joyY = 0;
  input.jumpLock = false;
  dom.joystick.classList.remove("active");
  dom.joystickKnob.style.transform = "translate(-50%, -50%)";
}

function setupInput() {
  dom.moveZone.addEventListener("pointerdown", joyStart, { passive: false });
  dom.moveZone.addEventListener("pointermove", joyMove, { passive: false });
  dom.moveZone.addEventListener("pointerup", joyEnd);
  dom.moveZone.addEventListener("pointercancel", joyEnd);
  dom.moveZone.addEventListener("lostpointercapture", joyEnd);

  const bindSpecial = (button, type) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      ensureAudio();
      triggerSpecial(type);
      button.classList.add("pressed");
      window.setTimeout(() => button.classList.remove("pressed"), 130);
    });
    button.addEventListener("pointerup", () => button.classList.remove("pressed"));
    button.addEventListener("pointercancel", () => button.classList.remove("pressed"));
  };

  bindSpecial(dom.beamButton, "beam");
  bindSpecial(dom.rushButton, "rush");
  bindSpecial(dom.bombButton, "bomb");

  dom.soundButton.addEventListener("click", () => {
    audio.muted = !audio.muted;
    localStorage.setItem("cosmic-clash-muted", audio.muted ? "1" : "0");
    updateSoundButton();
    if (!audio.muted) {
      ensureAudio();
      sfx.ui();
    }
  });

  dom.tiltButton.addEventListener("click", toggleTilt);
  dom.pauseButton.addEventListener("click", togglePause);
  dom.resumeButton.addEventListener("click", togglePause);
  dom.restartButton.addEventListener("click", () => {
    hidePause();
    resetMatch();
  });
  dom.nextButton.addEventListener("click", advanceFromResult);
  dom.resultMenuButton.addEventListener("click", () => {
    hideResult();
    resetMatch();
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "spacebar"].includes(key)) {
      event.preventDefault();
    }
    ensureAudio();
    if (event.repeat && ["j", "k", "l", "1", "2", "3", " ", "spacebar"].includes(key)) return;
    if (key === "a" || key === "arrowleft") input.keys.add("left");
    if (key === "d" || key === "arrowright") input.keys.add("right");
    if (key === "w" || key === "arrowup" || key === " " || key === "spacebar") requestJump(player);
    if (key === "j" || key === "1") triggerSpecial("beam");
    if (key === "k" || key === "2") triggerSpecial("rush");
    if (key === "l" || key === "3") triggerSpecial("bomb");
    if (key === "escape" || key === "p") togglePause();
    if (key === "enter" && game.phase === "result") advanceFromResult();
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key === "a" || key === "arrowleft") input.keys.delete("left");
    if (key === "d" || key === "arrowright") input.keys.delete("right");
  });

  window.addEventListener("blur", () => input.keys.clear());
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  window.addEventListener("pointerdown", ensureAudio, { once: true });
  window.addEventListener("keydown", ensureAudio, { once: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && (game.phase === "fight" || game.phase === "intro")) openPause();
  });
}

function updateSoundButton() {
  dom.soundButton.classList.toggle("muted", audio.muted);
  dom.soundButton.setAttribute("aria-label", audio.muted ? "Enable sound" : "Mute sound");
  dom.soundButton.setAttribute("title", audio.muted ? "Enable sound" : "Mute sound");
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

function updateHudNow() {
  if (!player || !enemy) return;
  const pPct = clamp((player.hp / player.maxHp) * 100, 0, 100);
  const ePct = clamp((enemy.hp / enemy.maxHp) * 100, 0, 100);
  dom.playerHp.style.width = pPct + "%";
  dom.playerHpGhost.style.width = pPct + "%";
  dom.enemyHp.style.width = ePct + "%";
  dom.enemyHpGhost.style.width = ePct + "%";
  dom.playerEnergy.style.width = clamp((player.energy / player.maxEnergy) * 100, 0, 100) + "%";
  dom.enemyEnergy.style.width = clamp((enemy.energy / enemy.maxEnergy) * 100, 0, 100) + "%";
}

function buildPips() {
  const make = (el, n) => {
    el.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const dot = document.createElement("i");
      dot.setAttribute("aria-hidden", "true");
      el.appendChild(dot);
    }
  };
  make(dom.playerWins, 2);
  make(dom.enemyWins, 2);
}

function updatePips() {
  dom.playerWins.querySelectorAll("i").forEach((dot, i) => {
    dot.classList.toggle("on", i < game.playerWins);
  });
  dom.enemyWins.querySelectorAll("i").forEach((dot, i) => {
    dot.classList.toggle("on", i < game.enemyWins);
  });
}

function updateHudDynamic() {
  if (!player || !enemy) return;
  dom.playerEnergy.style.width = clamp((player.energy / player.maxEnergy) * 100, 0, 100) + "%";
  dom.enemyEnergy.style.width = clamp((enemy.energy / enemy.maxEnergy) * 100, 0, 100) + "%";

  const canPlay = game.phase === "fight";
  for (const key of ["beam", "rush", "bomb"]) {
    const f = player;
    const cfg = SPECIALS[key];
    const button = key === "beam" ? dom.beamButton : key === "rush" ? dom.rushButton : dom.bombButton;
    const cd = f.cooldown[key];
    const left = Math.max(0, cd);
    const ratio = left > 0 ? clamp(left / cfg.cooldown, 0, 1) : 0;
    const energyOk = key === "bomb" ? f.energy >= 99.5 : f.energy >= cfg.cost;
    const usable = canPlay && !f.action && left <= 0.03 && energyOk && f.hp > 0;
    button.style.setProperty("--cd", ratio.toFixed(3));
    button.classList.toggle("cooling", left > 0.04);
    button.classList.toggle("is-locked", !usable);
    const t = button.querySelector(".special-timer");
    t.textContent = left > 0.04 ? Math.ceil(left) : "";
    if (key === "bomb") {
      button.classList.toggle("ready", canPlay && energyOk && left <= 0.03 && f.hp > 0 && !f.action);
    }
  }
}

function setClock(value) {
  const shown = Math.max(0, Math.ceil(value));
  if (shown !== game.displayedSecond) {
    game.displayedSecond = shown;
    dom.clock.textContent = String(shown).padStart(2, "0");
    dom.clock.classList.toggle("warning", shown <= 10 && game.phase === "fight");
  }
}

let toastTimeout = null;
function showToast(message, duration) {
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    dom.toast.classList.remove("show");
  }, duration || 1900);
}

// ---------------------------------------------------------------------------
// Particles and effects
// ---------------------------------------------------------------------------

function addParticle(p) {
  if (game.particles.length > 560) game.particles.shift();
  p.maxLife = p.life;
  p.gravity = p.gravity || 0;
  p.drag = p.drag == null ? 0.92 : p.drag;
  p.rot = p.rot || 0;
  p.vr = p.vr || 0;
  game.particles.push(p);
  return p;
}

function burst(x, y, count, colors, opts) {
  const o = opts || {};
  const n = reducedMotion ? Math.ceil(count * 0.55) : count;
  for (let i = 0; i < n; i++) {
    const angle = rand(o.angleMin == null ? 0 : o.angleMin, o.angleMax == null ? TAU : o.angleMax);
    const speed = rand(o.speedMin == null ? 60 : o.speedMin, o.speedMax == null ? 310 : o.speedMax);
    addParticle({
      kind: o.kind || (Math.random() > 0.45 ? "spark" : "dot"),
      x,
      y,
      vx: Math.cos(angle) * speed + (o.vx || 0),
      vy: Math.sin(angle) * speed + (o.vy || 0),
      size: rand(o.sizeMin == null ? 1.4 : o.sizeMin, o.sizeMax == null ? 5.2 : o.sizeMax),
      life: rand(o.lifeMin == null ? 0.25 : o.lifeMin, o.lifeMax == null ? 0.8 : o.lifeMax),
      color: pick(colors),
      gravity: o.gravity == null ? 230 : o.gravity,
      drag: o.drag == null ? 0.9 : o.drag,
      glow: o.glow !== false,
      length: o.length || rand(4, 14),
    });
  }
}

function addRing(x, y, color, maxSize, life, width) {
  addParticle({
    kind: "ring",
    x,
    y,
    vx: 0,
    vy: 0,
    size: maxSize,
    life: life || 0.4,
    color,
    glow: true,
    width: width || 3,
  });
}

function addFloatText(x, y, text, color, size) {
  addParticle({
    kind: "text",
    x,
    y,
    vx: rand(-8, 8),
    vy: -64,
    life: 1.05,
    color: color || "#fff0c8",
    text,
    size: size || 20,
    gravity: 0,
    drag: 1,
    glow: true,
  });
}

function addAfterImage(f, alpha) {
  addParticle({
    kind: "after",
    x: f.x * view.w,
    y: view.ground - f.y,
    vx: 0,
    vy: 0,
    life: 0.32,
    color: f.id === "goku" ? "rgba(255,183,80," + alpha + ")" : "rgba(103,239,255," + alpha + ")",
    size: view.base,
    facing: f.facing,
    gravity: 0,
    drag: 1,
    glow: true,
  });
}

function spawnSparks(x, y, color, amount) {
  burst(x, y, amount || 16, [color, "#ffffff", "#ffe5a3"], {
    speedMin: 40,
    speedMax: 300,
    sizeMin: 1.2,
    sizeMax: 4.5,
    lifeMin: 0.18,
    lifeMax: 0.55,
    gravity: 140,
    glow: true,
  });
  addRing(x, y, color, 52, 0.32, 2.4);
}

function updateParticles(dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      game.particles.splice(i, 1);
      continue;
    }
    if (p.kind === "text") {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      continue;
    }
    if (p.kind === "ring" || p.kind === "after" || p.kind === "shock") continue;
    const drag = p.drag === 1 ? 1 : Math.pow(p.drag, dt * 60);
    p.vx *= drag;
    p.vy *= drag;
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
  }
}

function updateBeams(dt) {
  for (let i = game.beams.length - 1; i >= 0; i--) {
    const b = game.beams[i];
    b.t += dt;
    if (b.t >= b.dur) game.beams.splice(i, 1);
  }
}
