const THRESHOLDS = [20, 40, 60, 80, 100];
const AXIS_KEYS = ["vontade", "comunhao", "humanidade"];

const PALETTE = Object.freeze({
  vontade: "#e85d48",
  comunhao: "#4ac8b7",
  humanidade: "#78abe1",
  neutral: "#a9e6df",
  amber: "#d7a45a"
});

function clamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, Math.round(number)));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

export function hashString(value) {
  let hash = 2166136261 >>> 0;
  const text = String(value ?? "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

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

function safeSeed(seed, fallback) {
  const number = Number(seed);
  if (Number.isInteger(number) && number > 0) return number >>> 0;
  return hashString(fallback || "K-03") || 1;
}

function normalizeValues(values = {}) {
  return {
    vontade: clamp(values.vontade),
    comunhao: clamp(values.comunhao),
    humanidade: clamp(values.humanidade)
  };
}

function isDormant(values) {
  return !values.vontade && !values.comunhao && !values.humanidade;
}

/**
 * Memória genética não é o estado atual. Ela conserva os extremos históricos
 * que já chegaram a se expressar estruturalmente no portador.
 */
export function normalizeGenomeState(genome, carrierId, values = {}) {
  const current = normalizeValues(values);
  const source = genome && typeof genome === "object" ? genome : {};
  const activated = typeof source.activated === "boolean" ? source.activated : !isDormant(current);
  const memory = source.memory && typeof source.memory === "object" ? source.memory : {};
  const initialHumanFloor = activated ? current.humanidade : 100;

  return {
    version: 1,
    seed: safeSeed(source.seed, carrierId || JSON.stringify(current)),
    activated,
    memory: {
      maxVontade: clamp(memory.maxVontade ?? current.vontade),
      maxComunhao: clamp(memory.maxComunhao ?? current.comunhao),
      minHumanidade: clamp(memory.minHumanidade ?? initialHumanFloor)
    },
    mutations: Array.isArray(source.mutations) ? source.mutations.slice(0, 120).map((entry) => ({
      id: String(entry?.id || `${hashString(JSON.stringify(entry))}`),
      axis: AXIS_KEYS.includes(entry?.axis) ? entry.axis : "vontade",
      threshold: clamp(entry?.threshold),
      direction: entry?.direction === "loss" ? "loss" : "gain",
      family: String(entry?.family || "structural"),
      timestamp: Number(entry?.timestamp) || 0,
      userId: String(entry?.userId || "")
    })) : []
  };
}

function mutationFamily(axis, threshold, seed) {
  const rng = mulberry32((seed ^ hashString(`${axis}:${threshold}`)) >>> 0);
  if (axis === "vontade") {
    return ["ramificação-predatória", "nó-invasivo", "espícula-cortical", "assimetria-dominante"][Math.floor(rng() * 4)];
  }
  if (axis === "comunhao") {
    return ["ponte-simbiótica", "malha-ressonante", "filamento-paralelo", "convergência-lateral"][Math.floor(rng() * 4)];
  }
  return ["desvio-identitário", "ruptura-de-locus", "base-anômala", "perda-de-simetria"][Math.floor(rng() * 4)];
}

/**
 * Atualiza apenas a memória genética permanente. Alterações visuais de estado
 * continuam sendo calculadas em tempo real pelos valores atuais.
 */
export function evolveGenomeState(existingGenome, {
  carrierId,
  previousValues = {},
  nextValues = {},
  now = Date.now(),
  userId = ""
} = {}) {
  const before = normalizeValues(previousValues);
  const after = normalizeValues(nextValues);
  const genome = normalizeGenomeState(existingGenome, carrierId, before);

  // Um registro criado em 0/0/0 é tratado como não inicializado. A primeira
  // leitura real estabelece a linha de base sem fingir mutações anteriores.
  if (!genome.activated && !isDormant(after)) {
    genome.activated = true;
    genome.memory.maxVontade = after.vontade;
    genome.memory.maxComunhao = after.comunhao;
    genome.memory.minHumanidade = after.humanidade;
    return genome;
  }

  if (!genome.activated) return genome;

  const oldMemory = { ...genome.memory };
  genome.memory.maxVontade = Math.max(oldMemory.maxVontade, after.vontade);
  genome.memory.maxComunhao = Math.max(oldMemory.maxComunhao, after.comunhao);
  genome.memory.minHumanidade = Math.min(oldMemory.minHumanidade, after.humanidade);

  const newEvents = [];
  for (const threshold of THRESHOLDS) {
    if (oldMemory.maxVontade < threshold && genome.memory.maxVontade >= threshold) {
      newEvents.push({ axis: "vontade", threshold, direction: "gain" });
    }
    if (oldMemory.maxComunhao < threshold && genome.memory.maxComunhao >= threshold) {
      newEvents.push({ axis: "comunhao", threshold, direction: "gain" });
    }
  }

  // Para Humanidade, a memória relevante é a menor integridade já atingida.
  // Cruzar 80 -> 79, por exemplo, abre uma família de desvio que não some
  // automaticamente quando a Humanidade volta a subir.
  for (const threshold of [80, 60, 40, 20, 0]) {
    if (oldMemory.minHumanidade > threshold && genome.memory.minHumanidade <= threshold) {
      newEvents.push({ axis: "humanidade", threshold, direction: "loss" });
    }
  }

  for (const event of newEvents) {
    const family = mutationFamily(event.axis, event.threshold, genome.seed);
    genome.mutations.unshift({
      id: `${event.axis}-${event.threshold}-${now}-${hashString(`${carrierId}:${family}:${now}`)}`,
      axis: event.axis,
      threshold: event.threshold,
      direction: event.direction,
      family,
      timestamp: now,
      userId
    });
  }
  genome.mutations.splice(120);
  return genome;
}

export function getGenomeMetrics(carrier) {
  const current = normalizeValues(carrier?.values || {});
  const genome = normalizeGenomeState(carrier?.genome, carrier?.id || carrier?.name, current);
  const memory = genome.memory;
  const dormant = !genome.activated && isDormant(current);

  const predatoryMemory = memory.maxVontade / 100;
  const symbioticMemory = memory.maxComunhao / 100;
  const identityDeviation = (100 - memory.minHumanidade) / 100;
  const will = current.vontade / 100;
  const communion = current.comunhao / 100;
  const humanity = current.humanidade / 100;
  const antagonism = Math.abs(current.vontade - current.humanidade) / 100;
  const alienSynergy = predatoryMemory * symbioticMemory * (0.45 + identityDeviation * 0.55);

  const mutationLoad = dormant ? 0 : clamp(
    predatoryMemory * 34 +
    identityDeviation * 31 +
    symbioticMemory * 17 +
    alienSynergy * 18
  );
  const divergence = dormant ? 0 : clamp(
    predatoryMemory * 43 + identityDeviation * 44 + alienSynergy * 23 - symbioticMemory * 8
  );
  const coherence = dormant ? 0 : clamp(
    22 + communion * 46 + humanity * 38 - will * 18 - antagonism * 12
  );
  const complexity = dormant ? 8 : clamp(
    18 + predatoryMemory * 28 + symbioticMemory * 34 + identityDeviation * 25 + alienSynergy * 22
  );
  const stability = dormant ? 0 : clamp(
    humanity * 50 + communion * 38 + (1 - will) * 12 - antagonism * 8
  );

  const branchCount = dormant ? 0 : Math.round(predatoryMemory ** 1.45 * 8 + identityDeviation ** 1.7 * 5);
  const latticeCount = dormant ? 0 : Math.round(symbioticMemory ** 1.35 * 8 + alienSynergy * 4);
  const fractureCount = dormant ? 0 : Math.round(identityDeviation * 4 + predatoryMemory * (1 - symbioticMemory) * 3);
  const nodeCount = dormant ? 0 : Math.round(predatoryMemory * 3 + identityDeviation * 3 + alienSynergy * 2);
  const anomalousPairs = dormant ? 0 : Math.round((predatoryMemory * 3 + identityDeviation * 5 + symbioticMemory * 2));
  const extraStrand = dormant ? 0 : Math.max(0, Math.min(1, (communion - 0.58) * 1.7 + (predatoryMemory - 0.58) * 0.8 + identityDeviation * 0.32));

  return {
    genome,
    current,
    dormant,
    mutationLoad,
    divergence,
    coherence,
    complexity,
    stability,
    branchCount,
    latticeCount,
    fractureCount,
    nodeCount,
    anomalousPairs,
    extraStrand,
    predatoryMemory,
    symbioticMemory,
    identityDeviation,
    will,
    communion,
    humanity,
    alienSynergy,
    antagonism
  };
}

function genomeCode(seed) {
  const a = (seed >>> 0).toString(16).toUpperCase().padStart(8, "0");
  const b = hashString(`K03:${seed}`).toString(16).toUpperCase().padStart(8, "0");
  return `${a.slice(0, 4)}-${a.slice(4)}-${b.slice(0, 4)}`;
}

function locusSequence(seed, length = 48) {
  const rng = mulberry32(seed ^ 0xB10C0DE);
  const bases = ["A", "T", "C", "G"];
  let output = "";
  for (let index = 0; index < length; index += 1) output += bases[Math.floor(rng() * bases.length)];
  return output;
}

function takeUniqueSlots(count, total, rng, { start = 2, end = total - 3 } = {}) {
  const slots = new Set();
  let guard = 0;
  while (slots.size < Math.min(count, Math.max(0, end - start + 1)) && guard < 500) {
    slots.add(start + Math.floor(rng() * (end - start + 1)));
    guard += 1;
  }
  return [...slots].sort((a, b) => a - b);
}

function helixGeometry(metrics) {
  const rng = mulberry32(metrics.genome.seed ^ 0x51F15EED);
  const phase = rng() * Math.PI * 2;
  const phase2 = rng() * Math.PI * 2;
  const phase3 = rng() * Math.PI * 2;
  const seedShape = rng();
  const center = 230;
  const amplitudeBase = metrics.dormant
    ? 112 + seedShape * 14
    : 116 + seedShape * 18 + metrics.predatoryMemory * 25 + metrics.identityDeviation * 28 + metrics.communion * 10;
  const cycles = 4.15 + rng() * 1.05 + metrics.symbioticMemory * 0.55 + metrics.predatoryMemory * 0.28;
  const warp = metrics.dormant ? 2.5 : metrics.identityDeviation * 27 + metrics.predatoryMemory * 17 - metrics.communion * 4;
  const asymmetry = metrics.dormant ? 0 : metrics.identityDeviation * 25 + metrics.predatoryMemory * (1 - metrics.humanity) * 20;
  const x0 = 62;
  const x1 = 1338;

  // Hotspots seeded per carrier make the same Kaiju mutate in recognizable regions.
  const hotspots = Array.from({ length: 4 }, (_, index) => ({
    t: 0.12 + rng() * 0.76,
    width: 0.055 + rng() * 0.09,
    sign: index % 2 ? -1 : 1,
    force: 0.45 + rng() * 0.75
  }));

  const hotspotField = (t) => hotspots.reduce((sum, spot) => {
    const d = (t - spot.t) / spot.width;
    return sum + Math.exp(-(d * d)) * spot.force * spot.sign;
  }, 0);

  const point = (t, strand = 1) => {
    const x = x0 + (x1 - x0) * t;
    const angle = phase + t * Math.PI * 2 * cycles;
    const local = hotspotField(t);
    const envelope = 1 + local * (0.03 + metrics.identityDeviation * 0.09 + metrics.predatoryMemory * 0.055);
    const amplitude = amplitudeBase * envelope;
    const primary = Math.sin(angle) * amplitude;
    const harmonic = Math.sin(angle * 0.52 + phase2) * warp * 0.54 + Math.sin(angle * 1.69 + phase3) * warp * 0.26;
    const drift = Math.sin(t * Math.PI * 2 * (1.15 + seedShape) + phase3) * asymmetry;
    const alien = local * (metrics.identityDeviation * 22 + metrics.alienSynergy * 24);
    const phaseBreak = strand === 2 ? Math.sin(angle * 0.73 + phase2) * metrics.identityDeviation * 15 : 0;
    const y = strand === 1
      ? center + primary + harmonic + drift * 0.42 + alien
      : center - primary + harmonic * (0.24 + metrics.humanity * 0.38) - drift - alien * 0.72 + phaseBreak;
    return { x, y, angle, local };
  };

  return { point, center, amplitude: amplitudeBase, cycles, x0, x1, hotspots };
}

function pathFromPoints(points) {
  if (!points.length) return "";
  return points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function renderGenomeSVG(carrier, metrics) {
  const seed = metrics.genome.seed;
  const rng = mulberry32(seed ^ 0xD0A5EED);
  const geometry = helixGeometry(metrics);
  const samples = 280;
  const strandA = [];
  const strandB = [];
  const thirdStrand = [];

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    strandA.push(geometry.point(t, 1));
    strandB.push(geometry.point(t, 2));
    if (metrics.extraStrand > 0.02) {
      const a = geometry.point(t, 1);
      const b = geometry.point(t, 2);
      const offset = Math.sin(t * Math.PI * 2 * (geometry.cycles + 0.66) + 1.4) * (25 + 42 * metrics.extraStrand);
      thirdStrand.push({ x: a.x, y: (a.y + b.y) / 2 + offset });
    }
  }

  const bridgeTotal = 76 + Math.round(metrics.symbioticMemory * 24);
  const fractureSlots = new Set(takeUniqueSlots(metrics.fractureCount * 2, bridgeTotal, rng, { start: 4, end: bridgeTotal - 5 }));
  const anomalySlots = new Set(takeUniqueSlots(metrics.anomalousPairs * 2, bridgeTotal, rng, { start: 3, end: bridgeTotal - 4 }));
  const bridgePairs = [["A", "T"], ["T", "A"], ["C", "G"], ["G", "C"]];
  const bridges = [];
  const labels = [];

  for (let index = 0; index < bridgeTotal; index += 1) {
    const t = (index + 0.5) / bridgeTotal;
    const a = geometry.point(t, 1);
    const b = geometry.point(t, 2);
    const pair = bridgePairs[Math.floor(rng() * bridgePairs.length)];
    const anomalous = anomalySlots.has(index);
    const fractured = fractureSlots.has(index);
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    if (!fractured) {
      const color = anomalous ? (rng() > 0.48 ? PALETTE.vontade : PALETTE.amber) : (index % 6 === 0 ? "#79d5d2" : "#4b7880");
      const opacity = anomalous ? 0.9 : (0.28 + rng() * 0.34).toFixed(2);
      const width = anomalous ? 3.1 : 1.5 + metrics.complexity * 0.008;
      bridges.push(`<path class="kj-genome-basepair" style="--kj-i:${index};animation-delay:${(-index * 0.055).toFixed(2)}s" d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}" stroke="${color}" stroke-width="${width.toFixed(2)}" opacity="${opacity}"/>`);
      if (anomalous && labels.length < 4) {
        const side = midX > 1100 ? -1 : 1;
        labels.push(`<g class="kj-genome-anomaly-label"><circle cx="${midX.toFixed(1)}" cy="${midY.toFixed(1)}" r="4" fill="${color}"/><path d="M${(midX + side * 7).toFixed(1)} ${midY.toFixed(1)} h${side * 38}" stroke="${color}" opacity=".72"/><text x="${(midX + side * 49).toFixed(1)}" y="${(midY + 3).toFixed(1)}" text-anchor="${side < 0 ? "end" : "start"}" fill="${color}">PAIR ${escapeHTML(pair.join("/"))} // Δ</text></g>`);
      }
    } else {
      bridges.push(`<g class="kj-genome-fracture"><path d="M${(midX - 10).toFixed(1)} ${(midY - 10).toFixed(1)} l20 20 M${(midX + 10).toFixed(1)} ${(midY - 10).toFixed(1)} l-20 20" stroke="${PALETTE.vontade}" stroke-width="1.8"/><circle cx="${midX.toFixed(1)}" cy="${midY.toFixed(1)}" r="15" fill="none" stroke="${PALETTE.vontade}" stroke-dasharray="3 7" opacity=".52"/></g>`);
    }
  }

  const branchSlots = takeUniqueSlots(metrics.branchCount * 2, 44, rng, { start: 2, end: 41 });
  const branches = branchSlots.map((slot, index) => {
    const t = slot / 44;
    const strand = rng() > 0.42 ? 1 : 2;
    const p = geometry.point(t, strand);
    const upward = p.y < geometry.center ? -1 : 1;
    const length = 36 + rng() * 82 + metrics.predatoryMemory * 58;
    const lateral = (rng() - 0.5) * 92;
    const color = index % 4 === 0 && metrics.identityDeviation > 0.4 ? PALETTE.amber : PALETTE.vontade;
    const ex = Math.max(32, Math.min(1368, p.x + lateral));
    const ey = Math.max(34, Math.min(426, p.y + upward * length));
    const curve = (rng() - 0.5) * (46 + metrics.predatoryMemory * 44);
    const c1x = p.x + lateral * 0.18 + curve;
    const c1y = p.y + (ey - p.y) * 0.34;
    const c2x = ex - lateral * 0.18 - curve * 0.42;
    const c2y = p.y + (ey - p.y) * 0.72;
    const fork = metrics.predatoryMemory > 0.68 && index % 3 === 0
      ? `<path d="M${(ex - (ex-p.x)*0.18).toFixed(1)} ${(ey - (ey-p.y)*0.15).toFixed(1)} q${(18 + rng()*26).toFixed(1)} ${(-upward*(16+rng()*24)).toFixed(1)} ${(30+rng()*34).toFixed(1)} ${(-upward*(24+rng()*35)).toFixed(1)}" fill="none" stroke="${color}" stroke-width="${(1.0 + metrics.predatoryMemory * 1.25).toFixed(2)}" opacity=".62"/>`
      : "";
    return `<g class="kj-genome-branch" style="animation-delay:${(-index * 0.27).toFixed(2)}s" opacity="${(0.38 + metrics.predatoryMemory * 0.38).toFixed(2)}"><path d="M${p.x.toFixed(1)} ${p.y.toFixed(1)} C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${(1.35 + metrics.predatoryMemory * 1.9).toFixed(2)}"/>${fork}<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="${(2.5 + metrics.predatoryMemory * 3.1).toFixed(1)}" fill="${color}"/><circle class="kj-genome-node-pulse" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="11" fill="none" stroke="${color}"/></g>`;
  }).join("");

  const latticeSlots = takeUniqueSlots(metrics.latticeCount * 2, 38, rng, { start: 2, end: 35 });
  const lattice = latticeSlots.map((slot, index) => {
    const t1 = slot / 38;
    const t2 = Math.min(0.98, t1 + 0.04 + rng() * 0.075);
    const a = geometry.point(t1, index % 2 ? 1 : 2);
    const b = geometry.point(t2, index % 2 ? 2 : 1);
    const bend = 26 + rng() * 46 + metrics.symbioticMemory * 34;
    return `<path class="kj-genome-lattice" style="animation-delay:${(-index * 0.19).toFixed(2)}s" d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${((a.x + b.x) / 2).toFixed(1)} ${(((a.y + b.y) / 2) + (index % 2 ? -bend : bend)).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}" fill="none" stroke="${PALETTE.comunhao}" stroke-width="${(1.1 + metrics.symbioticMemory * 1.8).toFixed(2)}" opacity="${(0.22 + metrics.symbioticMemory * 0.5).toFixed(2)}"/>`;
  }).join("");

  const nodeSlots = takeUniqueSlots(metrics.nodeCount * 2, 34, rng, { start: 2, end: 31 });
  const nodes = nodeSlots.map((slot, index) => {
    const t = slot / 34;
    const p = geometry.point(t, index % 2 ? 1 : 2);
    const size = 5 + metrics.identityDeviation * 8 + rng() * 5;
    const color = index % 3 === 0 ? PALETTE.vontade : (index % 3 === 1 ? PALETTE.amber : PALETTE.comunhao);
    return `<g class="kj-genome-node"><path d="M${p.x.toFixed(1)} ${(p.y - size).toFixed(1)} L${(p.x + size).toFixed(1)} ${p.y.toFixed(1)} L${p.x.toFixed(1)} ${(p.y + size).toFixed(1)} L${(p.x - size).toFixed(1)} ${p.y.toFixed(1)} Z" fill="#071014" stroke="${color}" stroke-width="1.6"/><circle class="kj-genome-node-pulse" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(size + 9).toFixed(1)}" fill="none" stroke="${color}"/></g>`;
  }).join("");

  // Data-web around the helix: inspired by analytic node meshes rather than decoration.
  const webCount = metrics.dormant ? 22 : 42 + Math.round(metrics.complexity * 0.38);
  const webNodes = Array.from({ length: webCount }, (_, index) => {
    const t = (index + 0.5) / webCount;
    const p = geometry.point(t, index % 2 ? 1 : 2);
    const distance = 45 + rng() * (70 + metrics.complexity * 0.75);
    const dir = index % 2 ? -1 : 1;
    return { x: p.x + (rng() - 0.5) * 72, y: p.y + dir * distance, r: 1 + rng() * 1.8 };
  });
  const webLines = webNodes.map((n, index) => {
    const n2 = webNodes[(index + 1) % webNodes.length];
    const n3 = webNodes[(index + 3) % webNodes.length];
    return `<path d="M${n.x.toFixed(1)} ${n.y.toFixed(1)}L${n2.x.toFixed(1)} ${n2.y.toFixed(1)}M${n.x.toFixed(1)} ${n.y.toFixed(1)}L${n3.x.toFixed(1)} ${n3.y.toFixed(1)}"/>`;
  }).join("");
  const webDots = webNodes.map((n, index) => `<circle class="kj-genome-web-dot" style="animation-delay:${(-index * 0.13).toFixed(2)}s" cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${n.r.toFixed(1)}"/>`).join("");

  const particleCount = metrics.dormant ? 52 : 100 + Math.round(metrics.complexity * 0.72);
  const particles = Array.from({ length: particleCount }, (_, index) => {
    const t = rng();
    const strand = rng() > 0.5 ? 1 : 2;
    const p = geometry.point(t, strand);
    const spread = 28 + metrics.complexity * 1.22;
    const x = p.x + (rng() - 0.5) * spread;
    const y = p.y + (rng() - 0.5) * spread;
    const dy = 4 + rng() * 18;
    const r = 0.7 + rng() * (index % 9 === 0 ? 2.7 : 1.45);
    const color = index % 13 === 0 ? PALETTE.vontade : index % 7 === 0 ? PALETTE.comunhao : index % 19 === 0 ? PALETTE.amber : "#7ab2b8";
    const dur = 3.2 + rng() * 6.8;
    return `<circle class="kj-genome-dust" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${(0.12 + rng() * 0.56).toFixed(2)}"><animate attributeName="cy" values="${y.toFixed(1)};${(y-dy).toFixed(1)};${y.toFixed(1)}" dur="${dur.toFixed(2)}s" begin="${(-rng()*dur).toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".12;.76;.18" dur="${(dur*0.78).toFixed(2)}s" begin="${(-rng()*dur).toFixed(2)}s" repeatCount="indefinite"/></circle>`;
  }).join("");

  const third = metrics.extraStrand > 0.02
    ? `<path class="kj-genome-third" d="${pathFromPoints(thirdStrand)}" fill="none" stroke="${PALETTE.comunhao}" stroke-width="${(1.2 + metrics.extraStrand * 3.3).toFixed(2)}" opacity="${(0.12 + metrics.extraStrand * 0.58).toFixed(2)}" stroke-dasharray="9 13"/>`
    : "";

  const stabilizers = metrics.humanity > 0.48
    ? Array.from({ length: Math.round(5 + metrics.humanity * 8) }, (_, index) => {
        const t = (index + 1) / (6 + Math.round(metrics.humanity * 8));
        const a = geometry.point(t, 1);
        const b = geometry.point(t, 2);
        const y = (a.y + b.y) / 2;
        return `<path d="M${(a.x - 18).toFixed(1)} ${y.toFixed(1)} h36" stroke="${PALETTE.humanidade}" stroke-width="1.25" opacity="${(0.11 + metrics.humanity * 0.32).toFixed(2)}"/><circle cx="${a.x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="${PALETTE.humanidade}" opacity=".68"/>`;
      }).join("")
    : "";

  const id = `kjg-${String(carrier?.id || seed).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20)}-${seed}`;
  const dormantOverlay = metrics.dormant ? `<g opacity=".8"><rect x="500" y="196" width="400" height="66" fill="#050b0f" stroke="#38545b"/><text x="700" y="220" fill="#7eb2b3" text-anchor="middle" font-family="monospace" font-size="13" letter-spacing="3">ASSINATURA NÃO ATIVADA</text><text x="700" y="244" fill="#4c6d72" text-anchor="middle" font-family="monospace" font-size="9">AGUARDANDO PRIMEIRA LEITURA DA TRÍADE</text></g>` : "";

  const tracer = (pathId, color, begin) => `<circle r="4.4" fill="${color}" filter="url(#${id}-hotglow)"><animateMotion dur="6.8s" begin="${begin}s" repeatCount="indefinite" rotate="auto"><mpath href="#${pathId}"/></animateMotion><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.82;1" dur="6.8s" begin="${begin}s" repeatCount="indefinite"/></circle>`;

  return `<svg class="kj-genome-svg" viewBox="0 0 1400 460" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Assinatura genética procedural do portador">
    <defs>
      <linearGradient id="${id}-strand-a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4e8e9a"/><stop offset=".18" stop-color="#9ddbd9"/><stop offset=".42" stop-color="#d9ffff"/><stop offset=".66" stop-color="#7ce0d0"/><stop offset=".84" stop-color="#b9edf0"/><stop offset="1" stop-color="#6192b0"/></linearGradient>
      <linearGradient id="${id}-strand-b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#527f99"/><stop offset=".22" stop-color="#71c0c2"/><stop offset=".48" stop-color="#e2ffff"/><stop offset=".72" stop-color="#72c8bf"/><stop offset="1" stop-color="#668fa8"/></linearGradient>
      <linearGradient id="${id}-scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PALETTE.comunhao}" stop-opacity="0"/><stop offset=".75" stop-color="${PALETTE.comunhao}" stop-opacity=".08"/><stop offset="1" stop-color="${PALETTE.comunhao}" stop-opacity=".72"/></linearGradient>
      <filter id="${id}-glow" x="-55%" y="-55%" width="210%" height="210%"><feGaussianBlur stdDeviation="6.5" result="b"><animate attributeName="stdDeviation" values="4.8;7.2;4.8" dur="4.6s" repeatCount="indefinite"/></feGaussianBlur><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="${id}-hotglow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="${id}-ghost" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="13"/></filter>
      <pattern id="${id}-grid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0V34" fill="none" stroke="#4f7d83" stroke-width=".7" opacity=".10"/><circle cx="1" cy="1" r=".8" fill="#79c895" opacity=".17"/></pattern>
    </defs>
    <rect width="1400" height="460" fill="#03080b"/>
    <rect width="1400" height="460" fill="url(#${id}-grid)"/>
    <g class="kj-genome-background-wave" fill="none" stroke="#45636b" opacity=".18"><path d="M0 86C150 50 260 108 390 78S650 54 790 90 1080 45 1400 82"/><path d="M0 372C180 330 290 397 455 360S740 350 900 382 1180 340 1400 365"/><path d="M0 50H1400M0 410H1400" stroke-dasharray="3 10"/></g>
    <g class="kj-genome-web" fill="none" stroke="#5f8f96" stroke-width=".75" opacity="${(0.12 + metrics.complexity * 0.0022).toFixed(2)}">${webLines}</g>
    <g fill="#78afb4" opacity=".55">${webDots}</g>
    <g class="kj-genome-scan"><rect x="0" y="-42" width="1400" height="42" fill="url(#${id}-scan)"/><rect x="0" y="0" width="1400" height="1.5" fill="${PALETTE.comunhao}" opacity=".66"/></g>
    ${particles}
    <g class="kj-genome-live">
      <path d="${pathFromPoints(strandA)}" fill="none" stroke="#79e1df" stroke-width="18" opacity=".12" filter="url(#${id}-ghost)"/>
      <path d="${pathFromPoints(strandB)}" fill="none" stroke="#87cbdf" stroke-width="18" opacity=".10" filter="url(#${id}-ghost)"/>
      <g class="kj-genome-bridges">${bridges.join("")}</g>
      ${lattice}
      ${stabilizers}
      <path id="${id}-path-a" class="kj-genome-strand kj-genome-strand-a" d="${pathFromPoints(strandA)}" fill="none" stroke="url(#${id}-strand-a)" stroke-width="${(5.3 + metrics.complexity * 0.028).toFixed(2)}" filter="url(#${id}-glow)"/>
      <path id="${id}-path-b" class="kj-genome-strand kj-genome-strand-b" d="${pathFromPoints(strandB)}" fill="none" stroke="url(#${id}-strand-b)" stroke-width="${(5.0 + metrics.complexity * 0.026).toFixed(2)}" filter="url(#${id}-glow)"/>
      <path class="kj-genome-trace" d="${pathFromPoints(strandA)}" fill="none" stroke="#efffff" stroke-width="1.25" opacity=".84" stroke-dasharray="6 17"/>
      <path class="kj-genome-trace kj-genome-trace-reverse" d="${pathFromPoints(strandB)}" fill="none" stroke="#dcf8ff" stroke-width="1.05" opacity=".7" stroke-dasharray="5 19"/>
      ${third}
      ${branches}
      ${nodes}
      ${labels.join("")}
      ${tracer(`${id}-path-a`, "#dfffff", 0)}
      ${tracer(`${id}-path-b`, metrics.predatoryMemory > .62 ? PALETTE.vontade : "#9df4e7", -3.4)}
    </g>
    ${dormantOverlay}
    <g class="kj-genome-frame" fill="none" stroke="#52767d" opacity=".52"><path d="M14 36V14H112M1386 36V14H1288M14 424v22h98M1386 424v22h-98"/><path d="M28 67h52M1320 67h52M28 393h52M1320 393h52" stroke-dasharray="8 5"/></g>
    <g class="kj-genome-coordinates" fill="#66858b" font-family="monospace" font-size="8"><text x="28" y="30">0x00</text><text x="1320" y="30">0xFF</text><text x="28" y="443">K-03 // LIVE GENOME ARRAY</text><text x="1160" y="443">SEED ${escapeHTML(genomeCode(seed))}</text></g>
  </svg>`;
}

function miniAxisBar(label, value, color, suffix = "%") {
  return `<div class="kj-genome-mini-axis" style="--kj-genome-axis:${color};--kj-genome-value:${clamp(value)}%"><span>${escapeHTML(label)}</span><div><i></i></div><strong>${clamp(value)}${suffix}</strong></div>`;
}

function metricCell(label, value, color = "#a9e6df", hint = "") {
  return `<div class="kj-genome-stat" style="--kj-genome-stat:${color}"><small>${escapeHTML(label)}</small><strong>${escapeHTML(value)}</strong>${hint ? `<span>${escapeHTML(hint)}</span>` : ""}</div>`;
}

function renderLocusStrip(metrics) {
  const rng = mulberry32(metrics.genome.seed ^ 0x10C05);
  const labels = ["A-01", "A-02", "B-11", "C-04", "D-09", "K-03"];
  return `<div class="kj-genome-loci">${labels.map((label, index) => {
    const width = 160;
    const height = 58;
    const points = [];
    const bias = (metrics.complexity / 100) * 10 + index * 0.85;
    for (let point = 0; point < 30; point += 1) {
      const x = point * (width / 29);
      const wave = Math.sin(point * (0.58 + rng() * 0.045) + rng() * 3) * (4 + bias * 0.36);
      const jitter = (rng() - 0.5) * (2.8 + metrics.divergence * 0.038);
      const y = height / 2 + wave + jitter;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    const color = index % 3 === 0 ? PALETTE.vontade : index % 3 === 1 ? PALETTE.comunhao : PALETTE.humanidade;
    return `<div class="kj-genome-locus"><header><span>LOCUS ${label}</span><strong>${String(Math.round((rng() * 0.35 + metrics.mutationLoad / 130) * 99)).padStart(2, "0")}</strong></header><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path d="M0 ${height/2}H${width}" stroke="#2a4248"/><polyline class="kj-locus-wave" points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="1.5" opacity=".84"/><g fill="#668b90" opacity=".55">${Array.from({length:9},(_,i)=>`<circle cx="${(i*19+4)}" cy="${(height-5-rng()*13).toFixed(1)}" r="1.2"/>`).join("")}</g></svg></div>`;
  }).join("")}</div>`;
}

export function renderGenomePanel(carrier, { detailed = false } = {}) {
  const metrics = getGenomeMetrics(carrier);
  const sequence = locusSequence(metrics.genome.seed, detailed ? 88 : 64);
  const mutationCount = metrics.genome.mutations.length;
  const memory = metrics.genome.memory;

  const left = `<aside class="kj-genome-side kj-genome-side-left">
    <div class="kj-genome-id"><small>GENOME SIGNATURE</small><strong>${escapeHTML(genomeCode(metrics.genome.seed))}</strong><span>${metrics.dormant ? "DORMANT / UNRESOLVED" : "LIVE / TRACKED"}</span></div>
    <div class="kj-genome-side-block"><small>EXPRESSÃO ATUAL</small>${miniAxisBar("Vontade", metrics.current.vontade, PALETTE.vontade)}${miniAxisBar("Comunhão", metrics.current.comunhao, PALETTE.comunhao)}${miniAxisBar("Humanidade", metrics.current.humanidade, PALETTE.humanidade)}</div>
    <div class="kj-genome-side-block"><small>MEMÓRIA ESTRUTURAL</small><div class="kj-genome-memory"><span>V-PICO <b>${memory.maxVontade}</b></span><span>C-PICO <b>${memory.maxComunhao}</b></span><span>H-PISO <b>${memory.minHumanidade}</b></span></div></div>
    <div class="kj-genome-side-block kj-genome-signals"><small>SINAIS</small><span><i></i>HELIX-LINK</span><span><i></i>PAIR-SCAN</span><span><i></i>MUT-MESH</span></div>
  </aside>`;

  const ribbon = `<div class="kj-genome-metric-ribbon">
    ${metricCell("Divergência", `${metrics.divergence}%`, PALETTE.vontade, "desvio acumulado")}
    ${metricCell("Coerência", `${metrics.coherence}%`, PALETTE.comunhao, "organização atual")}
    ${metricCell("Complexidade", `${metrics.complexity}%`, PALETTE.amber, "arquitetura")}
    ${metricCell("Integridade", `${metrics.stability}%`, PALETTE.humanidade, "estabilidade")}
    ${metricCell("Mutações", `${mutationCount}`, "#b9ccd0", "marcos persistentes")}
  </div>`;

  const center = `<div class="kj-genome-core">
    <header class="kj-genome-core-head"><span><i class="fa-solid fa-dna"></i><b>ANÁLISE GENÔMICA // ASSINATURA SIMBIÓTICA</b></span><small>${metrics.dormant ? "NO ACTIVE SAMPLE" : `LOAD ${metrics.mutationLoad.toString().padStart(3,"0")} // BR ${metrics.branchCount.toString().padStart(2,"0")} // LT ${metrics.latticeCount.toString().padStart(2,"0")} // Δ ${metrics.divergence.toString().padStart(3,"0")}`}</small></header>
    ${ribbon}
    <div class="kj-genome-viewport">${renderGenomeSVG(carrier, metrics)}<div class="kj-genome-viewport-caption"><span>LIVE MOLECULAR ARRAY</span><b>${metrics.dormant ? "WAITING" : "TRACKING"}</b></div></div>
    <div class="kj-genome-sequence"><span>SEQ</span><code>${escapeHTML(sequence.match(/.{1,4}/g)?.join(" ") || sequence)}</code></div>
  </div>`;

  const loci = detailed ? renderLocusStrip(metrics) : "";
  return `<section class="kj-genome-panel ${detailed ? "is-detailed" : ""}" data-genome-seed="${metrics.genome.seed}" data-genome-load="${metrics.mutationLoad}">
    <div class="kj-genome-grid">${left}${center}</div>${loci}
  </section>`;
}

function mutationLabel(entry) {
  if (entry.axis === "vontade") return `Vontade atingiu ${entry.threshold}%`;
  if (entry.axis === "comunhao") return `Comunhão atingiu ${entry.threshold}%`;
  return `Humanidade caiu até ${entry.threshold}%`;
}

export function renderGenomeDetail(carrier) {
  const metrics = getGenomeMetrics(carrier);
  const mutations = metrics.genome.mutations;
  const registry = mutations.length
    ? `<div class="kj-genome-mutation-list">${mutations.slice(0, 24).map((entry, index) => {
        const color = PALETTE[entry.axis] || PALETTE.neutral;
        const date = entry.timestamp ? new Date(entry.timestamp).toLocaleString("pt-BR") : "Registro legado";
        return `<article style="--kj-genome-event:${color}"><span class="kj-genome-event-code">M-${String(mutations.length - index).padStart(3, "0")}</span><div><small>${escapeHTML(entry.family.replaceAll("-", " "))}</small><strong>${escapeHTML(mutationLabel(entry))}</strong><span>${escapeHTML(date)}</span></div></article>`;
      }).join("")}</div>`
    : `<div class="kj-genome-no-events"><i class="fa-solid fa-dna"></i><strong>Nenhum marco permanente registrado</strong><span>A assinatura ainda não cruzou um limiar genético depois de sua linha de base.</span></div>`;

  return `${renderGenomePanel(carrier, { detailed: true })}<section class="kj-genome-analysis-grid">
    <article class="kj-genome-analysis-card"><header><i class="fa-solid fa-code-branch"></i><div><small>MORFOLOGIA</small><strong>Estruturas derivadas</strong></div></header><div class="kj-genome-derived-grid">${metricCell("Ramificações", String(metrics.branchCount), PALETTE.vontade)}${metricCell("Malhas", String(metrics.latticeCount), PALETTE.comunhao)}${metricCell("Rupturas", String(metrics.fractureCount), PALETTE.vontade)}${metricCell("Nós", String(metrics.nodeCount), PALETTE.amber)}${metricCell("Pares Δ", String(metrics.anomalousPairs), PALETTE.amber)}${metricCell("Fita extra", `${Math.round(metrics.extraStrand * 100)}%`, PALETTE.comunhao)}</div></article>
    <article class="kj-genome-analysis-card"><header><i class="fa-solid fa-timeline"></i><div><small>GENETIC MEMORY</small><strong>Registro de mutações</strong></div></header>${registry}</article>
  </section>`;
}
