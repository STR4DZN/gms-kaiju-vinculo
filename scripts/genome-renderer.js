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
    this.angle = (this.rng() * Math.PI * 2) % (Math.PI * 2);
    this.rotSpeed = 0.010 + this.metrics.complexity * 0.000025;
    this.laserPhase = this.rng() * Math.PI * 2;
    this.baseTiltX = -0.055;
    this.baseTiltY = 0.018;
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

    const nodeCount = 96 + Math.round(complexity * 44);
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

    this.branchSlots = chooseSlots(rng, Math.min(12, metrics.branchCount), 0.10, 0.84, 0.055).map((t, index) => ({
      t,
      strand: rng() > 0.5 ? 1 : 2,
      sign: rng() > 0.5 ? 1 : -1,
      length: 0.55 + rng() * 0.75,
      curl: (rng() - 0.5) * 1.4,
      phase: rng() * Math.PI * 2,
      persistent: index < Math.min(metrics.genome.mutations.length, metrics.branchCount)
    }));

    this.latticeSlots = chooseSlots(rng, Math.min(12, metrics.latticeCount), 0.08, 0.88, 0.048).map((t) => ({
      t,
      sign: rng() > 0.5 ? 1 : -1,
      spread: 0.4 + rng() * 0.7,
      phase: rng() * Math.PI * 2
    }));

    this.fractureSlots = chooseSlots(rng, Math.min(7, metrics.fractureCount), 0.12, 0.86, 0.10).map((t) => ({
      t,
      width: 0.010 + rng() * 0.012,
      phase: rng() * Math.PI * 2
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
    this.rotSpeed = this.rotSpeed > 0.02 ? 0.0045 : this.rotSpeed > 0.007 ? 0.026 : 0.012;
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
      const scale = 1 + z2 * 0.00085;
      return {
        px: this.width * 0.5 + x1 + z2 * 0.038,
        py: centerY + y2,
        scale,
        z: z2,
        normZ: clamp01((z2 + radius * 1.5) / (radius * 3))
      };
    };
  }

  _fractureStrength(t) {
    let strength = 0;
    for (const fracture of this.fractureSlots) strength = Math.max(strength, gaussian(t, fracture.t, fracture.width));
    return strength * this.metrics.identityDeviation;
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
    const x = startX + t * (endX - startX);
    const turns = 3.55 + m.complexity * 0.006 + m.predatoryMemory * 0.35;
    const theta = t * turns * Math.PI * 2 + this.angle + (strand === 2 ? Math.PI : 0);

    const predator = m.will * 0.62 + m.predatoryMemory * 0.38;
    const symbiosis = m.communion * 0.72 + m.symbioticMemory * 0.28;
    const deviation = m.identityDeviation;
    const asym = deviation * (0.18 + predator * 0.18);
    const localPred = fields.will * predator;
    const localHuman = fields.humanity * deviation;
    const localComm = fields.communion * symbiosis;

    const harmonic = Math.sin(t * Math.PI * 10 + (this.seed % 103) * 0.013) * deviation * 0.06;
    const pulse = Math.sin(performance.now() * 0.0012 + t * 15 + (this.seed % 31)) * 0.008 * (0.3 + m.complexity / 100);
    const radial = 1 + localPred * 0.22 + localHuman * 0.14 + harmonic + pulse;
    const strandBias = strand === 1 ? 1 : -1;
    const localShift = radius * (
      Math.sin(t * Math.PI * 6 + (this.seed % 47)) * asym * 0.26 +
      localHuman * strandBias * deviation * 0.16 -
      localComm * strandBias * symbiosis * 0.045
    );

    const y = centerY + radius * radial * Math.sin(theta) + localShift;
    const z = radius * (1 + localPred * 0.11 - localComm * 0.035) * Math.cos(theta) + localShift * 0.35;
    return { x, y, z, theta, fields, radial };
  }

  _drawBackground(project, centerY, timeSec) {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;

    ctx.save();
    ctx.fillStyle = "rgba(63,244,213,0.085)";
    for (let gx = 18; gx < width; gx += 38) {
      for (let gy = 18; gy < height; gy += 38) {
        const twinkle = 0.55 + 0.45 * Math.sin(timeSec * 0.75 + gx * 0.02 + gy * 0.017);
        ctx.globalAlpha = twinkle;
        ctx.beginPath();
        ctx.arc(gx, gy, 0.7, 0, Math.PI * 2);
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
    const strength = clamp01((m.will * 0.62 + m.predatoryMemory * 0.55 + m.identityDeviation * 0.28) / 1.25);
    if (strength < 0.08) return;

    this.branchSlots.forEach((branch, branchIndex) => {
      const source = this._helixWorld(branch.t, branch.strand, centerY, radius, startX, endX);
      const points = [];
      const steps = 14 + Math.round(branch.length * 8);
      const maxLen = radius * (0.35 + 0.82 * strength) * branch.length;
      const tangent = source.theta + Math.PI * 0.5;
      for (let step = 0; step < steps; step += 1) {
        const f = step / Math.max(1, steps - 1);
        const curl = Math.sin(f * Math.PI * (1.2 + branch.length * 0.7) + branch.phase) * radius * 0.16 * strength;
        const x = source.x + f * maxLen * 0.85;
        const y = source.y + branch.sign * f * maxLen + curl;
        const z = source.z + Math.cos(tangent + f * 2.2 + branch.curl) * radius * 0.32 * f;
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
          width: Math.max(0.65, (2.3 + strength * 1.8) * (1 - i / points.length * 0.64))
        });
        if (i % 2 === 0) renderables.push({ type: "branch_bead", p: p1, z: p1.z, strength, persistent: branch.persistent });
      }
      if (branchIndex % 3 === 0 && points.at(-1)) {
        renderables.push({ type: "branch_tip", p: points.at(-1), z: points.at(-1).z, strength });
      }
    });
  }

  _pushLatticeRenderables(renderables, project, centerY, radius, startX, endX) {
    const m = this.metrics;
    const strength = clamp01(m.communion * 0.72 + m.symbioticMemory * 0.38);
    if (strength < 0.08) return;
    this.latticeSlots.forEach((slot, index) => {
      const a = this._helixWorld(slot.t, 1, centerY, radius, startX, endX);
      const b = this._helixWorld(Math.min(0.96, slot.t + 0.04 + slot.spread * 0.025), 2, centerY, radius, startX, endX);
      const pA = project(a.x, a.y, a.z);
      const pB = project(b.x, b.y, b.z);
      const outer = project(
        (a.x + b.x) * 0.5 + radius * 0.22 * Math.sin(slot.phase),
        centerY + slot.sign * radius * (1.20 + slot.spread * 0.45),
        (a.z + b.z) * 0.5 + slot.sign * radius * 0.38
      );
      renderables.push({ type: "lattice", p1: pA, p2: outer, z: (pA.z + outer.z) * 0.5, strength, phase: slot.phase, index });
      renderables.push({ type: "lattice", p1: outer, p2: pB, z: (outer.z + pB.z) * 0.5, strength, phase: slot.phase, index });
      renderables.push({ type: "lattice_node", p: outer, z: outer.z, strength });
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
    const m = this.metrics;
    const sourceTop = this._helixWorld(0.995, 1, centerY, radius, startX, endX);
    const sourceBottom = this._helixWorld(0.995, 2, centerY, radius, startX, endX);
    const energy = clamp01(0.30 + m.predatoryMemory * 0.42 + m.identityDeviation * 0.28 + m.mutationLoad / 260);
    const reach = radius * (0.72 + energy * 0.78);
    const makeTail = (source, sign, steps, branchScale, phase, child = false) => {
      const pts = [];
      for (let step = 0; step < steps; step += 1) {
        const f = step / Math.max(1, steps - 1);
        const x = source.x + f * reach * branchScale;
        const arc = Math.sin(f * Math.PI * (0.65 + branchScale * 0.24)) * radius * 0.28 * sign;
        const fractal = Math.sin(f * Math.PI * 3.3 + phase) * radius * (0.035 + energy * 0.05) * f;
        const y = source.y + arc + fractal + sign * Math.pow(f, 1.45) * radius * 0.18;
        const z = source.z + Math.cos(f * Math.PI * 1.6 + phase) * radius * 0.18 * f;
        pts.push(project(x, y, z));
      }
      for (let i = 0; i < pts.length - 1; i += 1) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        renderables.push({
          type: "tail",
          p1, p2,
          z: (p1.z + p2.z) * 0.5,
          energy, child,
          width: Math.max(0.55, (child ? 1.15 : 2.0) * (1 - i / pts.length * 0.72))
        });
        if (i % (child ? 3 : 2) === 0) renderables.push({ type: "tail_bead", p: p1, z: p1.z, energy, child });
      }
      return pts;
    };

    const top = makeTail(sourceTop, -1, 27, 1.0, this.seed * 0.0007, false);
    makeTail(sourceBottom, 1, 22, 0.82, this.seed * 0.0009 + 1.7, false);
    if (energy > 0.42 && top.length > 8) {
      const forkPoint = top[Math.floor(top.length * 0.36)];
      const pseudo = { x: endX + reach * 0.35, y: forkPoint.py, z: forkPoint.z };
      // A subcauda nasce aproximadamente no terço final do filamento superior.
      const source = { x: endX + reach * 0.32, y: centerY - radius * (0.55 + energy * 0.18), z: radius * 0.12 };
      makeTail(source, -1, 16, 0.62, this.seed * 0.0011 + 2.4, true);
    }
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

    this.tiltX += (this.targetTiltX - this.tiltX) * 0.075;
    this.tiltY += (this.targetTiltY - this.tiltY) * 0.075;
    this.angle += this.rotSpeed * (dt / 16.667);
    this.laserPhase += (0.015 + this.metrics.mutationLoad * 0.000035) * (dt / 16.667);

    const centerY = height * 0.52;
    const radius = Math.min(118, height * (0.235 + this.metrics.complexity * 0.00022));
    const startX = width * 0.047;
    const endX = width * 0.825;
    const project = this._projector(centerY, radius);

    this._drawBackground(project, centerY, timeSec);

    const laserX = startX + (0.5 + 0.5 * Math.sin(this.laserPhase)) * (endX - startX);
    const renderables = [];
    const sampleCount = this.quality < 1 ? 104 : 128;
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

    const rungCount = this.quality < 1 ? 52 : 64;
    for (let i = 0; i < rungCount; i += 1) {
      const t = i / (rungCount - 1);
      const w1 = this._helixWorld(t, 1, centerY, radius, startX, endX);
      const w2 = this._helixWorld(t, 2, centerY, radius, startX, endX);
      const p1 = project(w1.x, w1.y, w1.z);
      const p2 = project(w2.x, w2.y, w2.z);
      const fracture = this._fractureStrength(t);
      const anomalous = this.anomalousRungs.has(i);
      if (fracture < 0.78) renderables.push({ type: "rung", p1, p2, z: (p1.z + p2.z) * 0.5 - 4, anomalous, fracture });

      const beads = this.quality < 1 ? 10 : 13;
      for (let b = 1; b < beads; b += 1) {
        const u = b / beads;
        let y = w1.y + (w2.y - w1.y) * u;
        let z = w1.z + (w2.z - w1.z) * u;
        if (anomalous) {
          const bend = Math.sin(u * Math.PI) * radius * 0.10 * this.metrics.identityDeviation;
          y += bend * Math.sin(i * 0.9 + this.seed);
          z += bend * Math.cos(i * 0.7 + this.seed);
        }
        const p = project(w1.x, y, z);
        renderables.push({ type: "bead", p, z: p.z, anomalous, index: b });
      }

      const absSin = Math.abs(Math.sin(w1.theta));
      const crest = absSin > 0.50;
      const peak = crest ? (absSin - 0.50) / 0.50 : 0;
      renderables.push({ type: "strand_node", p: p1, z: p1.z, ring: crest, peak, axis: anomalous ? "vontade" : "neutral" });
      renderables.push({ type: "strand_node", p: p2, z: p2.z, ring: crest, peak, axis: anomalous ? "humanidade" : "neutral" });
      if (peak > 0.82 && i % 2 === 0) {
        const off = (p1.py < centerY ? -10 : 10) * p1.scale;
        renderables.push({ type: "satellite", p: { ...p1, py: p1.py + off, z: p1.z + 9 }, z: p1.z + 9 });
      }
      if (absSin < 0.19) {
        const cross = project(w1.x, centerY + Math.sin(i + this.seed) * radius * this.metrics.identityDeviation * 0.04, 0);
        renderables.push({ type: "twist", p: cross, z: cross.z });
      }
    }

    if (this.metrics.extraStrand > 0.08) {
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
    this._pushPersistentMarks(renderables, project, centerY, radius, startX, endX);
    this._pushTerminalTail(renderables, project, centerY, radius, startX, endX);

    renderables.sort((a, b) => a.z - b.z);
    for (const item of renderables) this._drawRenderable(item, laserX, now);

    this._drawSparks(dt);
    this._drawScanner(laserX);
    this._drawReticleOverlay(now, centerY, startX, endX);

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
        ctx.strokeStyle = rgba(COLORS.gold, 0.62 + hit.intensity * 0.38);
        ctx.lineWidth = 1.8 + z * 2.1;
        ctx.shadowColor = COLORS.gold;
        ctx.shadowBlur = 7 + hit.intensity * 11;
      } else {
        const base = item.strand === 1 ? COLORS.cyanBright : COLORS.cyan;
        ctx.strokeStyle = rgba(base, 0.24 + z * 0.70);
        ctx.lineWidth = 1.1 + z * (2.2 + this.metrics.complexity * 0.012);
        ctx.shadowColor = COLORS.cyan;
        ctx.shadowBlur = z > 0.55 ? 4 + z * 4 : 0;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (hit.hit && Math.random() < 0.05 + hit.intensity * 0.08) this._sparkAt((item.p1.px + item.p2.px) / 2, (item.p1.py + item.p2.py) / 2, hit.intensity);
      return;
    }

    if (item.type === "rung") {
      ctx.beginPath();
      ctx.moveTo(item.p1.px, item.p1.py);
      ctx.lineTo(item.p2.px, item.p2.py);
      const base = item.anomalous ? COLORS.will : COLORS.cyan;
      ctx.strokeStyle = hit.hit ? rgba(COLORS.gold, 0.5 + hit.intensity * 0.5) : rgba(base, item.anomalous ? 0.38 : 0.18 + z * 0.16);
      ctx.lineWidth = hit.hit ? 1.35 : item.anomalous ? 1.05 : 0.72;
      if (item.anomalous) ctx.setLineDash([2, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }

    if (item.type === "bead") {
      const r = (0.95 + z * 1.45) * item.p.scale;
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, r, 0, Math.PI * 2);
      if (hit.hit) {
        ctx.fillStyle = COLORS.white;
        ctx.shadowColor = COLORS.gold;
        ctx.shadowBlur = 8 + hit.intensity * 8;
      } else {
        const base = item.anomalous ? COLORS.will : COLORS.cyan;
        ctx.fillStyle = rgba(base, item.anomalous ? 0.72 : 0.26 + z * 0.68);
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      return;
    }

    if (item.type === "strand_node") {
      const color = item.axis === "vontade" ? COLORS.will : item.axis === "humanidade" ? COLORS.humanity : COLORS.cyan;
      if (item.ring && z > 0.14) {
        const ring = (4.1 + item.peak * 4.2) * item.p.scale;
        ctx.beginPath();
        ctx.arc(item.p.px, item.p.py, ring, 0, Math.PI * 2);
        ctx.strokeStyle = hit.hit ? COLORS.white : rgba(color, 0.55 + z * 0.42);
        ctx.lineWidth = 1.5 + z * 1.1;
        ctx.shadowColor = hit.hit ? COLORS.gold : color;
        ctx.shadowBlur = hit.hit ? 13 : 3 + z * 5;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(item.p.px, item.p.py, ring * 0.46, 0, Math.PI * 2);
        ctx.strokeStyle = hit.hit ? rgba(COLORS.gold, 0.9) : rgba(COLORS.cyanBright, 0.36 + z * 0.34);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, (1.25 + z * 1.8) * item.p.scale, 0, Math.PI * 2);
      ctx.fillStyle = hit.hit ? COLORS.white : rgba(COLORS.cyanBright, 0.38 + z * 0.58);
      ctx.fill();
      return;
    }

    if (item.type === "satellite") {
      const r = 3.3 * item.p.scale;
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, r, 0, Math.PI * 2);
      ctx.strokeStyle = hit.hit ? COLORS.gold : rgba(COLORS.cyan, 0.78);
      ctx.lineWidth = 1.3;
      ctx.stroke();
      return;
    }

    if (item.type === "twist") {
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, 4.0 * item.p.scale, 0, Math.PI * 2);
      ctx.strokeStyle = hit.hit ? COLORS.white : rgba(COLORS.cyanBright, 0.74);
      ctx.lineWidth = 1.2;
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
      const tailColor = this.metrics.predatoryMemory > 0.68 ? COLORS.will : COLORS.cyan;
      ctx.strokeStyle = hit.hit ? rgba(COLORS.gold, 0.94) : rgba(tailColor, (item.child ? 0.45 : 0.66) + item.energy * 0.20);
      ctx.lineWidth = item.width * (0.76 + z * 0.48);
      ctx.shadowColor = tailColor;
      ctx.shadowBlur = item.child ? 2 : 4 + item.energy * 3;
      ctx.stroke();
      ctx.shadowBlur = 0;
      return;
    }

    if (item.type === "tail_bead") {
      const tailColor = this.metrics.predatoryMemory > 0.68 ? COLORS.will : COLORS.cyanBright;
      ctx.beginPath();
      ctx.arc(item.p.px, item.p.py, (item.child ? 1.15 : 1.65) * item.p.scale, 0, Math.PI * 2);
      ctx.fillStyle = hit.hit ? COLORS.white : rgba(tailColor, 0.72 + z * 0.22);
      ctx.fill();
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
    const top = this.height * 0.12;
    const bottom = this.height * 0.90;

    ctx.strokeStyle = rgba(COLORS.goldSoft, 0.12);
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(laserX, top);
    ctx.lineTo(laserX, bottom);
    ctx.stroke();

    ctx.strokeStyle = rgba(COLORS.gold, 0.28);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(laserX, top);
    ctx.lineTo(laserX, bottom);
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, top, 0, bottom);
    grad.addColorStop(0, rgba(COLORS.gold, 0));
    grad.addColorStop(0.12, rgba(COLORS.gold, 0.78));
    grad.addColorStop(0.50, rgba(COLORS.white, 0.98));
    grad.addColorStop(0.88, rgba(COLORS.gold, 0.78));
    grad.addColorStop(1, rgba(COLORS.gold, 0));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = COLORS.gold;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(laserX, top);
    ctx.lineTo(laserX, bottom);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = rgba(COLORS.white, 0.95);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(laserX, top + 10);
    ctx.lineTo(laserX, bottom - 10);
    ctx.stroke();

    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(laserX - 7, top);
    ctx.lineTo(laserX + 7, top);
    ctx.moveTo(laserX - 7, bottom);
    ctx.lineTo(laserX + 7, bottom);
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
