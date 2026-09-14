import { getGenomeMetrics, hashString } from "./genome.js";

const COLORS = Object.freeze({
  void: "#011316",
  cyan: "#00f0d0",
  cyanBright: "#7ef8e2",
  cyanDim: "#147478",
  cyanDark: "#0b4147",
  gold: "#ffd15c",
  goldSoft: "#ffbd4a",
  white: "#ffffff",
  will: "#ff4d4d",
  willDeep: "#c0392b",
  willCore: "#ffa899",
  communion: "#00f0d0",
  communionBright: "#82d4ff",
  humanity: "#5cb8ff",
  humanityDim: "#1f5f8b",
  alien: "#b066ff",
  alienBright: "#d5aaff",
  redAlert: "#ff385c"
});

const BASE_PAIRS = Object.freeze([
  { b1: "A", b2: "T", c1: COLORS.cyan, c2: COLORS.gold },
  { b1: "T", b2: "A", c1: COLORS.gold, c2: COLORS.cyan },
  { b1: "G", b2: "C", c1: COLORS.humanity, c2: COLORS.will },
  { b1: "C", b2: "G", c1: COLORS.will, c2: COLORS.humanity }
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

export function lerpColor(hexA, hexB, factor) {
  const t = Math.max(0, Math.min(1, Number(factor) || 0));
  const parseHex = (hex) => {
    const clean = String(hex).replace("#", "");
    const parsed = Number.parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
    return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
  };
  const [rA, gA, bA] = parseHex(hexA);
  const [rB, gB, bB] = parseHex(hexB);
  const r = Math.round(rA + (rB - rA) * t);
  const g = Math.round(gA + (gB - gA) * t);
  const b = Math.round(bA + (bB - bA) * t);
  return `rgb(${r}, ${g}, ${b})`;
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
 * KaijuGenomeRenderer — Renderizador Biomolecular 3D de Alta Precisão Clínica
 * Visual moderno, limpo e cinematográfico de HUD Médico Futurista.
 * Estrutura de B-DNA com ordenação em profundidade (z-sorting), iluminação holográfica,
 * scanner óptico, marcação clínica de loci mutados e zero acúmulo de lixo visual.
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
    this.baseTiltX = -0.04;
    this.baseTiltY = 0.02;
    this.tiltX = 0;
    this.tiltY = 0;
    this.targetTiltX = 0;
    this.targetTiltY = 0;
    this.sparks = [];
    this.lastTime = performance.now();
    this.running = false;
    this.lastClick = 0;
    this.paused = false;
    this.signalPulsePhase = 0;
    this.hoverPoint = null;
    this._renderables = [];
    this._renderablePool = [];
    this._poolIndex = 0;
    this._lastSignature = valueSignature(this.metrics);

    this._buildStaticGenome();
    this._boundMouseMove = (event) => this._onMouseMove(event);
    this._boundMouseLeave = () => { this.targetTiltX = 0; this.targetTiltY = 0; this.hoverPoint = null; };
    this._boundClick = (event) => this._onClick(event);
  }

  update(carrier) {
    if (!carrier) return;
    this.carrier = carrier;
    this.metrics = getGenomeMetrics(carrier);
    this.seed = this.metrics.genome.seed >>> 0;
    this.rng = mulberry32(this.seed ^ 0x4B303344);
    this._lastSignature = valueSignature(this.metrics);
    this._buildStaticGenome();
  }

  setCarrier(carrier) {
    this.update(carrier);
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

    const hotspotCount = 6 + Math.round(metrics.mutationLoad / 30);
    this.hotspots = chooseSlots(rng, hotspotCount, 0.08, 0.88, 0.07).map((t, index) => ({
      t,
      width: 0.035 + rng() * 0.04,
      phase: rng() * Math.PI * 2,
      weight: 0.5 + rng() * 0.5,
      axis: index % 3 === 0 ? "vontade" : index % 3 === 1 ? "comunhao" : "humanidade"
    }));

    this.branchSlots = chooseSlots(rng, Math.min(10, metrics.branchCount), 0.12, 0.82, 0.07).map((t, index) => ({
      t,
      strand: rng() > 0.5 ? 1 : 2,
      sign: rng() > 0.5 ? 1 : -1,
      length: 0.5 + rng() * 0.5,
      curl: (rng() - 0.5) * 1.0,
      phase: rng() * Math.PI * 2,
      persistent: index < Math.min(metrics.genome.mutations.length, metrics.branchCount)
    }));

    this.latticeSlots = chooseSlots(rng, Math.min(10, metrics.latticeCount), 0.10, 0.85, 0.065).map((t) => ({
      t,
      sign: rng() > 0.5 ? 1 : -1,
      spread: 0.4 + rng() * 0.6,
      phase: rng() * Math.PI * 2
    }));

    this.fractureSlots = chooseSlots(rng, Math.min(6, metrics.fractureCount), 0.15, 0.82, 0.10).map((t) => ({
      t,
      width: 0.012 + rng() * 0.015,
      phase: rng() * Math.PI * 2
    }));

    this.humanityLockSlots = chooseSlots(rng, Math.min(8, metrics.humanityLocks || 0), 0.10, 0.86, 0.08).map((t, index) => ({
      t,
      phase: rng() * Math.PI * 2,
      weight: 0.7 + rng() * 0.4,
      index
    }));

    const rungCount = 34;
    this.anomalousRungs = new Set();
    while (this.anomalousRungs.size < Math.min(rungCount - 4, metrics.anomalousPairs)) {
      this.anomalousRungs.add(2 + Math.floor(rng() * (rungCount - 4)));
    }

    // Mutações 100% dinâmicas baseadas na telemetria atual das 3 categorias (Fera, Comunhão, Humano)
    this.dynamicLoci = [];
    const mrng = mulberry32(this.seed ^ 0xC0DE99);
    const willLociCount = metrics.willMorph > 0.15 ? Math.min(5, Math.round(metrics.willMorph * 5)) : 0;
    const commLociCount = metrics.communionMorph > 0.15 ? Math.min(5, Math.round(metrics.communionMorph * 5)) : 0;
    const lossLociCount = metrics.identityLossMorph > 0.15 ? Math.min(4, Math.round(metrics.identityLossMorph * 4)) : 0;
    const totalLoci = willLociCount + commLociCount + lossLociCount;

    if (totalLoci > 0) {
      const slots = chooseSlots(mrng, totalLoci, 0.10, 0.88, 0.055);
      let sIdx = 0;
      for (let i = 0; i < willLociCount && sIdx < slots.length; i += 1) {
        this.dynamicLoci.push({
          t: slots[sIdx++],
          axis: "vontade",
          name: ["Espícula Predatória", "Nó Invasivo", "Assimetria Kaiju", "Marca Predatória"][i % 4],
          threshold: Math.round(metrics.current.vontade),
          ring: 6 + mrng() * 3,
          phase: mrng() * Math.PI * 2
        });
      }
      for (let i = 0; i < commLociCount && sIdx < slots.length; i += 1) {
        this.dynamicLoci.push({
          t: slots[sIdx++],
          axis: "comunhao",
          name: ["Ponte Ressonante", "Malha Simbiótica", "Harmônico Quântico", "Convergência"][i % 4],
          threshold: Math.round(metrics.current.comunhao),
          ring: 6 + mrng() * 3,
          phase: mrng() * Math.PI * 2
        });
      }
      for (let i = 0; i < lossLociCount && sIdx < slots.length; i += 1) {
        this.dynamicLoci.push({
          t: slots[sIdx++],
          axis: "humanidade",
          name: ["Desvio Identitário", "Ruptura de Locus", "Base Anômala", "Perda de Simetria"][i % 4],
          threshold: Math.round(100 - metrics.current.humanidade),
          ring: 6 + mrng() * 3,
          phase: mrng() * Math.PI * 2
        });
      }
    }
    this.persistentMarks = this.dynamicLoci;

    // Partículas ambientais de plexus/constelação (Estilo Behance 001/005)
    this.plexusParticles = [];
    const prng = mulberry32(this.seed ^ 0x992211);
    for (let i = 0; i < 28; i += 1) {
      this.plexusParticles.push({
        t: prng(),
        strand: prng() > 0.5 ? 1 : 2,
        radialOffset: (prng() - 0.5) * 54,
        yDrift: (prng() - 0.5) * 36,
        phase: prng() * Math.PI * 2,
        speed: 0.3 + prng() * 0.7,
        size: 0.9 + prng() * 1.3,
        hue: prng() > 0.7 ? COLORS.goldSoft : (prng() > 0.4 ? COLORS.cyanBright : COLORS.humanity)
      });
    }
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
    this.targetTiltY = mx * 0.16;
    this.targetTiltX = -my * 0.12;
    this.hoverPoint = { x, y };
  }

  _onClick(event) {
    this.lastClick = performance.now();
    this.rotSpeed = this.rotSpeed === 0.012 ? 0.024 : (this.rotSpeed === 0.024 ? 0.005 : 0.012);
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    for (let i = 0; i < 16; i += 1) {
      const rng = this.rng;
      this.sparks.push({
        x: x + (rng() - 0.5) * 12,
        y: y + (rng() - 0.5) * 12,
        vx: (rng() - 0.5) * 3.2,
        vy: (rng() - 0.5) * 3.2 - 0.8,
        life: 0.55 + rng() * 0.45,
        hue: rng() > 0.4 ? COLORS.cyan : COLORS.gold
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
    return strength * Math.max(0, (this.metrics.identityLossMorph || 0) * 0.75 + (this.metrics.willMorph || 0) * 0.35);
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
    return { will: Math.min(2.0, will), communion: Math.min(2.0, communion), humanity: Math.min(2.0, humanity) };
  }

  _helixWorld(t, strand, centerY, radius, startX, endX) {
    const m = this.metrics;
    const fields = this._hotspotFields(t);
    const xBase = startX + t * (endX - startX);

    // Sulco Maior (~224°) e Sulco Menor (~136°) da geometria canônica do B-DNA
    const strandPhase = strand === 2 ? (Math.PI - 0.42) : 0;
    const baseTheta = t * Math.PI * 4 + this.angle + strandPhase;

    const willMorph = m.willMorph || 0;
    const communionMorph = m.communionMorph || 0;
    const lossMorph = m.identityLossMorph || 0;
    const sign = strand === 1 ? 1 : -1;

    const seedPhase = (this.seed % 997) * 0.0061;

    // Sutil flexão e torção sob tensão predatória sem destruir a hélice
    const phaseShear = sign * (
      Math.sin(t * Math.PI * 4 + seedPhase) * lossMorph * 0.22 +
      Math.sin(t * Math.PI * 2.5 + seedPhase) * willMorph * 0.18
    );
    const theta = baseTheta + phaseShear;

    // Hipertrofia suave da fita 1 (FERA) em estágios avançados
    let strandRadial = 1.0;
    if (strand === 1) {
      strandRadial += willMorph * 0.22 + fields.will * willMorph * 0.12;
    } else {
      strandRadial += lossMorph * 0.12 * Math.sin(t * Math.PI * 5 + seedPhase);
    }

    const y = centerY + radius * strandRadial * Math.sin(theta);
    const z = radius * strandRadial * Math.cos(theta);
    const x = xBase;

    return { x, y, z, theta, baseTheta, fields, radial: strandRadial };
  }

  _drawBackground(project, centerY, timeSec) {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;

    ctx.save();
    // Grade médica de bio-diagnóstico de altíssima precisão
    ctx.strokeStyle = "rgba(0, 240, 208, 0.03)";
    ctx.lineWidth = 1.0;
    const step = 48;
    ctx.beginPath();
    for (let x = 0; x < width; x += step) {
      ctx.moveTo(x, 0); ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += step) {
      ctx.moveTo(0, y); ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Crosshairs médicos sutis nas intersecções
    ctx.strokeStyle = "rgba(0, 240, 208, 0.12)";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (let x = step * 2; x < width - step; x += step * 4) {
      for (let y = step; y < height; y += step * 3) {
        ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y);
        ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3);
      }
    }
    ctx.stroke();

    // Vinheta bio-luminescente focada na molécula
    const glow = ctx.createRadialGradient(width * 0.48, centerY, 30, width * 0.48, centerY, width * 0.48);
    glow.addColorStop(0, "rgba(0, 240, 208, 0.04)");
    glow.addColorStop(0.6, "rgba(2, 22, 26, 0.015)");
    glow.addColorStop(1, "rgba(1, 14, 17, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  _pushBranchRenderables(project, centerY, radius, startX, endX) {
    const strength = clamp01(this.metrics.willMorph || 0);
    if (!this.branchSlots.length) return;
    this.branchSlots.forEach((branch) => {
      const source = this._helixWorld(branch.t, branch.strand, centerY, radius, startX, endX);
      const p = project(source.x, source.y, source.z);
      this._pushRenderable({
        type: "branch_node",
        p,
        z: p.z + 1,
        strength,
        strand: branch.strand,
        t: branch.t,
        persistent: branch.persistent
      });
    });
  }

  _pushLatticeRenderables(project, centerY, radius, startX, endX) {
    const strength = clamp01(this.metrics.communionMorph || 0);
    if (!this.latticeSlots.length) return;
    this.latticeSlots.forEach((slot, index) => {
      const a = this._helixWorld(slot.t, 1, centerY, radius, startX, endX);
      const b = this._helixWorld(slot.t, 2, centerY, radius, startX, endX);
      const pA = project(a.x, a.y, a.z);
      const pB = project(b.x, b.y, b.z);
      this._pushRenderable({
        type: "lattice_link",
        p1: pA,
        p2: pB,
        z: (pA.z + pB.z) * 0.5,
        strength,
        phase: slot.phase,
        index
      });
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
      const center = project((w1.x + w2.x) * 0.5, (w1.y + w2.y) * 0.5, (w1.z + w2.z) * 0.5);
      this._pushRenderable({
        type: "humanity_lock",
        p1,
        p2,
        p: center,
        z: center.z + 2,
        strength: humanityMorph,
        loss: lossMorph,
        phase: slot.phase,
        weight: slot.weight,
        t: slot.t
      });
    });
  }

  _pushPersistentMarks(project, centerY, radius, startX, endX) {
    const loci = this.dynamicLoci || this.persistentMarks || [];
    loci.forEach((mark, index) => {
      const strand = mark.axis === "vontade" ? 1 : (mark.axis === "comunhao" ? 2 : 1);
      const world = this._helixWorld(mark.t, strand, centerY, radius, startX, endX);
      const p = project(world.x, world.y, world.z);
      this._pushRenderable({
        type: "mutation_cyst",
        p,
        z: p.z + 8,
        axis: mark.axis,
        ring: Math.max(6, mark.ring),
        phase: mark.phase,
        t: mark.t,
        name: mark.name || `LOCUS-${String(index + 1).padStart(2, "0")}`,
        threshold: mark.threshold,
        index
      });
    });
  }

  _pushTerminalTail(project, centerY, radius, startX, endX) {
    const will = this.metrics.willMorph || 0;
    const loss = this.metrics.identityLossMorph || 0;
    const energy = clamp01(Math.max(will, loss));
    const w1 = this._helixWorld(0.98, 1, centerY, radius, startX, endX);
    const w2 = this._helixWorld(0.98, 2, centerY, radius, startX, endX);
    const p1 = project(w1.x, w1.y, w1.z);
    const p2 = project(w2.x, w2.y, w2.z);
    this._pushRenderable({
      type: "tail_cap",
      p1,
      p2,
      z: (p1.z + p2.z) * 0.5,
      energy
    });
  }

  _render(now) {
    if (!this.running || !this.canvas?.isConnected || !this.ctx) {
      this.stop();
      return;
    }

    const dt = Math.min(50, now - this.lastTime);
    this.lastTime = now;
    const timeSec = now / 1000;
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    ctx.clearRect(0, 0, width, height);

    // Reatividade dinâmica em tempo real: detecta alterações de valores in-place no portador
    const currentValues = this.carrier?.values;
    const currentSig = currentValues ? `${currentValues.vontade}/${currentValues.comunhao}/${currentValues.humanidade}` : "";
    if (currentSig && currentSig !== this._lastSignature) {
      this.metrics = getGenomeMetrics(this.carrier);
      this._lastSignature = currentSig;
      this._buildStaticGenome();
    }

    this.tiltX += (this.targetTiltX - this.tiltX) * 0.08;
    this.tiltY += (this.targetTiltY - this.tiltY) * 0.08;
    if (!this.paused) {
      this.angle += this.rotSpeed * (dt / 16.667);
      this.laserPhase += 0.016 * (dt / 16.667);
      this.signalPulsePhase += 0.035 * (dt / 16.667);
    }

    const centerY = height * 0.50;
    const baseRadius = Math.min(84, height * 0.23);
    const willMorph = this.metrics.willMorph || 0;
    const humanityMorph = this.metrics.humanityMorph || 0;
    const communionMorph = this.metrics.communionMorph || 0;
    this._s1Color = lerpColor(COLORS.cyan, COLORS.will, willMorph);
    this._s2Color = lerpColor(COLORS.humanity, COLORS.cyanBright, humanityMorph);
    const radius = baseRadius * (1 + willMorph * 0.04 - humanityMorph * 0.02);

    const startX = width * 0.06;
    const endX = width * 0.90;
    const project = this._projector(centerY, radius);

    this._drawBackground(project, centerY, timeSec);

    const laserX = startX + (0.5 + 0.5 * Math.sin(this.laserPhase)) * (endX - startX);
    this._poolIndex = 0;

    const sampleCount = 96;
    if (!this._s1) this._s1 = [];
    if (!this._s2) this._s2 = [];

    for (let i = 0; i < sampleCount; i += 1) {
      const t = i / (sampleCount - 1);
      const w1 = this._helixWorld(t, 1, centerY, radius, startX, endX);
      const w2 = this._helixWorld(t, 2, centerY, radius, startX, endX);
      const p1 = project(w1.x, w1.y, w1.z);
      const p2 = project(w2.x, w2.y, w2.z);
      this._s1[i] = { ...p1, t, world: w1 };
      this._s2[i] = { ...p2, t, world: w2 };
    }

    // Segmentos dos dois esqueletos de fosfodiéster
    for (let i = 0; i < sampleCount - 1; i += 1) {
      const a1 = this._s1[i]; const b1 = this._s1[i + 1];
      const a2 = this._s2[i]; const b2 = this._s2[i + 1];
      this._pushRenderable({ type: "backbone", p1: a1, p2: b1, z: (a1.z + b1.z) * 0.5, strand: 1, t: a1.t, sampleIndex: i });
      this._pushRenderable({ type: "backbone", p1: a2, p2: b2, z: (a2.z + b2.z) * 0.5, strand: 2, t: a2.t, sampleIndex: i });
    }

    // Pares de bases Watson-Crick regulares (34 pares) e nós moleculares do esqueleto
    const rungCount = 34;
    for (let i = 0; i < rungCount; i += 1) {
      const t = i / (rungCount - 1);
      const sampleIdx = Math.round(t * (sampleCount - 1));
      const p1 = this._s1[sampleIdx];
      const p2 = this._s2[sampleIdx];
      if (!p1 || !p2) continue;

      // Nós moleculares holográficos em cada fita (estilo pérola Behance 001)
      this._pushRenderable({ type: "backbone_node", p: p1, z: p1.z + 1.5, strand: 1, t, index: i });
      this._pushRenderable({ type: "backbone_node", p: p2, z: p2.z + 1.5, strand: 2, t, index: i });

      const anomalous = this.anomalousRungs.has(i);
      const bpIndex = Math.abs(Math.floor(Math.sin(i * 12.9898 + (this.seed % 100)) * 43758.5453)) % 4;
      const bp = BASE_PAIRS[bpIndex];

      if (anomalous && willMorph > 0.35) {
        this._pushRenderable({ type: "torn_rung", p1, p2, z: (p1.z + p2.z) * 0.5 - 2, anomalous: true, t, i, bp });
      } else if (communionMorph > 0.40 && i % 3 === 0) {
        this._pushRenderable({ type: "symbiotic_rung", p1, p2, z: (p1.z + p2.z) * 0.5 - 2, anomalous, t, i, bp });
      } else {
        this._pushRenderable({ type: "rung", p1, p2, z: (p1.z + p2.z) * 0.5 - 2, anomalous, t, i, bp });
      }
    }

    // Terceira fita (γ / ALIEN) elegante quando em alta comunhão simbiótica
    if (this.metrics.extraStrand > 0.08) {
      const thirdAlpha = clamp01(this.metrics.extraStrand);
      let last = null;
      for (let i = 0; i < sampleCount; i += 2) {
        const t = i / (sampleCount - 1);
        const base = this._helixWorld(t, 1, centerY, radius, startX, endX);
        const theta = base.theta + Math.PI + 0.35;
        const r = radius * (0.88 + thirdAlpha * 0.12);
        const world = { x: base.x, y: centerY + r * Math.sin(theta), z: r * Math.cos(theta) };
        const p = project(world.x, world.y, world.z);
        if (last) this._pushRenderable({ type: "third", p1: last, p2: p, z: (last.z + p.z) * 0.5, strength: thirdAlpha, t });
        if (i % 8 === 0 && this._s1[i]) {
          this._pushRenderable({ type: "third_bridge", p1: p, p2: this._s1[i], z: (p.z + this._s1[i].z) * 0.5, strength: thirdAlpha, t });
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

    this._drawPlexus(timeSec, startX, endX, centerY, radius);
    this._drawScientificHUD(startX, endX, centerY, radius);
    this._drawSparks(dt);
    this._drawScanner(laserX);
    this._drawHoverTarget(now);

    this.frameId = requestAnimationFrame((next) => this._render(next));
  }

  _hitFor(item, laserX, range = 32) {
    let x = null;
    if (item.p) x = item.p.px;
    else if (item.p1 && item.p2) x = (item.p1.px + item.p2.px) * 0.5;
    if (x == null) return { hit: false, intensity: 0 };
    const dist = Math.abs(x - laserX);
    return { hit: dist < range, intensity: dist < range ? 1 - dist / range : 0 };
  }

  _drawRenderable(item, laserX, now) {
    const ctx = this.ctx;
    const hit = this._hitFor(item, laserX, item.type === "mutation_cyst" ? 40 : 28);
    const z = item.p?.normZ ?? item.p1?.normZ ?? 0.5;
    const willMorph = this.metrics.willMorph || 0;
    const humanityMorph = this.metrics.humanityMorph || 0;
    const s1Color = this._s1Color || lerpColor(COLORS.cyan, COLORS.will, willMorph);
    const s2Color = this._s2Color || lerpColor(COLORS.humanity, COLORS.cyanBright, humanityMorph);

    // Fitas do esqueleto molecular (Backbone)
    if (item.type === "backbone") {
      const isStrand1 = item.strand === 1;
      const baseColor = isStrand1 ? s1Color : s2Color;
      const isFront = z > 0.48;
      const strokeWidth = isFront ? (isStrand1 && willMorph > 0.3 ? 3.4 : 2.8) : 1.5;
      const alpha = isFront ? (0.75 + z * 0.25) : (0.28 + z * 0.30);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);

      if (hit.hit) {
        ctx.strokeStyle = rgba(COLORS.white, 0.90);
        ctx.lineWidth = strokeWidth + 1.2;
        ctx.shadowColor = COLORS.gold;
        ctx.shadowBlur = 8;
      } else {
        ctx.strokeStyle = rgba(baseColor, alpha);
        ctx.lineWidth = strokeWidth;
        if (isFront) {
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = isStrand1 ? (4 + willMorph * 6) : 4;
        }
      }
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Nós esféricos moleculares (Efeito pérola holográfica 3D Behance 001)
    if (item.type === "backbone_node") {
      const isFront = z > 0.46;
      const scale = item.p.scale || 1;
      const baseR = isFront ? (3.2 + z * 1.6) : (1.8 + z * 1.0);
      const r = baseR * scale;
      const isStrand1 = item.strand === 1;
      const nodeColor = isStrand1 ? s1Color : s2Color;

      ctx.save();
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, r, 0, Math.PI * 2);

      if (hit.hit) {
        ctx.fillStyle = COLORS.white;
        ctx.shadowColor = COLORS.gold;
        ctx.shadowBlur = 10;
        ctx.fill();
      } else {
        if (isFront) {
          const sphereGrad = ctx.createRadialGradient(
            item.p.px - r * 0.32, item.p.py - r * 0.32, r * 0.1,
            item.p.px, item.p.py, r
          );
          sphereGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
          sphereGrad.addColorStop(0.35, rgba(nodeColor, 0.92));
          sphereGrad.addColorStop(1, rgba(nodeColor, 0.45));
          ctx.fillStyle = sphereGrad;
          ctx.shadowColor = nodeColor;
          ctx.shadowBlur = isStrand1 && willMorph > 0.3 ? 7 : 4;
        } else {
          ctx.fillStyle = rgba(nodeColor, 0.40);
        }
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    // Degraus Watson-Crick (Pares de Bases)
    if (item.type === "rung") {
      const isFront = z > 0.48;
      const alpha = isFront ? (0.65 + z * 0.35) : (0.20 + z * 0.25);
      const lineWidth = isFront ? 2.4 : 1.2;

      ctx.save();
      const grad = ctx.createLinearGradient(item.p1.px, item.p1.py, item.p2.px, item.p2.py);
      grad.addColorStop(0, rgba(s1Color, alpha));
      grad.addColorStop(0.5, rgba(COLORS.white, alpha * 0.9));
      grad.addColorStop(1, rgba(s2Color, alpha));

      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      ctx.strokeStyle = hit.hit ? rgba(COLORS.gold, 0.95) : grad;
      ctx.lineWidth = hit.hit ? lineWidth + 1.0 : lineWidth;
      if (hit.hit || isFront) {
        ctx.shadowColor = hit.hit ? COLORS.gold : (willMorph > 0.3 ? COLORS.will : COLORS.cyan);
        ctx.shadowBlur = hit.hit ? 8 : 4;
      }
      ctx.stroke();

      // Ponto focal central de ligação de hidrogênio
      const midX = (item.p1.px + item.p2.px) * 0.5;
      const midY = (item.p1.py + item.p2.py) * 0.5;
      ctx.beginPath();
      ctx.arc(midX, midY, isFront ? 2.0 : 1.2, 0, Math.PI * 2);
      ctx.fillStyle = hit.hit ? COLORS.white : rgba(COLORS.white, alpha);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Degrau em ruptura sob estresse de mutação
    if (item.type === "torn_rung") {
      ctx.save();
      const midX = (item.p1.px + item.p2.px) * 0.5;
      const midY = (item.p1.py + item.p2.py) * 0.5;
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(midX - 4, midY - 2);
      ctx.strokeStyle = rgba(s1Color, 0.9);
      ctx.lineWidth = 2.0;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(midX + 4, midY + 2);
      ctx.lineTo(item.p2.px, item.p2.py);
      ctx.strokeStyle = rgba(s2Color, 0.9);
      ctx.lineWidth = 2.0;
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Degrau em ressonância simbiótica
    if (item.type === "symbiotic_rung") {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      ctx.strokeStyle = hit.hit ? rgba(COLORS.gold, 0.95) : rgba(COLORS.cyanBright, 0.85);
      ctx.lineWidth = 2.2;
      ctx.shadowColor = COLORS.cyan;
      ctx.shadowBlur = 6;
      ctx.stroke();

      const midX = (item.p1.px + item.p2.px) * 0.5;
      const midY = (item.p1.py + item.p2.py) * 0.5;
      ctx.beginPath();
      ctx.arc(midX, midY, 3.0, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.white;
      ctx.fill();
      ctx.restore();
      return;
    }

    // 3ª Fita Alienígena (Hélice Tripla)
    if (item.type === "third") {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      ctx.strokeStyle = hit.hit ? rgba(COLORS.gold, 0.9) : rgba(COLORS.alien, 0.35 + item.strength * 0.55);
      ctx.lineWidth = 1.6 + item.strength * 1.2;
      ctx.shadowColor = COLORS.alien;
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (item.type === "third_bridge") {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      ctx.strokeStyle = rgba(COLORS.alienBright, 0.5);
      ctx.lineWidth = 1.0;
      ctx.setLineDash([2, 3]);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Marcação Óptica Clínica Sutil (sem obstruir a visão da hélice)
    if (item.type === "mutation_cyst") {
      const axisColor = item.axis === "vontade" ? s1Color : (item.axis === "comunhao" ? COLORS.cyanBright : COLORS.humanity);
      const scale = item.p.scale || 1;
      const r = Math.max(5, (item.ring || 6) * scale);
      const pulse = 1 + Math.sin(now * 0.004 + (item.phase || 0)) * 0.15;

      ctx.save();
      // Anel óptico sutil e translúcido (sem crosshair obstrutivo)
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, r * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = hit.hit ? COLORS.gold : rgba(axisColor, 0.45);
      ctx.lineWidth = hit.hit ? 1.5 : 0.8;
      ctx.setLineDash([2, 3]);
      ctx.stroke();

      // Ponto de luz central suave
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, 1.8 * scale, 0, Math.PI * 2);
      ctx.fillStyle = hit.hit ? COLORS.white : rgba(axisColor, 0.85);
      ctx.shadowColor = axisColor;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.restore();
      return;
    }

    // Elementos estruturais secundários limpos (compatibilidade matemática)
    if (item.type === "branch_node") {
      ctx.save();
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, 2.2 * (item.p.scale || 1), 0, Math.PI * 2);
      ctx.fillStyle = rgba(COLORS.will, 0.75);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (item.type === "lattice_link") {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      ctx.strokeStyle = rgba(COLORS.cyan, 0.25 * item.strength);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (item.type === "humanity_lock") {
      ctx.save();
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, 3.5, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(COLORS.humanity, 0.75);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (item.type === "tail_cap") {
      ctx.save();
      ctx.beginPath();
      ctx.arc((item.p1.px + item.p2.px) * 0.5, (item.p1.py + item.p2.py) * 0.5, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = rgba(COLORS.cyan, 0.8);
      ctx.fill();
      ctx.restore();
      return;
    }
  }

  _drawPlexus(timeSec, startX, endX, centerY, radius) {
    if (!this.plexusParticles?.length || !this._s1?.length || !this._s2?.length) return;
    const ctx = this.ctx;
    const sampleCount = this._s1.length;

    ctx.save();
    const particlePoints = [];

    for (let i = 0; i < this.plexusParticles.length; i += 1) {
      const pt = this.plexusParticles[i];
      const t = (pt.t + timeSec * 0.015 * pt.speed) % 1.0;
      const sIdx = Math.min(sampleCount - 1, Math.max(0, Math.floor(t * sampleCount)));
      const refNode = pt.strand === 1 ? this._s1[sIdx] : this._s2[sIdx];
      if (!refNode) continue;

      const ox = Math.cos(timeSec * 0.7 + pt.phase) * pt.radialOffset;
      const oy = Math.sin(timeSec * 0.5 + pt.phase) * 14 + pt.yDrift;
      const px = refNode.px + ox;
      const py = refNode.py + oy;
      particlePoints.push({ px, py, hue: pt.hue, size: pt.size, refNode, ox, oy });

      ctx.beginPath();
      ctx.arc(px, py, pt.size, 0, Math.PI * 2);
      ctx.fillStyle = rgba(pt.hue, 0.45);
      ctx.shadowColor = pt.hue;
      ctx.shadowBlur = 4;
      ctx.fill();

      // Ligação com o esqueleto do DNA
      const dist = Math.hypot(ox, oy);
      if (dist < 44) {
        const lineAlpha = (1 - dist / 44) * 0.12;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(refNode.px, refNode.py);
        ctx.strokeStyle = rgba(pt.hue, lineAlpha);
        ctx.lineWidth = 0.5;
        ctx.shadowBlur = 0;
        ctx.stroke();
      }
    }

    // Rede de constelação bio-quântica entre partículas próximas (Estilo Behance 001/005)
    for (let i = 0; i < particlePoints.length; i += 1) {
      const pA = particlePoints[i];
      for (let j = i + 1; j < particlePoints.length; j += 1) {
        const pB = particlePoints[j];
        const pDist = Math.hypot(pA.px - pB.px, pA.py - pB.py);
        if (pDist < 46) {
          const alpha = (1 - pDist / 46) * 0.10;
          ctx.beginPath();
          ctx.moveTo(pA.px, pA.py);
          ctx.lineTo(pB.px, pB.py);
          ctx.strokeStyle = rgba(COLORS.cyan, alpha);
          ctx.lineWidth = 0.5;
          ctx.shadowBlur = 0;
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  _drawScientificHUD(startX, endX, centerY, radius) {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;

    ctx.save();

    // 1. Retículos Ópticos Médicos de Precisão nos 4 Cantos (Behance HUD)
    const reticleSize = 12;
    const margin = 10;
    ctx.strokeStyle = "rgba(0, 240, 208, 0.35)";
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.moveTo(margin, margin + reticleSize); ctx.lineTo(margin, margin); ctx.lineTo(margin + reticleSize, margin);
    ctx.moveTo(width - margin - reticleSize, margin); ctx.lineTo(width - margin, margin); ctx.lineTo(width - margin, margin + reticleSize);
    ctx.moveTo(margin, height - margin - reticleSize); ctx.lineTo(margin, height - margin); ctx.lineTo(margin + reticleSize, height - margin);
    ctx.moveTo(width - margin - reticleSize, height - margin); ctx.lineTo(width - margin, height - margin); ctx.lineTo(width - margin, height - margin - reticleSize);
    ctx.stroke();

    // 2. Legenda de Polaridade e Identificação Médica
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(0, 240, 208, 0.85)";
    ctx.fillText("K-03 // MONITOR XENOGENÔMICO 3D", margin + 8, margin + 14);

    const stab = this.metrics.stability ?? 50;
    const stabLabel = stab >= 75 ? "HOMEOSTASE ESTÁVEL" : stab >= 45 ? "HOMEOSTASE COMPENSADA" : "HOMEOSTASE CRÍTICA";
    const stabColor = stab >= 75 ? COLORS.humanity : stab >= 45 ? COLORS.gold : COLORS.will;

    ctx.textAlign = "right";
    ctx.fillStyle = stabColor;
    ctx.fillText(`${stabLabel} [${stab}%]`, width - margin - 8, margin + 14);

    const willMorph = this.metrics.willMorph || 0;
    const s1Color = this._s1Color || lerpColor(COLORS.cyan, COLORS.will, willMorph);
    ctx.textAlign = "left";
    ctx.fillStyle = rgba(s1Color, 0.90);
    ctx.fillText("5' α-STRAND [FERA]", startX, height - margin - 8);

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(0, 240, 208, 0.85)";
    ctx.fillText("3' β-STRAND [HUMANO] · B-DNA HÍBRIDO", endX, height - margin - 8);

    ctx.restore();
  }

  _sparkAt(x, y, intensity = 1) {
    if (this.sparks.length > 80) this.sparks.splice(0, this.sparks.length - 60);
    this.sparks.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 2.0,
      vy: (Math.random() - 0.5) * 2.0 - 0.5,
      life: 0.5 + Math.random() * 0.4,
      hue: Math.random() > 0.4 ? COLORS.cyan : COLORS.gold
    });
  }

  _drawSparks(dt) {
    const ctx = this.ctx;
    for (let i = this.sparks.length - 1; i >= 0; i -= 1) {
      const spark = this.sparks[i];
      spark.x += spark.vx * (dt / 16.667);
      spark.y += spark.vy * (dt / 16.667);
      spark.life -= 0.03 * (dt / 16.667);
      if (spark.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }
      ctx.fillStyle = rgba(spark.hue, spark.life);
      ctx.shadowColor = spark.hue;
      ctx.shadowBlur = 5 * spark.life;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, 1.2 * spark.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  _drawScanner(laserX) {
    const ctx = this.ctx;
    const top = this.height * 0.08;
    const bottom = this.height * 0.92;

    // Laser scanner com feixe holográfico suave e elegante
    ctx.save();
    ctx.strokeStyle = "rgba(0, 240, 208, 0.08)";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(laserX, top);
    ctx.lineTo(laserX, bottom);
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, top, 0, bottom);
    grad.addColorStop(0, "rgba(0, 240, 208, 0)");
    grad.addColorStop(0.2, "rgba(0, 240, 208, 0.7)");
    grad.addColorStop(0.5, "rgba(255, 255, 255, 0.95)");
    grad.addColorStop(0.8, "rgba(0, 240, 208, 0.7)");
    grad.addColorStop(1, "rgba(0, 240, 208, 0)");

    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(laserX, top);
    ctx.lineTo(laserX, bottom);
    ctx.stroke();

    // Marcadores pontuais de extremidade
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(laserX - 4, top, 8, 2);
    ctx.fillRect(laserX - 4, bottom - 2, 8, 2);
    ctx.restore();
  }

  _drawHoverTarget(now) {
    if (!this.hoverPoint) return;
    const ctx = this.ctx;
    const { x: hx, y: hy } = this.hoverPoint;

    let closest = null;
    let minDist = 32;
    for (let i = 0; i < this._poolIndex; i += 1) {
      const item = this._renderables[i];
      if (item.type !== "mutation_cyst" || !item.p) continue;
      const d = Math.hypot(item.p.px - hx, item.p.py - hy);
      if (d < minDist) {
        minDist = d;
        closest = item;
      }
    }

    if (!closest) return;

    const px = closest.p.px;
    const py = closest.p.py;
    const axis = closest.axis || "vontade";
    const willMorph = this.metrics.willMorph || 0;
    const color = axis === "vontade" ? (willMorph > 0.1 ? COLORS.will : COLORS.cyan) : axis === "comunhao" ? COLORS.cyanBright : COLORS.humanity;

    ctx.save();
    // Brackets de mira discretos em torno do ponto (sem bloquear visão)
    const s = 10;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    ctx.beginPath();
    ctx.moveTo(px - s, py - s + 3); ctx.lineTo(px - s, py - s); ctx.lineTo(px - s + 3, py - s);
    ctx.moveTo(px + s, py - s + 3); ctx.lineTo(px + s, py - s); ctx.lineTo(px - s + 3, py - s);
    ctx.moveTo(px - s, py + s - 3); ctx.lineTo(px - s, py + s); ctx.lineTo(px - s + 3, py + s);
    ctx.moveTo(px + s, py + s - 3); ctx.lineTo(px + s, py + s); ctx.lineTo(px - s + 3, py + s);
    ctx.stroke();

    // Telemetria clínica acoplada na borda inferior (jamais cobre a hélice)
    const hudX = Math.min(this.width - 180, Math.max(16, px - 80));
    const hudY = this.height - 38;
    ctx.fillStyle = "rgba(2, 20, 24, 0.92)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.0;
    ctx.shadowBlur = 0;
    ctx.fillRect(hudX, hudY, 170, 28);
    ctx.strokeRect(hudX, hudY, 170, 28);

    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 9.5px monospace";
    ctx.textAlign = "left";
    ctx.fillText((closest.name || "LOCUS DINÂMICO").toUpperCase().slice(0, 20), hudX + 6, hudY + 12);
    ctx.fillStyle = color;
    ctx.font = "8.5px monospace";
    ctx.fillText(`TELEMETRIA: ${axis.toUpperCase()} · VALOR: ${closest.threshold || 0}%`, hudX + 6, hudY + 23);
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
