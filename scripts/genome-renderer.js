import { getGenomeMetrics, hashString } from "./genome.js";

const COLORS = Object.freeze({
  void: "#011316",
  cyan: "#3ff4d5",
  cyanBright: "#bffdf4",
  cyanDim: "#147478",
  cyanDark: "#0b4147",
  gold: "#ffd15c",
  goldSoft: "#ffbd4a",
  white: "#f7ffff",
  will: "#ff5e36",
  willDeep: "#b82a12",
  willCore: "#ffe5b4",
  communion: "#3fa9f5",
  communionBright: "#82d4ff",
  humanity: "#3ff48b",
  humanityDim: "#1a7042",
  redAlert: "#ff385c",
  adenine: "#3ff4d5",
  thymine: "#ffd15c",
  guanine: "#3fa9f5",
  cytosine: "#ff5e36",
  phosphate: "#c4f5ed"
});

const BASE_PAIRS = Object.freeze([
  { b1: "A", b2: "T", bonds: 2, c1: COLORS.adenine, c2: COLORS.thymine },
  { b1: "T", b2: "A", bonds: 2, c1: COLORS.thymine, c2: COLORS.adenine },
  { b1: "G", b2: "C", bonds: 3, c1: COLORS.guanine, c2: COLORS.cytosine },
  { b1: "C", b2: "G", bonds: 3, c1: COLORS.cytosine, c2: COLORS.guanine }
]);

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function gaussian(x, center, width) {
  const d = (x - center) / Math.max(0.0001, width);
  return Math.exp(-0.5 * d * d);
}

function rgba(hex, alpha = 1) {
  const value = String(hex).replace("#", "");
  const parsed = Number.parseInt(value.length === 3 ? value.split("").map((c) => c + c).join("") : value, 16);
  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function chooseSlots(rng, count, min = 0.08, max = 0.92, minGap = 0.055) {
  const result = [];
  let guard = 0;
  while (result.length < count && guard < 800) {
    const value = min + rng() * (max - min);
    if (result.every((item) => Math.abs(item - value) >= minGap)) result.push(value);
    guard += 1;
  }
  return result.sort((a, b) => a - b);
}

function valueSignature(metrics) {
  return `${metrics.current.vontade}/${metrics.current.comunhao}/${metrics.current.humanidade}`;
}

/**
 * Canvas renderer inspirado na arquitetura do DNA ANALYSIS do teste-hud:
 * Canvas 2D + coordenadas 3D projetadas, z-sort, micro-pérolas, plexo molecular,
 * scanner interativo e partículas. Aqui, porém, a geometria é dirigida pelos
 * valores e pela memória genética do portador.
 */
export class KaijuGenomeRenderer {
  constructor(canvas, carrier) {
    this.canvas = canvas;
    this.carrier = carrier;
    this.metrics = getGenomeMetrics(carrier);
    this.ctx = canvas?.getContext?.("2d", { alpha: true }) || null;
    this.seed = this.metrics.genome.seed >>> 0;
    this.rng = mulberry32(this.seed ^ 0x4B303344);
    this.frameId = null;
    this.resizeObserver = null;
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.angle = 0;
    this.rotSpeed = 0.012;
    this.laserPhase = 0;
    this.baseTiltX = -0.05;
    this.baseTiltY = 0.02;
    this.tiltX = 0;
    this.tiltY = 0;
    this.targetTiltX = 0;
    this.targetTiltY = 0;
    this.sparks = [];
    this.lastTime = performance.now();
    this.running = false;
    this.lastClick = 0;
    this.quality = 1;
    this.slowFrames = 0;
    this.fastFrames = 0;
    this.paused = false;
    this.signalPulsePhase = 0;
    this.hoverPoint = null;
    this._renderables = [];
    this._renderablePool = [];
    this._poolIndex = 0;

    this._buildStaticGenome();
    this._boundMouseMove = (event) => this._onMouseMove(event);
    this._boundMouseLeave = () => { this.targetTiltX = 0; this.targetTiltY = 0; this.hoverPoint = null; };
    this._boundClick = (event) => this._onClick(event);
  }

  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }

  _pushRenderable(data) {
    if (this._poolIndex >= this._renderablePool.length) {
      this._renderablePool.push({});
    }
    const item = this._renderablePool[this._poolIndex];
    Object.assign(item, data);
    this._renderables[this._poolIndex] = item;
    this._poolIndex += 1;
  }

  _buildStaticGenome() {
    const rng = mulberry32(this.seed ^ 0xA11E1101);
    const metrics = this.metrics;

    const hotspotCount = 7 + Math.round(metrics.mutationLoad / 25);
    this.hotspots = chooseSlots(rng, hotspotCount, 0.07, 0.89, 0.065).map((t, index) => ({
      t,
      width: 0.032 + rng() * 0.042,
      phase: rng() * Math.PI * 2,
      weight: 0.45 + rng() * 0.65,
      axis: index % 3 === 0 ? "vontade" : index % 3 === 1 ? "comunhao" : "humanidade"
    }));

    this.branchSlots = chooseSlots(rng, Math.min(14, metrics.branchCount), 0.10, 0.82, 0.060).map((t, index) => ({
      t,
      strand: rng() > 0.5 ? 1 : 2,
      sign: rng() > 0.5 ? 1 : -1,
      length: 0.55 + rng() * 0.75,
      curl: (rng() - 0.5) * 1.4,
      phase: rng() * Math.PI * 2,
      persistent: index < Math.min(metrics.genome.mutations.length, metrics.branchCount)
    }));

    this.latticeSlots = chooseSlots(rng, Math.min(14, metrics.latticeCount), 0.09, 0.86, 0.055).map((t) => ({
      t,
      sign: rng() > 0.5 ? 1 : -1,
      spread: 0.4 + rng() * 0.7,
      phase: rng() * Math.PI * 2
    }));

    this.fractureSlots = chooseSlots(rng, Math.min(8, metrics.fractureCount), 0.12, 0.84, 0.095).map((t) => ({
      t,
      width: 0.010 + rng() * 0.012,
      phase: rng() * Math.PI * 2
    }));

    this.humanityLockSlots = chooseSlots(rng, Math.min(14, metrics.humanityLocks || 0), 0.08, 0.88, 0.055).map((t, index) => ({
      t,
      phase: rng() * Math.PI * 2,
      weight: 0.72 + rng() * 0.45,
      index
    }));

    const rungCount = 64;
    this.anomalousRungs = new Set();
    while (this.anomalousRungs.size < Math.min(rungCount - 4, metrics.anomalousPairs)) {
      this.anomalousRungs.add(2 + Math.floor(rng() * (rungCount - 4)));
    }

    this.persistentMarks = (metrics.genome.mutations || []).slice(0, 14).map((mutation, index) => {
      const mrng = mulberry32(this.seed ^ hashString(mutation.id || `${index}`));
      return {
        t: 0.07 + mrng() * 0.84,
        axis: mutation.axis,
        name: mutation.name || mutation.label || mutation.id || `LOCUS #${index + 1}`,
        description: mutation.description || "",
        ring: 4 + mrng() * 4,
        phase: mrng() * Math.PI * 2
      };
    });

    this.codonSeed = Array.from({ length: 8 }, (_, index) => {
      const crng = mulberry32(this.seed ^ (0xC0D0 + index * 97));
      const bases = ["A", "T", "C", "G"];
      return Array.from({ length: 18 }, () => bases[Math.floor(crng() * 4)]).join("");
    });
  }

  start() {
    if (!this.ctx || !this.canvas || this.running) return;
    this.running = true;
    this._resize();
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this._resize());
      this.resizeObserver.observe(this.canvas);
    }
    this.canvas.addEventListener("mousemove", this._boundMouseMove);
    this.canvas.addEventListener("mouseleave", this._boundMouseLeave);
    this.canvas.addEventListener("click", this._boundClick);
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame((now) => this._render(now));
  }

  stop() {
    this.running = false;
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.canvas?.removeEventListener("mousemove", this._boundMouseMove);
    this.canvas?.removeEventListener("mouseleave", this._boundMouseLeave);
    this.canvas?.removeEventListener("click", this._boundClick);
  }

  _resize() {
    if (!this.canvas || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(320, rect.width || 320);
    this.height = Math.max(220, rect.height || 220);
    const maxDpr = this.width * this.height > 700000 ? 1.35 : 1.6;
    this.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    this.canvas.width = Math.max(1, Math.round(this.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(this.height * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  _onMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const mx = x / Math.max(1, rect.width) - 0.5;
    const my = y / Math.max(1, rect.height) - 0.5;
    this.targetTiltY = mx * 0.18;
    this.targetTiltX = -my * 0.14;
    this.hoverPoint = { x, y };
  }

  _onClick(event) {
    const now = performance.now();
    this.lastClick = now;
    this.rotSpeed = this.rotSpeed === 0.012 ? 0.026 : (this.rotSpeed === 0.026 ? 0.004 : 0.012);
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    for (let i = 0; i < 34; i += 1) {
      const rng = this.rng;
      this.sparks.push({
        x: x + (rng() - 0.5) * 18,
        y: y + (rng() - 0.5) * 18,
        vx: (rng() - 0.5) * 4.6,
        vy: (rng() - 0.5) * 4.3 - 1.25,
        life: 0.65 + rng() * 0.55,
        hue: rng() > 0.34 ? "white" : "gold"
      });
    }
    this.canvas.dispatchEvent(new CustomEvent("kj-genome-pulse", { bubbles: true, detail: { x, y } }));
  }

  _projector(centerY, radius) {
    const currentTiltX = this.baseTiltX + this.tiltX;
    const currentTiltY = this.baseTiltY + this.tiltY;
    const cosTx = Math.cos(currentTiltX);
    const sinTx = Math.sin(currentTiltX);
    const cosTy = Math.cos(currentTiltY);
    const sinTy = Math.sin(currentTiltY);
    return (x, y, z) => {
      const rx = x - this.width * 0.5;
      const ry = y - centerY;
      const rz = z;
      const x1 = rx * cosTy + rz * sinTy;
      const z1 = -rx * sinTy + rz * cosTy;
      const y2 = ry * cosTx - z1 * sinTx;
      const z2 = ry * sinTx + z1 * cosTx;
      const scale = 1.0 + z2 * 0.0008;
      return {
        px: this.width * 0.5 + x1 + z2 * 0.035,
        py: centerY + y2,
        scale,
        z: z2,
        normZ: clamp01((z2 + radius) / (2 * radius))
      };
    };
  }

  _fractureStrength(t) {
    let strength = 0;
    for (const fracture of this.fractureSlots) strength = Math.max(strength, gaussian(t, fracture.t, fracture.width));
    // Rupturas anatômicas visíveis: causadas por perda de humanidade ou avanço predatório
    return strength * Math.max(0, (this.metrics.identityLossMorph || 0) * 0.95 + (this.metrics.willMorph || 0) * 0.45);
  }

  _hotspotFields(t) {
    let will = 0;
    let communion = 0;
    let humanity = 0;
    for (const spot of this.hotspots) {
      const g = gaussian(t, spot.t, spot.width) * spot.weight;
      if (spot.axis === "vontade") will += g;
      else if (spot.axis === "comunhao") communion += g;
      else humanity += g;
    }
    return { will: Math.min(2.5, will), communion: Math.min(2.5, communion), humanity: Math.min(2.5, humanity) };
  }

  _helixWorld(t, strand, centerY, radius, startX, endX) {
    const m = this.metrics;
    const fields = this._hotspotFields(t);
    const xBase = startX + t * (endX - startX);

    // Geometria B-DNA autêntica: ângulo diedro assimétrico (Sulco Menor ~136° e Sulco Maior ~224°)
    const strandPhase = strand === 2 ? (Math.PI - 0.44) : 0;
    const baseTheta = t * Math.PI * 4 + this.angle + strandPhase;

    const willMorph = m.willMorph || 0;
    const communionMorph = m.communionMorph || 0;
    const humanityMorph = m.humanityMorph || 0;
    const lossMorph = m.identityLossMorph || 0;
    const sign = strand === 1 ? 1 : -1;

    const localWill = (0.25 + fields.will * 0.75) * willMorph;
    const localComm = (0.25 + fields.communion * 0.75) * communionMorph;
    const localLoss = (0.25 + fields.humanity * 0.75) * lossMorph;

    const seedPhase = (this.seed % 997) * 0.0061;

    // Cisalhamento e torção caótica: fitas perdem paralelismo sob perda de humanidade / predação
    const phaseShear = sign * (
      Math.sin(t * Math.PI * 4.8 + seedPhase) * lossMorph * 0.48 +
      Math.sin(t * Math.PI * 2.6 + seedPhase * 0.7) * willMorph * 0.38
    );
    const theta = baseTheta + phaseShear;

    // Hipertrofia Titânica visível: fita 1 (Vontade) expande até +66% radial
    // Fita 2 undula assimetricamente
    let strandRadial = 1.0;
    if (strand === 1) {
      strandRadial += willMorph * 0.42 + localWill * 0.32;
    } else {
      strandRadial += lossMorph * 0.28 * Math.sin(t * Math.PI * 6.2 + seedPhase) - localComm * 0.06;
    }

    // Bulbo anatômico nos loci mutados permanentes
    for (const mark of this.persistentMarks) {
      const dist = Math.abs(t - mark.t);
      if (dist < 0.06) {
        strandRadial += (1 - dist / 0.06) * 0.34;
      }
    }

    // Ondulação 3D viva em eixos Y e Z
    const warpY = radius * sign * (
      Math.sin(t * Math.PI * 3.6 + seedPhase) * willMorph * 0.22 +
      Math.sin(t * Math.PI * 5.8 + seedPhase * 1.3) * lossMorph * 0.25
    );
    const warpZ = radius * (
      Math.cos(t * Math.PI * 3.0 + seedPhase) * willMorph * 0.18 +
      Math.sin(t * Math.PI * 4.4 + seedPhase * 0.9) * lossMorph * 0.20
    );

    // Contenção da humanidade: estabiliza quando em 100%; quando cai, o genoma fica descontrolado
    const containment = Math.max(0.32, 1 - humanityMorph * 0.52);
    const y = centerY + radius * strandRadial * Math.sin(theta) + warpY * containment;
    const z = radius * strandRadial * Math.cos(theta) + warpZ * containment;
    const x = xBase + Math.sin(t * Math.PI * 8 + seedPhase) * radius * 0.05 * (willMorph + lossMorph * 0.8) * containment;

    return { x, y, z, theta, baseTheta, fields, radial: strandRadial, localWill, localLoss, localComm };
  }

  _drawBackground(project, centerY, timeSec) {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;

    ctx.save();
    // Holographic Medical Bio-Grid
    ctx.strokeStyle = "rgba(63, 244, 213, 0.04)";
    ctx.lineWidth = 1.0;
    const step = 44;
    ctx.beginPath();
    for (let x = 0; x < width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Precision medical crosshair markers at intervals
    ctx.strokeStyle = "rgba(63, 244, 213, 0.16)";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (let x = step * 2; x < width - step; x += step * 3) {
      for (let y = step * 2; y < height - step; y += step * 3) {
        ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y);
        ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3);
      }
    }
    ctx.stroke();

    // Subtle bio-luminescent vignette focused behind the helix
    const glow = ctx.createRadialGradient(width * 0.46, centerY, 20, width * 0.46, centerY, width * 0.45);
    glow.addColorStop(0, "rgba(63, 244, 213, 0.038)");
    glow.addColorStop(0.5, "rgba(2, 20, 24, 0.02)");
    glow.addColorStop(1, "rgba(1, 14, 17, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  _pushBranchRenderables(project, centerY, radius, startX, endX) {
    const m = this.metrics;
    const strength = clamp01(m.willMorph || 0);
    if (strength < 0.10 || !this.branchSlots.length) return;

    this.branchSlots.forEach((branch, branchIndex) => {
      const source = this._helixWorld(branch.t, branch.strand, centerY, radius, startX, endX);
      const points = [];
      const high = Math.max(0, (strength - 0.20) / 0.80);
      const steps = 12 + Math.round(branch.length * (5 + high * 7));
      const maxLen = radius * (0.22 + strength * 0.95) * branch.length;
      const tangent = source.theta + Math.PI * 0.5;
      for (let step = 0; step < steps; step += 1) {
        const f = step / Math.max(1, steps - 1);
        const curl = Math.sin(f * Math.PI * (1.15 + branch.length * 0.75) + branch.phase) * radius * (0.045 + high * 0.16);
        const x = source.x + f * maxLen * (0.45 + high * 0.48);
        const y = source.y + branch.sign * f * maxLen + curl;
        const z = source.z + Math.cos(tangent + f * (1.4 + high * 1.8) + branch.curl) * radius * (0.10 + high * 0.26) * f;
        points.push(project(x, y, z));
      }
      for (let i = 0; i < points.length - 1; i += 1) {
        const p1 = points[i];
        const p2 = points[i + 1];
        this._pushRenderable({
          type: "branch",
          p1,
          p2,
          z: (p1.z + p2.z) * 0.5,
          strength,
          persistent: branch.persistent,
          width: Math.max(0.75, (1.2 + strength * 2.2) * (1 - i / points.length * 0.58))
        });
        if (high > 0.16 && i % 3 === 0) {
          this._pushRenderable({ type: "branch_bead", p: p1, z: p1.z, strength, persistent: branch.persistent });
        }
        // Espinhos laterais afiados projetando-se das ramificações
        if (high > 0.22 && (i === 3 || i === 7)) {
          const dx = p2.px - p1.px;
          const dy = p2.py - p1.py;
          const barbLen = (5 + strength * 9) * p1.scale;
          const barbAngle = Math.atan2(dy, dx) + branch.sign * 0.78;
          const barbP2 = {
            px: p1.px + Math.cos(barbAngle) * barbLen,
            py: p1.py + Math.sin(barbAngle) * barbLen,
            scale: p1.scale,
            normZ: p1.normZ,
            z: p1.z
          };
          this._pushRenderable({ type: "spine_barb", p1, p2: barbP2, z: p1.z, strength });
        }
      }
      if (strength > 0.18 && points.length > 0) {
        const tip = points.at(-1);
        this._pushRenderable({ type: "branch_tip", p: tip, z: tip.z, strength });
      }
    });
  }

  _pushLatticeRenderables(project, centerY, radius, startX, endX) {
    const m = this.metrics;
    const strength = clamp01(m.communionMorph || 0);
    if (strength < 0.09 || !this.latticeSlots.length) return;
    this.latticeSlots.forEach((slot, index) => {
      const high = Math.max(0, (strength - 0.18) / 0.82);
      const a = this._helixWorld(slot.t, 1, centerY, radius, startX, endX);
      const b = this._helixWorld(Math.min(0.96, slot.t + 0.025 + slot.spread * (0.012 + high * 0.022)), 2, centerY, radius, startX, endX);
      const pA = project(a.x, a.y, a.z);
      const pB = project(b.x, b.y, b.z);
      const outer = project(
        (a.x + b.x) * 0.5 + radius * (0.06 + high * 0.16) * Math.sin(slot.phase),
        centerY + slot.sign * radius * (1.02 + slot.spread * (0.10 + high * 0.35)),
        (a.z + b.z) * 0.5 + slot.sign * radius * (0.08 + high * 0.30)
      );
      // Membrana bio-orgânica translúcida preenchendo a malha
      this._pushRenderable({ type: "lattice_membrane", p1: pA, p2: outer, p3: pB, z: (pA.z + pB.z + outer.z) / 3, strength, phase: slot.phase, index });
      this._pushRenderable({ type: "lattice", p1: pA, p2: outer, z: (pA.z + outer.z) * 0.5, strength, phase: slot.phase, index });
      this._pushRenderable({ type: "lattice", p1: outer, p2: pB, z: (outer.z + pB.z) * 0.5, strength, phase: slot.phase, index });
      this._pushRenderable({ type: "lattice_node", p: outer, z: outer.z, strength });
    });
  }

  _pushHumanityLocks(project, centerY, radius, startX, endX) {
    const humanityMorph = clamp01(this.metrics.humanityMorph || 0);
    const lossMorph = clamp01(this.metrics.identityLossMorph || 0);
    if (!this.humanityLockSlots?.length) return;
    this.humanityLockSlots.forEach((slot) => {
      const w1 = this._helixWorld(slot.t, 1, centerY, radius, startX, endX);
      const w2 = this._helixWorld(slot.t, 2, centerY, radius, startX, endX);
      const p1 = project(w1.x, w1.y, w1.z);
      const p2 = project(w2.x, w2.y, w2.z);
      const center = project((w1.x + w2.x) * 0.5, centerY, 0);
      if (humanityMorph >= 0.38 && lossMorph < 0.45) {
        this._pushRenderable({
          type: "humanity_lock",
          p1,
          p2,
          p: center,
          z: center.z + 3,
          strength: humanityMorph,
          phase: slot.phase,
          weight: slot.weight,
          t: slot.t
        });
      } else {
        this._pushRenderable({
          type: "broken_lock",
          p1,
          p2,
          p: center,
          z: center.z + 3,
          strength: Math.max(0.3, lossMorph),
          phase: slot.phase,
          weight: slot.weight,
          t: slot.t
        });
      }
    });
  }

  _pushPersistentMarks(project, centerY, radius, startX, endX) {
    for (const mark of this.persistentMarks) {
      const world = this._helixWorld(mark.t, 1, centerY, radius, startX, endX);
      const p = project(world.x, world.y, world.z);
      this._pushRenderable({
        type: "mutation_cyst",
        p,
        z: p.z + 6,
        axis: mark.axis,
        ring: Math.max(6, mark.ring * 1.3),
        phase: mark.phase,
        t: mark.t,
        name: mark.name
      });
    }
  }

  _pushTerminalTail(project, centerY, radius, startX, endX) {
    // Mantém a cauda fractal característica do DNA ANALYSIS original em todos os
    // estados. Vontade/perda identitária apenas ampliam sua agressividade em estágios altos.
    const will = this.metrics.willMorph || 0;
    const loss = this.metrics.identityLossMorph || 0;
    const energy = clamp01(Math.max(will, loss));
    const unit = Math.max(0.72, Math.min(1.08, this.width / 1000));
    const extra = Math.max(0, (energy - 0.30) / 0.70);

    const build = (kind, steps, xReach, yFn, zFn, widthFn) => {
      const pts = [];
      for (let step = 0; step < steps; step += 1) {
        const frac = step / Math.max(1, steps - 1);
        const bx = endX + frac * xReach * unit * (1 + extra * 0.22);
        const by = yFn(frac, extra);
        const bz = zFn(frac, extra);
        pts.push(project(bx, by, bz));
      }
      for (let step = 0; step < pts.length - 1; step += 1) {
        const p1 = pts[step]; const p2 = pts[step + 1];
        this._pushRenderable({ type: "tail", p1, p2, z: (p1.z + p2.z) * 0.5, energy, child: kind === "child", width: widthFn(step, pts.length) });
        this._pushRenderable({ type: "tail_bead", p: p1, z: p1.z, energy, child: kind === "child", radius: Math.max(0.75, 2.35 - step * 0.075) });
      }
      return pts;
    };

    build("top", 26, 105,
      (f,e) => centerY - 28 * unit * Math.sin(f * Math.PI * 0.5) + Math.pow(f, 1.5) * 8 * unit - e * 18 * unit * f,
      (f,e) => 15 * Math.cos(f * Math.PI + this.angle) + Math.sin(f * 5 + this.seed) * e * 10,
      (i,n) => Math.max(0.8, 2.0 * (1 - i / Math.max(1,n+2)))
    );

    build("bottom", 20, 85,
      (f,e) => centerY + 24 * unit * Math.sin(f * Math.PI * 0.5) - Math.pow(f, 1.5) * 6 * unit + e * 14 * unit * f,
      (f,e) => -15 * Math.cos(f * Math.PI + this.angle) - Math.sin(f * 4.2 + this.seed) * e * 8,
      (i,n) => Math.max(0.8, 1.8 * (1 - i / Math.max(1,n+2)))
    );

    build("child", 16, 68,
      (f,e) => centerY - 20 * unit - f * (26 + e * 18) * unit,
      (f,e) => 18 - f * 15 + Math.sin(f * 4 + this.seed) * e * 7,
      () => 1.15
    );
  }

  _render(now) {
    if (!this.running || !this.canvas?.isConnected || !this.ctx) {
      this.stop();
      return;
    }

    const dt = Math.min(50, now - this.lastTime);
    this.lastTime = now;
    if (dt > 34) { this.slowFrames += 1; this.fastFrames = 0; }
    else if (dt < 23) { this.fastFrames += 1; this.slowFrames = 0; }
    else { this.slowFrames = Math.max(0, this.slowFrames - 1); this.fastFrames = Math.max(0, this.fastFrames - 1); }
    if (this.slowFrames > 24 && this.quality > 0.75) { this.quality = 0.72; this.slowFrames = 0; }
    if (this.fastFrames > 180 && this.quality < 1) { this.quality = 1; this.fastFrames = 0; }
    const timeSec = now / 1000;
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    ctx.clearRect(0, 0, width, height);

    this.tiltX += (this.targetTiltX - this.tiltX) * 0.08;
    this.tiltY += (this.targetTiltY - this.tiltY) * 0.08;
    if (!this.paused) {
      this.angle += this.rotSpeed * (dt / 16.667);
      this.laserPhase += 0.018 * (dt / 16.667);
      this.signalPulsePhase += 0.035 * (dt / 16.667);
    }

    const centerY = height * 0.52;
    // Mesmas proporções do DNA ANALYSIS original. Os estágios alteram a anatomia
    // local, não o enquadramento inteiro da molécula.
    const baseRadius = Math.min(94, height * 0.25);
    const globalWill = Math.max(0, ((this.metrics.willMorph || 0) - 0.24) / 0.76);
    const globalLoss = Math.max(0, ((this.metrics.identityLossMorph || 0) - 0.24) / 0.76);
    const globalHumanity = Math.max(0, ((this.metrics.humanityMorph || 0) - 0.49) / 0.51);
    const radius = baseRadius * (1 + globalWill * 0.035 + globalLoss * 0.025 - globalHumanity * 0.012);
    const startX = width * 0.045;
    const endX = width * 0.82;
    const project = this._projector(centerY, radius);

    this._drawBackground(project, centerY, timeSec);

    const laserX = startX + (0.5 + 0.5 * Math.sin(this.laserPhase)) * (endX - startX);
    this._poolIndex = 0;
    const sampleCount = 120;
    if (!this._s1) this._s1 = [];
    if (!this._s2) this._s2 = [];

    for (let i = 0; i < sampleCount; i += 1) {
      const t = i / (sampleCount - 1);
      const w1 = this._helixWorld(t, 1, centerY, radius, startX, endX);
      const w2 = this._helixWorld(t, 2, centerY, radius, startX, endX);
      const p1 = project(w1.x, w1.y, w1.z);
      const p2 = project(w2.x, w2.y, w2.z);
      this._s1[i] = { ...p1, t, world: w1, fracture: this._fractureStrength(t) };
      this._s2[i] = { ...p2, t, world: w2, fracture: this._fractureStrength(t) };
    }

    for (let i = 0; i < sampleCount - 1; i += 1) {
      const a1 = this._s1[i]; const b1 = this._s1[i + 1];
      const a2 = this._s2[i]; const b2 = this._s2[i + 1];
      const frag1 = Math.max(a1.fracture, b1.fracture);
      const frag2 = Math.max(a2.fracture, b2.fracture);
      if (frag1 < 0.52) {
        this._pushRenderable({ type: "backbone", p1: a1, p2: b1, z: (a1.z + b1.z) * 0.5, strand: 1, fracture: frag1, t: a1.t, sampleIndex: i });
      } else {
        this._pushRenderable({ type: "fracture_shard", p1: a1, p2: b1, z: (a1.z + b1.z) * 0.5, strand: 1, fracture: frag1, t: a1.t, sampleIndex: i });
      }
      if (frag2 < 0.56) {
        this._pushRenderable({ type: "backbone", p1: a2, p2: b2, z: (a2.z + b2.z) * 0.5, strand: 2, fracture: frag2, t: a2.t, sampleIndex: i });
      } else {
        this._pushRenderable({ type: "fracture_shard", p1: a2, p2: b2, z: (a2.z + b2.z) * 0.5, strand: 2, fracture: frag2, t: a2.t, sampleIndex: i });
      }
    }

    const rungCount = 38;
    const instability = Math.max(0, (100 - (this.metrics.stability || 100)) / 100);
    const willMorph = this.metrics.willMorph || 0;
    const communionMorph = this.metrics.communionMorph || 0;
    const lossMorph = this.metrics.identityLossMorph || 0;

    for (let i = 0; i < rungCount; i += 1) {
      const t = i / (rungCount - 1);
      const w1 = this._helixWorld(t, 1, centerY, radius, startX, endX);
      const w2 = this._helixWorld(t, 2, centerY, radius, startX, endX);
      const p1 = project(w1.x, w1.y, w1.z);
      const p2 = project(w2.x, w2.y, w2.z);
      const fracture = this._fractureStrength(t);
      const anomalous = this.anomalousRungs.has(i);

      // Mapeamento autêntico de pares de bases Watson-Crick (A-T / G-C)
      const bpIndex = Math.abs(Math.floor(Math.sin(i * 12.9898 + (this.seed % 100)) * 43758.5453)) % 4;
      const bp = BASE_PAIRS[bpIndex];

      if (fracture < 0.85) {
        if (anomalous && (willMorph > 0.25 || lossMorph > 0.22)) {
          this._pushRenderable({ type: "torn_rung", p1, p2, z: (p1.z + p2.z) * 0.5 - 4, anomalous: true, fracture, t, i, bp });
        } else if (communionMorph > 0.28 && i % 3 === 0) {
          this._pushRenderable({ type: "symbiotic_rung", p1, p2, z: (p1.z + p2.z) * 0.5 - 4, anomalous, fracture, t, i, bp });
        } else {
          this._pushRenderable({ type: "rung", p1, p2, z: (p1.z + p2.z) * 0.5 - 4, anomalous, fracture, t, i, bp });
        }
      }

      // Nódulos de conexão limpos na fita (sem círculos e satélites caóticos)
      this._pushRenderable({ type: "strand_node", p: p1, z: p1.z, axis: anomalous ? "vontade" : "neutral", strand: 1, t });
      this._pushRenderable({ type: "strand_node", p: p2, z: p2.z, axis: anomalous ? "humanidade" : "neutral", strand: 2, t });
    }

    if (this.metrics.extraStrand > 0.04) {
      const thirdAlpha = clamp01(this.metrics.extraStrand);
      let last = null;
      for (let i = 0; i < sampleCount; i += 1) {
        const t = i / (sampleCount - 1);
        const base = this._helixWorld(t, 1, centerY, radius, startX, endX);
        // Terceira fita posicionada no Sulco Maior (Major Groove ~θ1 + π + 0.38)
        const majorGroovePhase = Math.PI + 0.38;
        const theta = base.theta + majorGroovePhase + Math.sin(t * 9 + this.seed) * 0.08 * thirdAlpha;
        const r = radius * (0.86 + thirdAlpha * 0.12);
        const world = {
          x: base.x,
          y: centerY + r * Math.sin(theta),
          z: r * Math.cos(theta)
        };
        const p = project(world.x, world.y, world.z);
        if (last) this._pushRenderable({ type: "third", p1: last, p2: p, z: (last.z + p.z) * 0.5, strength: thirdAlpha, t });
        // Pontes Hoogsteen periódicas conectando a 3ª fita ao duplex
        if (i % 8 === 0 && this._s1[i]) {
          this._pushRenderable({ type: "third_bridge", p1: p, p2: this._s1[i], z: (p.z + this._s1[i].z) * 0.5, strength: thirdAlpha, t });
          this._pushRenderable({ type: "third_node", p, z: p.z, strength: thirdAlpha });
        }
        last = p;
      }
    }

    this._pushBranchRenderables(project, centerY, radius, startX, endX);
    this._pushLatticeRenderables(project, centerY, radius, startX, endX);
    this._pushHumanityLocks(project, centerY, radius, startX, endX);
    this._pushPersistentMarks(project, centerY, radius, startX, endX);
    this._pushTerminalTail(project, centerY, radius, startX, endX);

    const active = this._renderables.slice(0, this._poolIndex);
    active.sort((a, b) => a.z - b.z);
    for (let i = 0; i < active.length; i += 1) {
      this._drawRenderable(active[i], laserX, now);
    }

    this._drawScientificHUD(startX, endX, centerY, radius);
    this._drawSparks(dt);
    this._drawScanner(laserX);
    this._drawHoverTarget(now);

    this.frameId = requestAnimationFrame((next) => this._render(next));
  }

  _hitFor(item, laserX, range = 30) {
    let x = null;
    if (item.p) x = item.p.px;
    else if (item.p1 && item.p2) x = (item.p1.px + item.p2.px) * 0.5;
    if (x == null) return { hit: false, intensity: 0 };
    const dist = Math.abs(x - laserX);
    const effRange = (item.type === "mutation_ring" || item.type === "mutation_cyst") ? 36 : range;
    return { hit: dist < effRange, intensity: dist < effRange ? 1 - dist / effRange : 0 };
  }

  _drawRenderable(item, laserX, now) {
    const ctx = this.ctx;
    const isMutationNode = item.type === "mutation_ring" || item.type === "mutation_cyst";
    const hit = this._hitFor(item, laserX, isMutationNode ? 36 : 28);
    const z = item.p?.normZ ?? item.p1?.normZ ?? 0.5;

    // Onda de bio-luminescência ao longo da fita (pulse wave)
    const signalWave = Math.sin((item.t ?? 0) * 12 - this.signalPulsePhase);
    const pulseBoost = signalWave > 0.78 ? (signalWave - 0.78) / 0.22 : 0;
    const dofFactor = z < 0.35 ? 0.60 + z * 1.14 : 1.0;
    const willMorph = this.metrics.willMorph || 0;
    const communionMorph = this.metrics.communionMorph || 0;
    const lossMorph = this.metrics.identityLossMorph || 0;

    if (item.type === "backbone") {
      // Hipertrofia Titânica: fita 1 (Vontade) ganha blindagem osteodérmica quitinosa
      if (item.strand === 1 && willMorph > 0.15) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(item.p1.px, item.p1.py);
        ctx.lineTo(item.p2.px, item.p2.py);
        const auraAlpha = (0.25 + willMorph * 0.45) * dofFactor;
        ctx.strokeStyle = rgba(COLORS.willDeep, auraAlpha);
        ctx.lineWidth = (3.4 + willMorph * 3.6) * (z > 0.5 ? 1.25 : 0.85);
        ctx.shadowColor = COLORS.will;
        ctx.shadowBlur = 10 * willMorph;
        ctx.stroke();
        ctx.restore();

        // Estriações cuticulares transversais quitinosas (placas osteodérmicas segmentadas)
        if (willMorph > 0.20 && (item.sampleIndex % 2 === 0)) {
          const dx = item.p2.px - item.p1.px;
          const dy = item.p2.py - item.p1.py;
          const segLen = Math.hypot(dx, dy) || 1;
          const nx = -dy / segLen;
          const ny = dx / segLen;
          const ribLen = (2.8 + willMorph * 3.8) * (item.p1.scale || 1);
          ctx.beginPath();
          ctx.moveTo(item.p1.px - nx * ribLen, item.p1.py - ny * ribLen);
          ctx.lineTo(item.p1.px + nx * ribLen, item.p1.py + ny * ribLen);
          ctx.strokeStyle = rgba(COLORS.willCore, 0.65 * willMorph * dofFactor);
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      }

      // Traçado do esqueleto de fosfodiéster com sombreamento cilíndrico 3D
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      if (hit.hit) {
        ctx.strokeStyle = rgba("#ffebaa", 0.60 + hit.intensity * 0.40);
        ctx.lineWidth = z > 0.5 ? 2.8 : 1.8;
        ctx.shadowColor = COLORS.gold;
        ctx.shadowBlur = 9;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (pulseBoost > 0) {
        const coreCol = item.strand === 1 && willMorph > 0.4 ? COLORS.will : COLORS.cyanBright;
        ctx.strokeStyle = rgba(coreCol, (0.50 + pulseBoost * 0.50) * dofFactor);
        ctx.lineWidth = (z > 0.5 ? 2.6 : 1.6) + pulseBoost * 1.0;
        ctx.shadowColor = coreCol;
        ctx.shadowBlur = 8 * pulseBoost;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        if (item.strand === 1 && willMorph > 0.25) {
          ctx.strokeStyle = rgba(COLORS.will, (0.50 + z * 0.45) * dofFactor);
          ctx.lineWidth = 2.4;
        } else if (z > 0.5) {
          ctx.strokeStyle = rgba(COLORS.cyan, (0.38 + z * 0.45) * dofFactor);
          ctx.lineWidth = 2.0;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(item.p1.px, item.p1.py);
          ctx.lineTo(item.p2.px, item.p2.py);
          ctx.strokeStyle = rgba(COLORS.cyanBright, (0.25 + z * 0.50) * dofFactor);
          ctx.lineWidth = 0.8;
        } else {
          ctx.strokeStyle = rgba(COLORS.cyanDim, (0.18 + z * 0.25) * dofFactor);
          ctx.lineWidth = 1.1;
        }
        ctx.stroke();
      }

      // Nódulos de Fosfato (PO4 3-) a cada 2 amostras ao longo da cadeia
      if ((item.sampleIndex % 2 === 0) && z > 0.22) {
        const noduleR = (1.2 + z * 1.3) * (item.p1.scale || 1);
        ctx.beginPath();
        ctx.arc(item.p1.px, item.p1.py, noduleR, 0, Math.PI * 2);
        ctx.fillStyle = rgba(COLORS.phosphate, (0.45 + z * 0.45) * dofFactor);
        ctx.fill();
        if (z > 0.48) {
          ctx.beginPath();
          ctx.arc(item.p1.px - 0.4, item.p1.py - 0.4, noduleR * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = rgba(COLORS.white, 0.85);
          ctx.fill();
        }
      }

      if (hit.hit && Math.random() < 0.035 + hit.intensity * 0.06) {
        this._sparkAt((item.p1.px + item.p2.px) * 0.5, (item.p1.py + item.p2.py) * 0.5, hit.intensity);
      }
      return;
    }

    if (item.type === "fracture_shard") {
      // Lasca óssea / fibra genética fragmentada sob cisalhamento
      const dx = item.p2.px - item.p1.px;
      const dy = item.p2.py - item.p1.py;
      const angle = Math.atan2(dy, dx);
      const len = Math.max(1, Math.hypot(dx, dy));
      ctx.save();
      ctx.translate(item.p1.px, item.p1.py);
      ctx.rotate(angle + Math.sin(now * 0.008 + (item.t || 0) * 8) * 0.15);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len * 0.40, -2.5);
      ctx.lineTo(len * 0.60, 2.5);
      ctx.lineTo(len * 0.88, 0);
      ctx.strokeStyle = rgba(COLORS.will, 0.88 * dofFactor);
      ctx.lineWidth = 1.8;
      ctx.shadowColor = COLORS.will;
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();
      if (Math.random() < 0.05) this._sparkAt((item.p1.px + item.p2.px) * 0.5, (item.p1.py + item.p2.py) * 0.5, 0.7);
      return;
    }

    if (item.type === "rung") {
      const bp = item.bp || BASE_PAIRS[0];
      const dx = item.p2.px - item.p1.px;
      const dy = item.p2.py - item.p1.py;
      const len = Math.hypot(dx, dy);
      if (len < 1) return;
      const nx = dx / len;
      const ny = dy / len;
      const px = -ny;
      const py = nx;

      // Base 1 (Fita 1 -> 38%)
      const end1X = item.p1.px + nx * len * 0.38;
      const end1Y = item.p1.py + ny * len * 0.38;
      const w1 = 2.4 * (item.p1.scale || 1);
      const w1Tip = 1.8 * (item.p1.scale || 1);

      ctx.save();
      // Placa trapezoidal do Nucleotídeo 1 (Purina/Pirimidina)
      ctx.beginPath();
      ctx.moveTo(item.p1.px + px * w1, item.p1.py + py * w1);
      ctx.lineTo(end1X + px * w1Tip, end1Y + py * w1Tip);
      ctx.lineTo(end1X - px * w1Tip, end1Y - py * w1Tip);
      ctx.lineTo(item.p1.px - px * w1, item.p1.py - py * w1);
      ctx.closePath();
      const col1 = item.anomalous ? COLORS.will : (hit.hit ? COLORS.gold : bp.c1);
      ctx.fillStyle = rgba(col1, (0.55 + z * 0.40) * dofFactor);
      if (hit.hit) {
        ctx.shadowColor = COLORS.gold;
        ctx.shadowBlur = 6;
      }
      ctx.fill();

      // Base 2 (Fita 2 -> 38%)
      const start2X = item.p1.px + nx * len * 0.62;
      const start2Y = item.p1.py + ny * len * 0.62;
      const w2Tip = 1.8 * (item.p2.scale || 1);
      const w2 = 2.4 * (item.p2.scale || 1);

      ctx.beginPath();
      ctx.moveTo(start2X + px * w2Tip, start2Y + py * w2Tip);
      ctx.lineTo(item.p2.px + px * w2, item.p2.py + py * w2);
      ctx.lineTo(item.p2.px - px * w2, item.p2.py - py * w2);
      ctx.lineTo(start2X - px * w2Tip, start2Y - py * w2Tip);
      ctx.closePath();
      const col2 = item.anomalous ? COLORS.will : (hit.hit ? COLORS.gold : bp.c2);
      ctx.fillStyle = rgba(col2, (0.55 + z * 0.40) * dofFactor);
      ctx.fill();

      // Pontes de Hidrogênio centrais (Zona 38% a 62%):
      // A=T -> 2 pontes paralelas | G≡C -> 3 pontes paralelas
      const bonds = bp.bonds || 2;
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = hit.hit ? rgba(COLORS.white, 0.95) : rgba(COLORS.white, (0.50 + z * 0.40) * dofFactor);

      if (bonds === 2) {
        const offset = 1.2 * (item.p1.scale || 1);
        ctx.beginPath();
        ctx.moveTo(end1X + px * offset, end1Y + py * offset);
        ctx.lineTo(start2X + px * offset, start2Y + py * offset);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(end1X - px * offset, end1Y - py * offset);
        ctx.lineTo(start2X - px * offset, start2Y - py * offset);
        ctx.stroke();
      } else {
        const offset = 1.6 * (item.p1.scale || 1);
        ctx.beginPath();
        ctx.moveTo(end1X + px * offset, end1Y + py * offset);
        ctx.lineTo(start2X + px * offset, start2Y + py * offset);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(end1X, end1Y);
        ctx.lineTo(start2X, start2Y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(end1X - px * offset, end1Y - py * offset);
        ctx.lineTo(start2X - px * offset, start2Y - py * offset);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Micro-rotulagem de bases A/T/C/G em alta resolução no primeiro plano
      if (z > 0.42 && len > 32) {
        ctx.font = "bold 6.5px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = rgba(COLORS.white, 0.88 * dofFactor);
        const mid1X = (item.p1.px + end1X) * 0.5;
        const mid1Y = (item.p1.py + end1Y) * 0.5;
        ctx.fillText(bp.b1, mid1X, mid1Y);
        const mid2X = (start2X + item.p2.px) * 0.5;
        const mid2Y = (start2Y + item.p2.py) * 0.5;
        ctx.fillText(bp.b2, mid2X, mid2Y);
      }

      ctx.restore();
      return;
    }

    if (item.type === "torn_rung") {
      // Degrau rompido por mutação predatória: clivagem assimétrica (extremidades coesivas)
      const dx = item.p2.px - item.p1.px;
      const dy = item.p2.py - item.p1.py;
      const len = Math.hypot(dx, dy);
      if (len < 1) return;
      const nx = dx / len;
      const ny = dy / len;
      const px = -ny;
      const py = nx;

      const stub1Len = len * 0.34;
      const stub2Len = len * 0.22;
      const s1EndX = item.p1.px + nx * stub1Len;
      const s1EndY = item.p1.py + ny * stub1Len;
      const s2StartX = item.p2.px - nx * stub2Len;
      const s2StartY = item.p2.py - ny * stub2Len;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(s1EndX, s1EndY);
      ctx.lineTo(s1EndX + px * 2, s1EndY + py * 2);
      ctx.strokeStyle = rgba(COLORS.will, 0.90 * dofFactor);
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(item.p2.px, item.p2.py);
      ctx.lineTo(s2StartX, s2StartY);
      ctx.lineTo(s2StartX - px * 2, s2StartY - py * 2);
      ctx.strokeStyle = rgba(COLORS.will, 0.90 * dofFactor);
      ctx.lineWidth = 1.8;
      ctx.stroke();

      if (Math.random() < 0.08) {
        this._sparkAt(s1EndX, s1EndY, 0.85);
      }

      // Arcos duplos de plasma elétrico cruzando a ruptura com jitter temporal
      const arcSteps = 5;
      for (let arc = 0; arc < 2; arc += 1) {
        ctx.beginPath();
        ctx.moveTo(s1EndX, s1EndY);
        const arcSign = arc === 0 ? 1 : -1;
        for (let s = 1; s < arcSteps; s += 1) {
          const ratio = s / arcSteps;
          const mx = s1EndX + (s2StartX - s1EndX) * ratio;
          const my = s1EndY + (s2StartY - s1EndY) * ratio;
          const jitter = Math.sin(now * 0.032 + s * 4.1 + (item.i || 0) * 5 + arc * 2.7) * (3.8 + lossMorph * 3.5) * arcSign;
          ctx.lineTo(mx + px * jitter, my + py * jitter);
        }
        ctx.lineTo(s2StartX, s2StartY);
        ctx.strokeStyle = arc === 0 ? rgba(COLORS.white, 0.95) : rgba(COLORS.gold, 0.80);
        ctx.lineWidth = arc === 0 ? 1.2 : 0.8;
        ctx.shadowColor = COLORS.gold;
        ctx.shadowBlur = 7;
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (item.type === "symbiotic_rung") {
      // Degrau simbiótico harmônico com trilho duplo e núcleo de ressonância em diamante
      const dx = item.p2.px - item.p1.px;
      const dy = item.p2.py - item.p1.py;
      const len = Math.hypot(dx, dy);
      if (len < 1) return;
      const nx = -dy / len * 2.2;
      const ny = dx / len * 2.2;

      ctx.beginPath();
      ctx.moveTo(item.p1.px + nx, item.p1.py + ny);
      ctx.lineTo(item.p2.px + nx, item.p2.py + ny);
      ctx.strokeStyle = rgba(COLORS.communion, 0.70 * dofFactor);
      ctx.lineWidth = 1.0;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(item.p1.px - nx, item.p1.py - ny);
      ctx.lineTo(item.p2.px - nx, item.p2.py - ny);
      ctx.strokeStyle = rgba(COLORS.communion, 0.70 * dofFactor);
      ctx.lineWidth = 1.0;
      ctx.stroke();

      const midX = (item.p1.px + item.p2.px) * 0.5;
      const midY = (item.p1.py + item.p2.py) * 0.5;
      const pulse = 1 + Math.sin(now * 0.004 + (item.t || 0) * 8) * 0.25;
      const dSize = 3.6 * pulse * (item.p1.scale || 1);

      ctx.save();
      ctx.strokeStyle = rgba(COLORS.communionBright, 0.75);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(midX - dSize * 1.8, midY); ctx.lineTo(midX + dSize * 1.8, midY);
      ctx.moveTo(midX, midY - dSize * 1.8); ctx.lineTo(midX, midY + dSize * 1.8);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(midX, midY - dSize);
      ctx.lineTo(midX + dSize, midY);
      ctx.lineTo(midX, midY + dSize);
      ctx.lineTo(midX - dSize, midY);
      ctx.closePath();
      ctx.fillStyle = rgba(COLORS.white, 0.95);
      ctx.shadowColor = COLORS.communionBright;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
      return;
    }

    if (item.type === "bead") {
      const r = (1.1 + z * 1.5) * item.p.scale;
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, r, 0, Math.PI * 2);
      if (hit.hit) {
        ctx.fillStyle = COLORS.white;
        ctx.shadowColor = COLORS.gold;
        ctx.shadowBlur = 10;
      } else if (pulseBoost > 0) {
        ctx.fillStyle = rgba(item.anomalous ? COLORS.will : COLORS.white, (0.75 + pulseBoost * 0.25) * dofFactor);
        ctx.shadowColor = item.anomalous ? COLORS.will : COLORS.cyanBright;
        ctx.shadowBlur = 6 * pulseBoost;
      } else if (item.anomalous) {
        ctx.fillStyle = rgba(COLORS.will, (0.62 + z * 0.25) * dofFactor);
      } else if (z > 0.45) {
        ctx.fillStyle = rgba(COLORS.cyan, (0.55 + z * 0.45) * dofFactor);
      } else {
        ctx.fillStyle = rgba("#106e73", (0.20 + z * 0.35) * dofFactor);
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      return;
    }

    if (item.type === "strand_node") {
      const accent = item.axis === "vontade" ? COLORS.will : item.axis === "humanidade" ? COLORS.humanity : COLORS.cyan;
      if (item.ring && z > 0.20) {
        const ring = (5.0 + (item.peak || 0.5) * 3.5) * item.p.scale;
        ctx.beginPath();
        ctx.arc(item.p.px, item.p.py, ring, 0, Math.PI * 2);
        if (hit.hit) {
          ctx.strokeStyle = COLORS.white;
          ctx.lineWidth = 2.4;
          ctx.shadowColor = COLORS.gold;
          ctx.shadowBlur = 14;
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(item.p.px, item.p.py, 1.8 * item.p.scale, 0, Math.PI * 2);
          ctx.fillStyle = COLORS.white;
          ctx.fill();
        } else {
          ctx.strokeStyle = rgba(accent, (0.70 + z * 0.30) * dofFactor);
          ctx.lineWidth = 2.4;
          if (z > 0.4 || pulseBoost > 0) {
            ctx.shadowColor = rgba(accent, 0.75);
            ctx.shadowBlur = (8 * z) + (pulseBoost * 8);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(item.p.px, item.p.py, ring * 0.45, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(COLORS.cyanBright, (0.40 + z * 0.40) * dofFactor);
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(item.p.px, item.p.py, 1.4 * item.p.scale, 0, Math.PI * 2);
          ctx.fillStyle = z > 0.5 ? COLORS.white : rgba(accent, 0.75);
          ctx.fill();
        }
      } else {
        const dotR = (1.6 + z * 2.0) * item.p.scale;
        ctx.beginPath();
        ctx.arc(item.p.px, item.p.py, dotR, 0, Math.PI * 2);
        if (hit.hit) {
          ctx.fillStyle = COLORS.white;
          ctx.shadowColor = COLORS.gold;
          ctx.shadowBlur = 10;
        } else if (pulseBoost > 0) {
          ctx.fillStyle = rgba(accent, (0.70 + pulseBoost * 0.30) * dofFactor);
          ctx.shadowColor = accent;
          ctx.shadowBlur = 7 * pulseBoost;
        } else if (z > 0.45) {
          ctx.fillStyle = rgba(accent, (0.50 + z * 0.50) * dofFactor);
        } else {
          ctx.fillStyle = rgba("#106e73", (0.20 + z * 0.35) * dofFactor);
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      return;
    }

    if (item.type === "satellite") {
      const r = 3.5 * item.p.scale;
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, r, 0, Math.PI * 2);
      ctx.strokeStyle = hit.hit ? COLORS.gold : rgba(COLORS.cyan, 0.85);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      return;
    }

    if (item.type === "twist") {
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, 4.5 * item.p.scale, 0, Math.PI * 2);
      ctx.strokeStyle = hit.hit ? COLORS.white : rgba(COLORS.cyanBright, 0.90);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      return;
    }

    if (item.type === "third") {
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      ctx.strokeStyle = hit.hit ? rgba(COLORS.gold, 0.88) : rgba(COLORS.communion, 0.18 + item.strength * 0.72);
      ctx.lineWidth = 0.8 + item.strength * 1.5 + z * 0.8;
      ctx.shadowColor = COLORS.communion;
      ctx.shadowBlur = item.strength * 7;
      ctx.stroke();
      ctx.shadowBlur = 0;
      return;
    }

    if (item.type === "third_bridge") {
      // Pontes Hoogsteen no Sulco Maior (Major Groove)
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      ctx.strokeStyle = rgba(COLORS.communionBright, 0.55 * item.strength * dofFactor);
      ctx.lineWidth = 1.0;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      const midX = (item.p1.px + item.p2.px) * 0.5;
      const midY = (item.p1.py + item.p2.py) * 0.5;
      ctx.beginPath();
      ctx.arc(midX, midY, 1.2 * (item.p1.scale || 1), 0, Math.PI * 2);
      ctx.fillStyle = rgba(COLORS.white, 0.85);
      ctx.fill();
      return;
    }

    if (item.type === "third_node") {
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, 2.2 * item.p.scale, 0, Math.PI * 2);
      ctx.fillStyle = rgba(COLORS.communion, 0.80);
      ctx.shadowColor = COLORS.communion;
      ctx.shadowBlur = 5;
      ctx.fill();
      ctx.shadowBlur = 0;
      return;
    }

    if (item.type === "branch") {
      // Placas de quitina articuladas trapezoidais formando os cornos osteodérmicos
      const dx = item.p2.px - item.p1.px;
      const dy = item.p2.py - item.p1.py;
      const segLen = Math.hypot(dx, dy);
      if (segLen < 0.5) return;
      const nx = dx / segLen;
      const ny = dy / segLen;
      const px = -ny;
      const py = nx;

      const wBase = (item.width || 2) * 1.2 * (item.p1.scale || 1);
      const wTip = Math.max(0.6, wBase * 0.72);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(item.p1.px + px * wBase, item.p1.py + py * wBase);
      ctx.lineTo(item.p2.px + px * wTip, item.p2.py + py * wTip);
      ctx.lineTo(item.p2.px - px * wTip, item.p2.py - py * wTip);
      ctx.lineTo(item.p1.px - px * wBase, item.p1.py - py * wBase);
      ctx.closePath();

      const color = item.persistent ? COLORS.will : "#d76a51";
      ctx.fillStyle = hit.hit ? rgba(COLORS.gold, 0.90) : rgba(color, (0.42 + item.strength * 0.50) * dofFactor);
      if (item.persistent || hit.hit) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 5 + item.strength * 6;
      }
      ctx.fill();

      // Quilha dorsal central da placa de quitina
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      ctx.strokeStyle = rgba(COLORS.willCore, 0.55 * dofFactor);
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.restore();
      return;
    }

    if (item.type === "spine_barb") {
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      ctx.strokeStyle = rgba(COLORS.will, 0.85);
      ctx.lineWidth = 1.1;
      ctx.shadowColor = COLORS.will;
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.shadowBlur = 0;
      return;
    }

    if (item.type === "branch_bead") {
      const r = 1.6 + z * 1.4;
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, r, 0, Math.PI * 2);
      ctx.fillStyle = hit.hit ? COLORS.white : rgba(COLORS.will, 0.68);
      ctx.fill();
      return;
    }

    if (item.type === "branch_tip") {
      const size = 5.5 * item.p.scale;
      ctx.save();
      ctx.translate(item.p.px, item.p.py);
      ctx.rotate(now * 0.0035);
      // Coroa de ionização de 4 pontas
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.28, -size * 0.28);
      ctx.lineTo(size, 0);
      ctx.lineTo(size * 0.28, size * 0.28);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.28, size * 0.28);
      ctx.lineTo(-size, 0);
      ctx.lineTo(-size * 0.28, -size * 0.28);
      ctx.closePath();
      ctx.fillStyle = hit.hit ? COLORS.white : COLORS.will;
      ctx.shadowColor = COLORS.will;
      ctx.shadowBlur = 12;
      ctx.fill();

      // Ponto de luz nuclear central
      ctx.beginPath();
      ctx.arc(0, 0, 1.4 * item.p.scale, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.white;
      ctx.fill();
      ctx.restore();
      return;
    }

    if (item.type === "lattice_membrane") {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      ctx.lineTo(item.p3.px, item.p3.py);
      ctx.closePath();
      const memAlpha = (0.04 + item.strength * 0.12) * (0.8 + Math.sin(now * 0.002 + item.phase) * 0.2);
      ctx.fillStyle = rgba(COLORS.communion, memAlpha);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (item.type === "lattice") {
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      const midX = (item.p1.px + item.p2.px) / 2;
      const midY = (item.p1.py + item.p2.py) / 2 + Math.sin(now * 0.001 + item.phase) * 5 * item.strength;
      ctx.quadraticCurveTo(midX, midY, item.p2.px, item.p2.py);
      ctx.strokeStyle = hit.hit ? rgba(COLORS.gold, 0.88) : rgba(COLORS.communion, 0.22 + item.strength * 0.55);
      ctx.lineWidth = 0.65 + item.strength * 1.05;
      ctx.shadowColor = COLORS.communion;
      ctx.shadowBlur = 2 + item.strength * 5;
      ctx.stroke();
      ctx.shadowBlur = 0;
      return;
    }

    if (item.type === "lattice_node") {
      const pulse = 1 + Math.sin(now * 0.003 + item.p.px * 0.02) * 0.22;
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, (2.4 + item.strength * 2.2) * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = hit.hit ? COLORS.gold : rgba(COLORS.communion, 0.76);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      return;
    }

    if (item.type === "tail") {
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      const tailColor = willMorph > 0.72 ? COLORS.will : COLORS.cyan;
      ctx.strokeStyle = hit.hit ? rgba(COLORS.gold, 0.94) : rgba(tailColor, (item.child ? 0.45 : 0.66) + item.energy * 0.20);
      ctx.lineWidth = item.width * (0.76 + z * 0.48);
      ctx.shadowColor = tailColor;
      ctx.shadowBlur = item.child ? 2 : 4 + item.energy * 3;
      ctx.stroke();
      ctx.shadowBlur = 0;
      return;
    }

    if (item.type === "tail_bead") {
      const tailColor = willMorph > 0.72 ? COLORS.will : COLORS.cyanBright;
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, (item.child ? 1.15 : 1.65) * item.p.scale, 0, Math.PI * 2);
      ctx.fillStyle = hit.hit ? COLORS.white : rgba(tailColor, 0.72 + z * 0.22);
      ctx.fill();
      return;
    }

    if (item.type === "humanity_lock") {
      const strength = item.strength || 0;
      const pulse = 1 + Math.sin(now * 0.0018 + item.phase) * (0.03 + strength * 0.08);
      const r = (3.2 + strength * 6.5) * pulse * (item.weight || 1);

      ctx.save();
      // Haste transversal de contenção criogênica com marcadores Vernier
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      ctx.strokeStyle = hit.hit ? rgba(COLORS.gold, 0.90) : rgba(COLORS.humanity, 0.35 + strength * 0.45);
      ctx.lineWidth = 1.1 + strength * 0.8;
      ctx.stroke();

      // Anel de contenção central com divisões de escala Vernier (ticks a cada 45°)
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, r, 0, Math.PI * 2);
      ctx.strokeStyle = hit.hit ? COLORS.gold : rgba(COLORS.humanity, 0.40 + strength * 0.60);
      ctx.lineWidth = 1.2 + strength * 0.8;
      if (strength > 0.4) {
        ctx.shadowColor = COLORS.humanity;
        ctx.shadowBlur = 6 + strength * 6;
      }
      ctx.stroke();

      // Graduação Vernier do calibre de confinamento
      for (let a = 0; a < 8; a += 1) {
        const ang = item.phase + (a * Math.PI) / 4;
        const tickR1 = r - 1.6;
        const tickR2 = r + 1.8;
        ctx.beginPath();
        ctx.moveTo(item.p.px + Math.cos(ang) * tickR1, item.p.py + Math.sin(ang) * tickR1);
        ctx.lineTo(item.p.px + Math.cos(ang) * tickR2, item.p.py + Math.sin(ang) * tickR2);
        ctx.strokeStyle = rgba(COLORS.humanity, 0.75);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Garras bilaterais de fixação nas fitas 1 e 2
      ctx.fillStyle = rgba(COLORS.humanity, 0.90);
      ctx.beginPath();
      ctx.arc(item.p1.px, item.p1.py, 2.0 * (item.p1.scale || 1), 0, Math.PI * 2);
      ctx.arc(item.p2.px, item.p2.py, 2.0 * (item.p2.scale || 1), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    if (item.type === "broken_lock") {
      // Braçadeira de contenção mecânica arrebentada por cisalhamento do Kaiju
      ctx.save();
      // Garra 1 deformada com fratura em dente de serra
      ctx.beginPath();
      ctx.moveTo(item.p1.px - 8, item.p1.py - 5);
      ctx.lineTo(item.p1.px + 2, item.p1.py + 1);
      ctx.lineTo(item.p1.px + 5, item.p1.py - 2);
      ctx.strokeStyle = rgba(COLORS.will, 0.90);
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // Garra 2 deformada
      ctx.beginPath();
      ctx.moveTo(item.p2.px + 8, item.p2.py + 5);
      ctx.lineTo(item.p2.px - 2, item.p2.py - 1);
      ctx.lineTo(item.p2.px - 5, item.p2.py + 2);
      ctx.strokeStyle = rgba(COLORS.will, 0.90);
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // Ponto de ruptura em superaquecimento (vermelho de alerta)
      const pulse = 1 + Math.sin(now * 0.008 + item.phase) * 0.3;
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, 4.8 * pulse, 0, Math.PI * 1.4);
      ctx.strokeStyle = rgba(COLORS.redAlert, 0.95);
      ctx.lineWidth = 1.6;
      ctx.shadowColor = COLORS.redAlert;
      ctx.shadowBlur = 9;
      ctx.stroke();
      ctx.restore();

      if (Math.random() < 0.06) {
        this._sparkAt(item.p.px, item.p.py, 1.0);
      }
      return;
    }

    if (item.type === "mutation_ring" || item.type === "mutation_cyst") {
      const axisColor = item.axis === "vontade" ? COLORS.will : item.axis === "comunhao" ? COLORS.communion : COLORS.humanity;
      const pulse = 1 + Math.sin(now * 0.003 + item.phase) * 0.15;
      const baseR = (item.ring || 8) * pulse * (item.p.scale || 1);

      ctx.save();
      // Holographic reticle target ring around mutated locus
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, baseR, 0, Math.PI * 2);
      ctx.strokeStyle = hit.hit ? COLORS.white : rgba(axisColor, 0.90);
      ctx.lineWidth = hit.hit ? 2.0 : 1.4;
      ctx.shadowColor = axisColor;
      ctx.shadowBlur = hit.hit ? 12 : 6;
      ctx.stroke();

      // Precision crosshair ticks (N, S, E, W)
      const tickLen = 4;
      ctx.beginPath();
      ctx.moveTo(item.p.px, item.p.py - baseR - tickLen); ctx.lineTo(item.p.px, item.p.py - baseR + 2);
      ctx.moveTo(item.p.px, item.p.py + baseR - 2); ctx.lineTo(item.p.px, item.p.py + baseR + tickLen);
      ctx.moveTo(item.p.px - baseR - tickLen, item.p.py); ctx.lineTo(item.p.px - baseR + 2, item.p.py);
      ctx.moveTo(item.p.px + baseR - 2, item.p.py); ctx.lineTo(item.p.px + baseR + tickLen, item.p.py);
      ctx.stroke();

      // Central glowing bio-locus core
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, 3.2 * (item.p.scale || 1), 0, Math.PI * 2);
      ctx.fillStyle = hit.hit ? COLORS.white : rgba(axisColor, 0.95);
      ctx.fill();

      // Clinical Locus Badge Label
      if (z > 0.28) {
        const shortName = (item.name || "LOCUS").split(":")[0].slice(0, 16).toUpperCase();
        ctx.font = "bold 9.5px monospace";
        ctx.textAlign = "center";
        const tagText = `[${shortName}]`;
        const textW = ctx.measureText(tagText).width;
        const tagY = item.p.py + baseR + 13;

        // Dark medical backdrop pill for guaranteed contrast
        ctx.fillStyle = "rgba(2, 14, 18, 0.88)";
        ctx.strokeStyle = rgba(axisColor, 0.70);
        ctx.lineWidth = 0.8;
        ctx.fillRect(item.p.px - textW / 2 - 4, tagY - 9, textW + 8, 12);
        ctx.strokeRect(item.p.px - textW / 2 - 4, tagY - 9, textW + 8, 12);

        ctx.fillStyle = hit.hit ? COLORS.white : rgba(axisColor, 0.95);
        ctx.fillText(tagText, item.p.px, tagY);
      }

      ctx.restore();
      return;
    }
  }

  _drawScientificHUD(startX, endX, centerY, radius) {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;

    ctx.save();

    // 1. Escala Métrica Molecular em Angstroms (Top Scientific Ruler)
    const rulerY = 20;
    const rulerStartX = startX;
    const rulerEndX = Math.min(endX, width - 40);
    const rulerWidth = rulerEndX - rulerStartX;
    if (rulerWidth > 180) {
      ctx.beginPath();
      ctx.moveTo(rulerStartX, rulerY);
      ctx.lineTo(rulerEndX, rulerY);
      ctx.strokeStyle = "rgba(63, 244, 213, 0.30)";
      ctx.lineWidth = 1.0;
      ctx.stroke();

      const majorStep = rulerWidth / 6;
      for (let i = 0; i <= 6; i += 1) {
        const rx = rulerStartX + i * majorStep;
        ctx.beginPath();
        ctx.moveTo(rx, rulerY - 5);
        ctx.lineTo(rx, rulerY + 5);
        ctx.strokeStyle = "rgba(63, 244, 213, 0.65)";
        ctx.lineWidth = 1.0;
        ctx.stroke();

        ctx.font = "9.5px monospace";
        ctx.fillStyle = "rgba(63, 244, 213, 0.75)";
        ctx.textAlign = "center";
        ctx.fillText(`${i * 10}Å`, rx, rulerY - 8);

        if (i < 6) {
          for (let m = 1; m < 5; m += 1) {
            const mx = rx + (m / 5) * majorStep;
            ctx.beginPath();
            ctx.moveTo(mx, rulerY - 2);
            ctx.lineTo(mx, rulerY + 2);
            ctx.strokeStyle = "rgba(63, 244, 213, 0.22)";
            ctx.stroke();
          }
        }
      }

      ctx.font = "bold 9.5px monospace";
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255, 209, 92, 0.85)";
      ctx.fillText("PASSO HELICOIDAL λ = 34.0 Å (10.5 pb/volta) · B-DNA HÍBRIDO K-03", rulerEndX, rulerY + 16);
    }

    // 2. Polaridade Química Antiparalela (5' → 3' e 3' → 5')
    ctx.font = "bold 11px monospace";
    // Fita 1: 5' à esquerda, 3' à direita
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(63, 244, 213, 0.85)";
    ctx.fillText("5' α-STRAND [PO₄³⁻]", startX, centerY - radius - 12);
    ctx.textAlign = "right";
    ctx.fillText("3' [OH]", endX + 6, centerY - radius - 12);

    // Fita 2: 3' à esquerda, 5' à direita (antiparalela)
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 209, 92, 0.85)";
    ctx.fillText("3' β-STRAND [OH]", startX, centerY + radius + 18);
    ctx.textAlign = "right";
    ctx.fillText("5' [PO₄³⁻]", endX + 6, centerY + radius + 18);

    // 3. Retículos Ópticos de Calibração nos 4 Cantos
    const reticleSize = 10;
    const margin = 8;
    ctx.strokeStyle = "rgba(63, 244, 213, 0.35)";
    ctx.lineWidth = 1.0;

    ctx.beginPath();
    ctx.moveTo(margin, margin + reticleSize); ctx.lineTo(margin, margin); ctx.lineTo(margin + reticleSize, margin);
    ctx.moveTo(width - margin - reticleSize, margin); ctx.lineTo(width - margin, margin); ctx.lineTo(width - margin, margin + reticleSize);
    ctx.moveTo(margin, height - margin - reticleSize); ctx.lineTo(margin, height - margin); ctx.lineTo(margin + reticleSize, height - margin);
    ctx.moveTo(width - margin - reticleSize, height - margin); ctx.lineTo(width - margin, height - margin); ctx.lineTo(width - margin, height - margin - reticleSize);
    ctx.stroke();

    ctx.restore();
  }

  _sparkAt(x, y, intensity = 1) {
    if (this.sparks.length > 180) this.sparks.splice(0, this.sparks.length - 150);
    const count = intensity > 0.65 ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      this.sparks.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 2.4,
        vy: (Math.random() - 0.5) * 2.5 - 0.75,
        life: 0.55 + Math.random() * 0.45,
        hue: Math.random() > 0.28 ? "gold" : "white"
      });
    }
  }

  _drawSparks(dt) {
    const ctx = this.ctx;
    for (let i = this.sparks.length - 1; i >= 0; i -= 1) {
      const spark = this.sparks[i];
      spark.x += spark.vx * (dt / 16.667);
      spark.y += spark.vy * (dt / 16.667);
      spark.vy += 0.018 * (dt / 16.667);
      spark.life -= 0.027 * (dt / 16.667);
      if (spark.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }
      ctx.fillStyle = spark.hue === "white" ? rgba(COLORS.white, spark.life) : rgba(COLORS.gold, spark.life);
      ctx.shadowColor = spark.hue === "white" ? COLORS.white : COLORS.gold;
      ctx.shadowBlur = 7 * spark.life;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, 1.2 * spark.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  _drawScanner(laserX) {
    const ctx = this.ctx;
    const top = this.height * 0.14;
    const bottom = this.height * 0.90;

    // Laser scanner com feixe holográfico e núcleo luminoso
    ctx.strokeStyle = "rgba(255, 209, 92, 0.16)";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(laserX, top);
    ctx.lineTo(laserX, bottom);
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, "rgba(255, 209, 92, 0)");
    gradient.addColorStop(0.15, "rgba(255, 209, 92, 0.85)");
    gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.98)");
    gradient.addColorStop(0.85, "rgba(255, 209, 92, 0.85)");
    gradient.addColorStop(1, "rgba(255, 209, 92, 0)");

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2.4;
    ctx.shadowColor = COLORS.gold;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(laserX, top);
    ctx.lineTo(laserX, bottom);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(laserX, top + 8);
    ctx.lineTo(laserX, bottom - 8);
    ctx.stroke();

    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(laserX - 6, top); ctx.lineTo(laserX + 6, top);
    ctx.moveTo(laserX - 6, bottom); ctx.lineTo(laserX + 6, bottom);
    ctx.stroke();
  }

  _drawHoverTarget(now) {
    if (!this.hoverPoint) return;
    const ctx = this.ctx;
    const { x: hx, y: hy } = this.hoverPoint;

    let closest = null;
    let minDist = 34;
    for (let i = 0; i < this._poolIndex; i += 1) {
      const item = this._renderables[i];
      if ((item.type !== "mutation_ring" && item.type !== "mutation_cyst") || !item.p) continue;
      const d = Math.hypot(item.p.px - hx, item.p.py - hy);
      if (d < minDist) {
        minDist = d;
        closest = item;
      }
    }

    if (!closest) return;

    const px = closest.p.px;
    const py = closest.p.py;
    const axis = closest.axis || "neutral";
    const color = axis === "vontade" ? COLORS.will : axis === "comunhao" ? COLORS.communion : COLORS.humanity;

    ctx.save();
    // Brackets around locus
    const s = 15 * (1 + Math.sin(now * 0.005) * 0.08);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(px - s, py - s + 5); ctx.lineTo(px - s, py - s); ctx.lineTo(px - s + 5, py - s);
    ctx.moveTo(px + s, py - s + 5); ctx.lineTo(px + s, py - s); ctx.lineTo(px + s - 5, py - s);
    ctx.moveTo(px - s, py + s - 5); ctx.lineTo(px - s, py + s); ctx.lineTo(px - s + 5, py + s);
    ctx.moveTo(px + s, py + s - 5); ctx.lineTo(px + s, py + s); ctx.lineTo(px + s - 5, py + s);
    ctx.stroke();

    // Connecting line to info box
    const boxX = Math.min(this.width - 150, px + 22);
    const boxY = Math.max(24, py - 36);
    ctx.beginPath();
    ctx.moveTo(px + s, py - s);
    ctx.lineTo(boxX, boxY + 18);
    ctx.lineTo(boxX + 130, boxY + 18);
    ctx.stroke();

    // Medical holographic tooltip box
    ctx.fillStyle = "rgba(4, 18, 22, 0.95)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.fillRect(boxX, boxY - 18, 130, 38);
    ctx.strokeRect(boxX, boxY - 18, 130, 38);

    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 10.5px monospace";
    ctx.fillText((closest.name || "LOCUS MUTADO").toUpperCase().slice(0, 16), boxX + 8, boxY - 2);
    ctx.fillStyle = color;
    ctx.font = "9.5px monospace";
    ctx.fillText(`EIXO: ${axis.toUpperCase()}`, boxX + 8, boxY + 12);
    ctx.restore();
  }
}

export function startGenomeRenderer(root, carrier) {
  const canvas = root?.querySelector?.("canvas[data-kj-genome-canvas]");
  if (!canvas || !carrier) return null;
  const renderer = new KaijuGenomeRenderer(canvas, carrier);
  renderer.start();
  return renderer;
}

export function getGenomeRendererDebug(carrier) {
  const metrics = getGenomeMetrics(carrier);
  return {
    seed: metrics.genome.seed,
    signature: valueSignature(metrics),
    mutationLoad: metrics.mutationLoad,
    divergence: metrics.divergence,
    complexity: metrics.complexity,
    branchCount: metrics.branchCount,
    latticeCount: metrics.latticeCount,
    fractureCount: metrics.fractureCount,
    anomalousPairs: metrics.anomalousPairs,
    extraStrand: metrics.extraStrand
  };
}
