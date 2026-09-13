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
  will: "#e85d48",
  communion: "#4ac8b7",
  humanity: "#78abe1"
});

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

    this._buildStaticGenome();
    this._boundMouseMove = (event) => this._onMouseMove(event);
    this._boundMouseLeave = () => { this.targetTiltX = 0; this.targetTiltY = 0; };
    this._boundClick = (event) => this._onClick(event);
  }

  _buildStaticGenome() {
    const rng = mulberry32(this.seed ^ 0xA11E1101);
    const metrics = this.metrics;
    const complexity = metrics.complexity / 100;

    const nodeCount = 140;
    this.meshNodes = Array.from({ length: nodeCount }, (_, index) => ({
      id: index,
      x: (rng() - 0.5) * 1.9,
      y: (rng() - 0.5) * 1.55,
      z: (rng() - 0.5) * 220,
      vx: (rng() - 0.5) * 0.00055,
      vy: (rng() - 0.5) * 0.00045,
      vz: (rng() - 0.5) * 0.10,
      phase: rng() * Math.PI * 2,
      weight: 0.45 + rng() * 0.9
    }));

    // Conexões pré-computadas para não fazer O(n²) completo a cada frame.
    const edges = new Set();
    for (let i = 0; i < this.meshNodes.length; i += 1) {
      const a = this.meshNodes[i];
      const nearest = [];
      for (let j = 0; j < this.meshNodes.length; j += 1) {
        if (i === j) continue;
        const b = this.meshNodes[j];
        const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + ((a.z - b.z) / 260) ** 2;
        nearest.push([d, j]);
      }
      nearest.sort((x, y) => x[0] - y[0]);
      const links = 2 + Math.round(complexity * 2);
      for (const [, j] of nearest.slice(0, links)) {
        const lo = Math.min(i, j);
        const hi = Math.max(i, j);
        edges.add(`${lo}:${hi}`);
      }
    }
    this.meshEdges = [...edges].map((pair) => pair.split(":").map(Number));

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
    const mx = (event.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
    const my = (event.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
    this.targetTiltY = mx * 0.15;
    this.targetTiltX = -my * 0.12;
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
    // Rupturas só ficam anatômicas quando a perda identitária realmente avançou.
    // Nos estágios baixos elas aparecem como telemetria/pares anômalos, preservando
    // a silhueta do DNA ANALYSIS original.
    return strength * Math.max(0, (this.metrics.identityLossMorph - 0.18) / 0.82);
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
    return { will: Math.min(1.8, will), communion: Math.min(1.8, communion), humanity: Math.min(1.8, humanity) };
  }

  _helixWorld(t, strand, centerY, radius, startX, endX) {
    const m = this.metrics;
    const fields = this._hotspotFields(t);
    const xBase = startX + t * (endX - startX);

    // DNA ANALYSIS original: loopWidth=(end-start)/4 e theta=(x/loopWidth)*PI.
    // Isso equivale a 4*PI ao longo do viewport. A dev.5 usava 8*PI e dobrava
    // artificialmente a frequência da hélice.
    const strandPhase = strand === 2 ? Math.PI : 0;
    const baseTheta = t * Math.PI * 4 + this.angle + strandPhase;

    const willMorph = m.willMorph || 0;
    const communionMorph = m.communionMorph || 0;
    const humanityMorph = m.humanityMorph || 0;
    const lossMorph = m.identityLossMorph || 0;
    const sign = strand === 1 ? 1 : -1;

    // Deformações são locais e progressivas. Em 40–59 o DNA ainda permanece muito
    // próximo da referência; 60+ abre deformações anatômicas e 80–100 permite extremos.
    const localWill = Math.min(1.35, fields.will) * willMorph;
    const localComm = Math.min(1.35, fields.communion) * communionMorph;
    const localLoss = Math.min(1.35, fields.humanity) * lossMorph;

    const seedPhase = (this.seed % 997) * 0.0061;
    const highWill = Math.max(0, (willMorph - 0.24) / 0.76);
    const highLoss = Math.max(0, (lossMorph - 0.24) / 0.76);
    const highComm = Math.max(0, (communionMorph - 0.24) / 0.76);

    // Fase local: quase nula nos estágios baixos, podendo cisalhar as fitas nos altos.
    const phaseShear = sign * (
      Math.sin(t * Math.PI * 5.5 + seedPhase) * highLoss * 0.20 +
      Math.sin(t * Math.PI * 3.0 + seedPhase * 0.7) * highWill * highLoss * 0.12
    ) * (0.35 + localLoss * 0.65);
    const theta = baseTheta + phaseShear;

    // Raio preserva o DNA original como base. Predação cria hipertrofia localizada;
    // perda identitária gera assimetria; Comunhão tende a reconectar/organizar.
    const radial = 1
      + localWill * highWill * 0.285
      + localLoss * highLoss * 0.200
      - localComm * highComm * 0.038;

    // Deslocamento lateral/vertical só ganha força real após o estágio IV.
    const warp = radius * sign * (
      Math.sin(t * Math.PI * 4.7 + seedPhase) * highWill * 0.055 +
      Math.sin(t * Math.PI * 7.1 + seedPhase * 1.3) * highLoss * 0.070
    );

    // Humanidade alta funciona como contenção geométrica: reduz distorções locais,
    // mas sua presença visual aparece principalmente nos humanity-locks azuis.
    const containment = 1 - humanityMorph * 0.20;
    const y = centerY + radius * radial * Math.sin(theta) + warp * containment;
    const z = radius * (1 + localWill * highWill * 0.11 + localLoss * highLoss * 0.08) * Math.cos(theta) + warp * 0.30 * containment;

    // Em estados extremos a própria linha axial pode ficar levemente irregular.
    const x = xBase + Math.sin(t * Math.PI * 9 + seedPhase) * radius * 0.035 * Math.max(highWill, highLoss);
    return { x, y, z, theta, baseTheta, fields, radial };
  }

  _drawBackground(project, centerY, timeSec) {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;

    ctx.save();
    ctx.fillStyle = "rgba(63,244,213,0.12)";
    for (let gx = 20; gx < width; gx += 40) {
      for (let gy = 20; gy < height; gy += 40) {
        const twinkle = 0.55 + 0.45 * Math.sin(timeSec * 0.75 + gx * 0.02 + gy * 0.017);
        ctx.globalAlpha = twinkle;
        ctx.beginPath();
        ctx.arc(gx, gy, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    for (const node of this.meshNodes) {
      node.x += node.vx;
      node.y += node.vy;
      node.z += node.vz;
      if (Math.abs(node.x) > 0.98) node.vx *= -1;
      if (Math.abs(node.y) > 0.80) node.vy *= -1;
      if (Math.abs(node.z) > 110) node.vz *= -1;
    }

    const projected = this.meshNodes.map((node) => project(
      width * 0.5 + node.x * width * 0.52,
      centerY + node.y * height * 0.48,
      node.z
    ));

    ctx.save();
    ctx.lineWidth = 0.55;
    for (let edgeIndex = 0; edgeIndex < this.meshEdges.length; edgeIndex += this.quality < 1 ? 2 : 1) {
      const [aIndex, bIndex] = this.meshEdges[edgeIndex];
      const a = projected[aIndex];
      const b = projected[bIndex];
      if (!a || !b) continue;
      const dx = a.px - b.px;
      const dy = a.py - b.py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.max(62, width * 0.075);
      if (dist > maxDist) continue;
      const alpha = (1 - dist / maxDist) * (0.10 + this.metrics.complexity * 0.0012);
      ctx.strokeStyle = rgba(COLORS.cyan, alpha);
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.stroke();
    }
    projected.forEach((point, index) => {
      if (this.quality < 1 && index % 2 === 1) return;
      const node = this.meshNodes[index];
      const alpha = 0.15 + point.normZ * 0.30;
      ctx.fillStyle = rgba(index % 11 === 0 ? COLORS.gold : COLORS.cyan, alpha);
      ctx.beginPath();
      ctx.arc(point.px, point.py, (0.65 + node.weight * 0.55) * point.scale, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  _pushBranchRenderables(renderables, project, centerY, radius, startX, endX) {
    const m = this.metrics;
    const strength = clamp01(m.willMorph || 0);
    if (strength < 0.10 || !this.branchSlots.length) return;

    this.branchSlots.forEach((branch, branchIndex) => {
      const source = this._helixWorld(branch.t, branch.strand, centerY, radius, startX, endX);
      const points = [];
      const high = Math.max(0, (strength - 0.20) / 0.80);
      const steps = 12 + Math.round(branch.length * (5 + high * 7));
      const maxLen = radius * (0.12 + strength * 0.78) * branch.length;
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
        renderables.push({
          type: "branch",
          p1,
          p2,
          z: (p1.z + p2.z) * 0.5,
          strength,
          persistent: branch.persistent,
          width: Math.max(0.55, (0.9 + strength * 1.4) * (1 - i / points.length * 0.64))
        });
        if (high > 0.16 && i % 3 === 0) renderables.push({ type: "branch_bead", p: p1, z: p1.z, strength, persistent: branch.persistent });
      }
      if (high > 0.45 && branchIndex % 3 === 0 && points.at(-1)) {
        renderables.push({ type: "branch_tip", p: points.at(-1), z: points.at(-1).z, strength });
      }
    });
  }

  _pushLatticeRenderables(renderables, project, centerY, radius, startX, endX) {
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
      renderables.push({ type: "lattice", p1: pA, p2: outer, z: (pA.z + outer.z) * 0.5, strength, phase: slot.phase, index });
      renderables.push({ type: "lattice", p1: outer, p2: pB, z: (outer.z + pB.z) * 0.5, strength, phase: slot.phase, index });
      if (high > 0.10) renderables.push({ type: "lattice_node", p: outer, z: outer.z, strength });
    });
  }

  _pushHumanityLocks(renderables, project, centerY, radius, startX, endX) {
    const strength = clamp01(this.metrics.humanityMorph || 0);
    if (strength < 0.09 || !this.humanityLockSlots?.length) return;
    this.humanityLockSlots.forEach((slot) => {
      const w1 = this._helixWorld(slot.t, 1, centerY, radius, startX, endX);
      const w2 = this._helixWorld(slot.t, 2, centerY, radius, startX, endX);
      const p1 = project(w1.x, w1.y, w1.z);
      const p2 = project(w2.x, w2.y, w2.z);
      const center = project((w1.x + w2.x) * 0.5, centerY, 0);
      renderables.push({ type: "humanity_lock", p1, p2, p: center, z: center.z + 3, strength, phase: slot.phase, weight: slot.weight });
    });
  }

  _pushPersistentMarks(renderables, project, centerY, radius, startX, endX) {
    for (const mark of this.persistentMarks) {
      const world = this._helixWorld(mark.t, 1, centerY, radius, startX, endX);
      const p = project(world.x, world.y, world.z);
      renderables.push({ type: "mutation_ring", p, z: p.z + 6, axis: mark.axis, ring: mark.ring, phase: mark.phase });
    }
  }

  _pushTerminalTail(renderables, project, centerY, radius, startX, endX) {
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
        renderables.push({ type: "tail", p1, p2, z: (p1.z + p2.z) * 0.5, energy, child: kind === "child", width: widthFn(step, pts.length) });
        renderables.push({ type: "tail_bead", p: p1, z: p1.z, energy, child: kind === "child", radius: Math.max(0.75, 2.35 - step * 0.075) });
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
    this.angle += this.rotSpeed * (dt / 16.667);
    this.laserPhase += 0.018 * (dt / 16.667);

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
    const renderables = [];
    const sampleCount = 120;
    const s1 = [];
    const s2 = [];

    for (let i = 0; i < sampleCount; i += 1) {
      const t = i / (sampleCount - 1);
      const w1 = this._helixWorld(t, 1, centerY, radius, startX, endX);
      const w2 = this._helixWorld(t, 2, centerY, radius, startX, endX);
      const p1 = project(w1.x, w1.y, w1.z);
      const p2 = project(w2.x, w2.y, w2.z);
      s1.push({ ...p1, t, world: w1, fracture: this._fractureStrength(t) });
      s2.push({ ...p2, t, world: w2, fracture: this._fractureStrength(t) });
    }

    for (let i = 0; i < sampleCount - 1; i += 1) {
      const a1 = s1[i]; const b1 = s1[i + 1];
      const a2 = s2[i]; const b2 = s2[i + 1];
      const frag1 = Math.max(a1.fracture, b1.fracture);
      const frag2 = Math.max(a2.fracture, b2.fracture);
      if (frag1 < 0.68) renderables.push({ type: "backbone", p1: a1, p2: b1, z: (a1.z + b1.z) * 0.5, strand: 1, fracture: frag1 });
      if (frag2 < 0.72) renderables.push({ type: "backbone", p1: a2, p2: b2, z: (a2.z + b2.z) * 0.5, strand: 2, fracture: frag2 });
    }

    const rungCount = 64;
    for (let i = 0; i < rungCount; i += 1) {
      const t = i / (rungCount - 1);
      const w1 = this._helixWorld(t, 1, centerY, radius, startX, endX);
      const w2 = this._helixWorld(t, 2, centerY, radius, startX, endX);
      const p1 = project(w1.x, w1.y, w1.z);
      const p2 = project(w2.x, w2.y, w2.z);
      const fracture = this._fractureStrength(t);
      const anomalous = this.anomalousRungs.has(i);
      if (fracture < 0.78) renderables.push({ type: "rung", p1, p2, z: (p1.z + p2.z) * 0.5 - 4, anomalous, fracture });

      const beads = 13;
      for (let b = 1; b < beads; b += 1) {
        const u = b / beads;
        let y = w1.y + (w2.y - w1.y) * u;
        let z = w1.z + (w2.z - w1.z) * u;
        if (anomalous) {
          const bend = Math.sin(u * Math.PI) * radius * 0.10 * (this.metrics.identityLossMorph || 0);
          y += bend * Math.sin(i * 0.9 + this.seed);
          z += bend * Math.cos(i * 0.7 + this.seed);
        }
        const p = project(w1.x, y, z);
        renderables.push({ type: "bead", p, z: p.z, anomalous, index: b });
      }

      const absSin = Math.abs(Math.sin(w1.theta));
      const crest = absSin > 0.52;
      const peak = crest ? (absSin - 0.52) / 0.48 : 0;
      renderables.push({ type: "strand_node", p: p1, z: p1.z, ring: crest, peak, axis: anomalous ? "vontade" : "neutral" });
      renderables.push({ type: "strand_node", p: p2, z: p2.z, ring: crest, peak, axis: anomalous ? "humanidade" : "neutral" });
      if (peak > 0.82 && i % 2 === 0) {
        const off = (p1.py < centerY ? -9 : 9) * p1.scale;
        renderables.push({ type: "satellite", p: { ...p1, py: p1.py + off, z: p1.z + 9 }, z: p1.z + 9 });
      }
      if (absSin < 0.22) {
        const cross = project(w1.x, centerY + Math.sin(i + this.seed) * radius * (this.metrics.identityLossMorph || 0) * 0.04, 0);
        renderables.push({ type: "twist", p: cross, z: cross.z });
      }
    }

    if (this.metrics.extraStrand > 0.04) {
      const thirdAlpha = clamp01(this.metrics.extraStrand);
      let last = null;
      for (let i = 0; i < sampleCount; i += 1) {
        const t = i / (sampleCount - 1);
        const base = this._helixWorld(t, 1, centerY, radius, startX, endX);
        const theta = base.theta + (Math.PI * 2) / 3 + Math.sin(t * 9 + this.seed) * 0.08 * thirdAlpha;
        const r = radius * (0.83 + thirdAlpha * 0.14);
        const world = {
          x: base.x,
          y: centerY + r * Math.sin(theta),
          z: r * Math.cos(theta)
        };
        const p = project(world.x, world.y, world.z);
        if (last) renderables.push({ type: "third", p1: last, p2: p, z: (last.z + p.z) * 0.5, strength: thirdAlpha });
        last = p;
      }
    }

    this._pushBranchRenderables(renderables, project, centerY, radius, startX, endX);
    this._pushLatticeRenderables(renderables, project, centerY, radius, startX, endX);
    this._pushHumanityLocks(renderables, project, centerY, radius, startX, endX);
    this._pushPersistentMarks(renderables, project, centerY, radius, startX, endX);
    this._pushTerminalTail(renderables, project, centerY, radius, startX, endX);

    renderables.sort((a, b) => a.z - b.z);
    for (const item of renderables) this._drawRenderable(item, laserX, now);

    this._drawSparks(dt);
    this._drawScanner(laserX);
    // O DNA ANALYSIS original não desenha um retículo adicional por cima da molécula;
    // o retículo pertence à instrumentação lateral. Mantemos o viewport molecular limpo.

    this.frameId = requestAnimationFrame((next) => this._render(next));
  }

  _hitFor(item, laserX, range = 30) {
    let x = null;
    if (item.p) x = item.p.px;
    else if (item.p1 && item.p2) x = (item.p1.px + item.p2.px) * 0.5;
    if (x == null) return { hit: false, intensity: 0 };
    const dist = Math.abs(x - laserX);
    return { hit: dist < range, intensity: dist < range ? 1 - dist / range : 0 };
  }

  _drawRenderable(item, laserX, now) {
    const ctx = this.ctx;
    const hit = this._hitFor(item, laserX, item.type === "mutation_ring" ? 36 : 28);
    const z = item.p?.normZ ?? item.p1?.normZ ?? 0.5;

    if (item.type === "backbone") {
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      if (hit.hit) {
        ctx.strokeStyle = rgba("#ffebaa", 0.55 + hit.intensity * 0.45);
        ctx.lineWidth = z > 0.5 ? 2.2 : 1.4;
        ctx.shadowColor = COLORS.gold;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        if (z > 0.5) {
          ctx.strokeStyle = rgba(COLORS.cyan, 0.35 + z * 0.45);
          ctx.lineWidth = 1.8;
        } else {
          ctx.strokeStyle = rgba("#147378", 0.15 + z * 0.25);
          ctx.lineWidth = 1.0;
        }
        ctx.stroke();
      }
      if (hit.hit && Math.random() < 0.035 + hit.intensity * 0.06) this._sparkAt((item.p1.px + item.p2.px) / 2, (item.p1.py + item.p2.py) / 2, hit.intensity);
      return;
    }

    if (item.type === "rung") {
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      if (hit.hit) {
        ctx.strokeStyle = rgba("#ffe6a0", 0.45 + hit.intensity * 0.55);
        ctx.lineWidth = 1.4;
        ctx.shadowColor = COLORS.gold;
        ctx.shadowBlur = 6;
      } else {
        ctx.strokeStyle = item.anomalous ? rgba(COLORS.will, 0.34) : rgba(COLORS.cyan, 0.22);
        ctx.lineWidth = item.anomalous ? 1.0 : 0.8;
      }
      if (item.anomalous) ctx.setLineDash([2, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
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
      } else if (item.anomalous) {
        ctx.fillStyle = rgba(COLORS.will, 0.62 + z * 0.25);
      } else if (z > 0.45) {
        ctx.fillStyle = rgba(COLORS.cyan, 0.55 + z * 0.45);
      } else {
        ctx.fillStyle = rgba("#106e73", 0.20 + z * 0.35);
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
          ctx.strokeStyle = rgba(accent, 0.70 + z * 0.30);
          ctx.lineWidth = 2.4;
          if (z > 0.4) {
            ctx.shadowColor = rgba(accent, 0.75);
            ctx.shadowBlur = 8 * z;
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(item.p.px, item.p.py, ring * 0.45, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(COLORS.cyanBright, 0.40 + z * 0.40);
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
        } else if (z > 0.45) {
          ctx.fillStyle = rgba(accent, 0.50 + z * 0.50);
        } else {
          ctx.fillStyle = rgba("#106e73", 0.20 + z * 0.35);
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

    if (item.type === "branch") {
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      const color = item.persistent ? COLORS.will : "#d76a51";
      ctx.strokeStyle = hit.hit ? rgba(COLORS.gold, 0.95) : rgba(color, 0.38 + item.strength * 0.56);
      ctx.lineWidth = item.width * (0.72 + z * 0.5);
      ctx.shadowColor = color;
      ctx.shadowBlur = item.persistent ? 5 + item.strength * 5 : 2 + item.strength * 3;
      ctx.stroke();
      ctx.shadowBlur = 0;
      return;
    }

    if (item.type === "branch_bead" || item.type === "branch_tip") {
      const r = item.type === "branch_tip" ? 4.2 : 1.6 + z * 1.4;
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, r, 0, Math.PI * 2);
      ctx.fillStyle = hit.hit ? COLORS.white : rgba(COLORS.will, item.type === "branch_tip" ? 0.92 : 0.68);
      ctx.shadowColor = item.type === "branch_tip" ? COLORS.will : "transparent";
      ctx.shadowBlur = item.type === "branch_tip" ? 9 : 0;
      ctx.fill();
      ctx.shadowBlur = 0;
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
      const tailColor = (this.metrics.willMorph || 0) > 0.72 ? COLORS.will : COLORS.cyan;
      ctx.strokeStyle = hit.hit ? rgba(COLORS.gold, 0.94) : rgba(tailColor, (item.child ? 0.45 : 0.66) + item.energy * 0.20);
      ctx.lineWidth = item.width * (0.76 + z * 0.48);
      ctx.shadowColor = tailColor;
      ctx.shadowBlur = item.child ? 2 : 4 + item.energy * 3;
      ctx.stroke();
      ctx.shadowBlur = 0;
      return;
    }

    if (item.type === "tail_bead") {
      const tailColor = (this.metrics.willMorph || 0) > 0.72 ? COLORS.will : COLORS.cyanBright;
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, (item.child ? 1.15 : 1.65) * item.p.scale, 0, Math.PI * 2);
      ctx.fillStyle = hit.hit ? COLORS.white : rgba(tailColor, 0.72 + z * 0.22);
      ctx.fill();
      return;
    }

    if (item.type === "humanity_lock") {
      const strength = item.strength || 0;
      const pulse = 1 + Math.sin(now * 0.0018 + item.phase) * (0.03 + strength * 0.08);
      // Travessa de contenção entre as duas fitas.
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      ctx.strokeStyle = hit.hit ? rgba(COLORS.gold, 0.86) : rgba(COLORS.humanity, 0.10 + strength * 0.38);
      ctx.lineWidth = 0.55 + strength * 0.75;
      ctx.stroke();
      // Anel técnico central, pequeno nos estágios médios e mais evidente nos altos.
      const r = (2.6 + strength * 5.2) * pulse * (item.weight || 1);
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, r, 0, Math.PI * 2);
      ctx.strokeStyle = hit.hit ? COLORS.gold : rgba(COLORS.humanity, 0.24 + strength * 0.58);
      ctx.lineWidth = 0.8 + strength * 0.9;
      ctx.shadowColor = COLORS.humanity;
      ctx.shadowBlur = strength > 0.45 ? 3 + strength * 5 : 0;
      ctx.stroke();
      ctx.shadowBlur = 0;
      return;
    }

    if (item.type === "mutation_ring") {
      const axisColor = item.axis === "vontade" ? COLORS.will : item.axis === "comunhao" ? COLORS.communion : COLORS.humanity;
      const pulse = 1 + Math.sin(now * 0.0022 + item.phase) * 0.17;
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, item.ring * pulse * item.p.scale, 0, Math.PI * 2);
      ctx.strokeStyle = hit.hit ? COLORS.gold : rgba(axisColor, 0.82);
      ctx.lineWidth = 1.3;
      ctx.setLineDash([2, 3]);
      ctx.shadowColor = axisColor;
      ctx.shadowBlur = 5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
    }
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
    const top = this.height * 0.18;
    const bottom = this.height * 0.88;

    // DNA ANALYSIS original: halo amplo + feixe dourado + núcleo branco.
    ctx.strokeStyle = "rgba(255,190,60,0.18)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(laserX, top);
    ctx.lineTo(laserX, bottom);
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, "rgba(255,209,92,0)");
    gradient.addColorStop(0.15, "rgba(255,209,92,0.75)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.95)");
    gradient.addColorStop(0.85, "rgba(255,209,92,0.75)");
    gradient.addColorStop(1, "rgba(255,209,92,0)");

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2.4;
    ctx.shadowColor = COLORS.gold;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(laserX, top);
    ctx.lineTo(laserX, bottom);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(laserX, top + 10);
    ctx.lineTo(laserX, bottom - 10);
    ctx.stroke();

    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(laserX - 6, top);
    ctx.lineTo(laserX + 6, top);
    ctx.moveTo(laserX - 6, bottom);
    ctx.lineTo(laserX + 6, bottom);
    ctx.stroke();
  }

  _drawReticleOverlay(now, centerY, startX, endX) {
    const ctx = this.ctx;
    const pulse = 0.5 + Math.sin(now * 0.002) * 0.5;
    ctx.save();
    ctx.strokeStyle = rgba(COLORS.cyan, 0.18 + pulse * 0.07);
    ctx.lineWidth = 0.65;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(startX, centerY);
    ctx.lineTo(endX, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    const x = this.width * 0.72;
    const y = this.height * 0.19;
    const r = Math.min(31, this.height * 0.06);
    ctx.translate(x, y);
    ctx.rotate(now * 0.00015);
    ctx.strokeStyle = rgba(COLORS.cyan, 0.28);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(-now * 0.00035);
    ctx.strokeStyle = rgba(COLORS.gold, 0.28);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.63, 0, Math.PI * 1.45);
    ctx.stroke();
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
