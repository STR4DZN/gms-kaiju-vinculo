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
  const center = 164;
  const amplitude = metrics.dormant
    ? 48 + seedShape * 8
    : 52 + seedShape * 10 + metrics.predatoryMemory * 14 + metrics.identityDeviation * 12 + metrics.communion * 6;
  const cycles = 4.75 + rng() * 1.25 + metrics.symbioticMemory * 0.35 + metrics.predatoryMemory * 0.22;
  const warp = metrics.dormant ? 1.4 : metrics.identityDeviation * 13 + metrics.predatoryMemory * 7 - metrics.communion * 2.5;
  const asymmetry = metrics.dormant ? 0 : metrics.identityDeviation * 10 + metrics.predatoryMemory * (1 - metrics.humanity) * 7;
  const x0 = 35;
  const x1 = 1165;

  const point = (t, strand = 1) => {
    const x = x0 + (x1 - x0) * t;
    const angle = phase + t * Math.PI * 2 * cycles;
    const primary = Math.sin(angle) * amplitude;
    const micro = Math.sin(angle * 0.47 + phase2) * warp * 0.62 + Math.sin(angle * 1.73 + phase3) * warp * 0.24;
    const drift = Math.sin(t * Math.PI * 2 * (1.3 + seedShape) + phase3) * asymmetry;
    const y = strand === 1
      ? center + primary + micro + drift * 0.45
      : center - primary + micro * (0.34 + metrics.humanity * 0.38) - drift;
    return { x, y, angle };
  };

  return { point, center, amplitude, cycles, x0, x1 };
}

function pathFromPoints(points) {
  if (!points.length) return "";
  return points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function renderGenomeSVG(carrier, metrics) {
  const seed = metrics.genome.seed;
  const rng = mulberry32(seed ^ 0xD0A5EED);
  const geometry = helixGeometry(metrics);
  const samples = 190;
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
      const offset = Math.sin(t * Math.PI * 2 * (geometry.cycles + 0.5) + 1.4) * (15 + 20 * metrics.extraStrand);
      thirdStrand.push({ x: a.x, y: (a.y + b.y) / 2 + offset });
    }
  }

  const bridgeTotal = 54 + Math.round(metrics.symbioticMemory * 12);
  const fractureSlots = new Set(takeUniqueSlots(metrics.fractureCount, bridgeTotal, rng, { start: 3, end: bridgeTotal - 4 }));
  const anomalySlots = new Set(takeUniqueSlots(metrics.anomalousPairs, bridgeTotal, rng, { start: 2, end: bridgeTotal - 3 }));
  const bridgePairs = [
    ["A", "T"], ["T", "A"], ["C", "G"], ["G", "C"]
  ];

  const bridges = [];
  const labels = [];
  for (let index = 0; index < bridgeTotal; index += 1) {
    const t = (index + 0.55) / bridgeTotal;
    const a = geometry.point(t, 1);
    const b = geometry.point(t, 2);
    const pair = bridgePairs[Math.floor(rng() * bridgePairs.length)];
    const anomalous = anomalySlots.has(index);
    const fractured = fractureSlots.has(index);
    if (!fractured) {
      const color = anomalous
        ? (rng() > 0.52 ? PALETTE.vontade : PALETTE.amber)
        : (index % 4 === 0 ? "#6ca8b0" : "#476f78");
      const opacity = anomalous ? 0.88 : (0.34 + rng() * 0.2).toFixed(2);
      bridges.push(`<path d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}" stroke="${color}" stroke-width="${anomalous ? 2.2 : 1.15}" opacity="${opacity}"/>`);
      if (anomalous && labels.length < 5) {
        const y = (a.y + b.y) / 2;
        labels.push(`<g class="kj-genome-anomaly-label"><circle cx="${a.x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${color}"/><path d="M${(a.x + 4).toFixed(1)} ${y.toFixed(1)} h24" stroke="${color}" opacity=".65"/><text x="${(a.x + 31).toFixed(1)}" y="${(y + 3).toFixed(1)}" fill="${color}">PAIR ${escapeHTML(pair.join("/"))} // Δ</text></g>`);
      }
    } else {
      const y = (a.y + b.y) / 2;
      bridges.push(`<g opacity=".9"><path d="M${(a.x - 7).toFixed(1)} ${(y - 7).toFixed(1)} l14 14 M${(a.x + 7).toFixed(1)} ${(y - 7).toFixed(1)} l-14 14" stroke="${PALETTE.vontade}" stroke-width="1.2"/><circle cx="${a.x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" fill="none" stroke="${PALETTE.vontade}" stroke-dasharray="2 5" opacity=".45"/></g>`);
    }
  }

  const branchSlots = takeUniqueSlots(metrics.branchCount, 34, rng, { start: 2, end: 31 });
  const branches = branchSlots.map((slot, index) => {
    const t = slot / 34;
    const strand = rng() > 0.45 ? 1 : 2;
    const p = geometry.point(t, strand);
    const upward = p.y < geometry.center ? -1 : 1;
    const length = 24 + rng() * 54 + metrics.predatoryMemory * 34;
    const lateral = (rng() - 0.5) * 58;
    const color = index % 4 === 0 && metrics.identityDeviation > 0.45 ? PALETTE.amber : PALETTE.vontade;
    const ex = p.x + lateral;
    const ey = p.y + upward * length;
    const cx = p.x + lateral * 0.42;
    const cy = p.y + upward * length * 0.55;
    return `<g class="kj-genome-branch" opacity="${(0.48 + metrics.predatoryMemory * 0.38).toFixed(2)}"><path d="M${p.x.toFixed(1)} ${p.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${(1.1 + metrics.predatoryMemory * 1.45).toFixed(2)}"/><circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="${(2.2 + metrics.predatoryMemory * 2.4).toFixed(1)}" fill="${color}"/><circle class="kj-genome-node-pulse" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="8" fill="none" stroke="${color}"/></g>`;
  }).join("");

  const latticeSlots = takeUniqueSlots(metrics.latticeCount, 30, rng, { start: 3, end: 27 });
  const lattice = latticeSlots.map((slot, index) => {
    const t1 = slot / 30;
    const t2 = Math.min(0.97, t1 + 0.035 + rng() * 0.045);
    const a = geometry.point(t1, index % 2 ? 1 : 2);
    const b = geometry.point(t2, index % 2 ? 2 : 1);
    const bend = 18 + rng() * 26 + metrics.symbioticMemory * 20;
    return `<path class="kj-genome-lattice" d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${((a.x + b.x) / 2).toFixed(1)} ${(((a.y + b.y) / 2) + (index % 2 ? -bend : bend)).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}" fill="none" stroke="${PALETTE.comunhao}" stroke-width="${(0.8 + metrics.symbioticMemory * 1.1).toFixed(2)}" opacity="${(0.2 + metrics.symbioticMemory * 0.46).toFixed(2)}"/>`;
  }).join("");

  const nodeSlots = takeUniqueSlots(metrics.nodeCount, 26, rng, { start: 2, end: 23 });
  const nodes = nodeSlots.map((slot, index) => {
    const t = slot / 26;
    const p = geometry.point(t, index % 2 ? 1 : 2);
    const size = 4 + metrics.identityDeviation * 5 + rng() * 3;
    const color = index % 3 === 0 ? PALETTE.vontade : (index % 3 === 1 ? PALETTE.amber : PALETTE.comunhao);
    return `<g class="kj-genome-node"><path d="M${p.x.toFixed(1)} ${(p.y - size).toFixed(1)} L${(p.x + size).toFixed(1)} ${p.y.toFixed(1)} L${p.x.toFixed(1)} ${(p.y + size).toFixed(1)} L${(p.x - size).toFixed(1)} ${p.y.toFixed(1)} Z" fill="#071014" stroke="${color}" stroke-width="1.2"/><circle class="kj-genome-node-pulse" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(size + 6).toFixed(1)}" fill="none" stroke="${color}"/></g>`;
  }).join("");

  const particleCount = metrics.dormant ? 18 : 28 + Math.round(metrics.complexity * 0.32);
  const particles = Array.from({ length: particleCount }, (_, index) => {
    const t = rng();
    const strand = rng() > 0.5 ? 1 : 2;
    const p = geometry.point(t, strand);
    const spread = 18 + metrics.complexity * 0.7;
    const x = p.x + (rng() - 0.5) * spread;
    const y = p.y + (rng() - 0.5) * spread;
    const r = 0.6 + rng() * (index % 7 === 0 ? 2.2 : 1.15);
    const color = index % 9 === 0 ? PALETTE.vontade : index % 5 === 0 ? PALETTE.comunhao : "#7ab2b8";
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${(0.14 + rng() * 0.48).toFixed(2)}"/>`;
  }).join("");

  const third = metrics.extraStrand > 0.02
    ? `<path class="kj-genome-third" d="${pathFromPoints(thirdStrand)}" fill="none" stroke="${PALETTE.comunhao}" stroke-width="${(0.7 + metrics.extraStrand * 1.7).toFixed(2)}" opacity="${(0.08 + metrics.extraStrand * 0.5).toFixed(2)}" stroke-dasharray="7 11"/>`
    : "";

  const stabilizers = metrics.humanity > 0.55
    ? Array.from({ length: Math.round(3 + metrics.humanity * 5) }, (_, index) => {
        const t = (index + 1) / (4 + Math.round(metrics.humanity * 5));
        const a = geometry.point(t, 1);
        const b = geometry.point(t, 2);
        const y = (a.y + b.y) / 2;
        return `<path d="M${(a.x - 12).toFixed(1)} ${y.toFixed(1)} h24" stroke="${PALETTE.humanidade}" stroke-width="1" opacity="${(0.12 + metrics.humanity * 0.28).toFixed(2)}"/><circle cx="${a.x.toFixed(1)}" cy="${y.toFixed(1)}" r="2" fill="${PALETTE.humanidade}" opacity=".6"/>`;
      }).join("")
    : "";

  const id = `kjg-${String(carrier?.id || seed).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20)}-${seed}`;
  const dormantOverlay = metrics.dormant ? `<g opacity=".7"><rect x="455" y="142" width="290" height="44" fill="#050b0f" stroke="#38545b"/><text x="600" y="160" fill="#6f9397" text-anchor="middle" font-family="monospace" font-size="9" letter-spacing="2">ASSINATURA NÃO ATIVADA</text><text x="600" y="176" fill="#4c6d72" text-anchor="middle" font-family="monospace" font-size="7">AGUARDANDO PRIMEIRA LEITURA DA TRÍADE</text></g>` : "";

  return `<svg class="kj-genome-svg" viewBox="0 0 1200 328" role="img" aria-label="Assinatura genética procedural do portador">
    <defs>
      <linearGradient id="${id}-strand-a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6ca8b0"/><stop offset=".35" stop-color="#b8eee9"/><stop offset=".72" stop-color="#67c7bd"/><stop offset="1" stop-color="#7aaecb"/></linearGradient>
      <linearGradient id="${id}-strand-b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#659aa6"/><stop offset=".3" stop-color="#83c7c4"/><stop offset=".65" stop-color="#b7e7e3"/><stop offset="1" stop-color="#6e9eba"/></linearGradient>
      <filter id="${id}-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <pattern id="${id}-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#4f7d83" stroke-width=".7" opacity=".12"/><circle cx="1" cy="1" r=".8" fill="#79c895" opacity=".18"/></pattern>
    </defs>
    <rect width="1200" height="328" fill="#04090d"/>
    <rect width="1200" height="328" fill="url(#${id}-grid)"/>
    <g opacity=".24" stroke="#45636b" fill="none"><path d="M0 42H1200M0 286H1200"/><path d="M92 0V328M1108 0V328" stroke-dasharray="3 9"/></g>
    <g class="kj-genome-scan"><rect x="0" y="0" width="1200" height="2" fill="${PALETTE.comunhao}" opacity=".28"/></g>
    ${particles}
    <g class="kj-genome-bridges">${bridges.join("")}</g>
    ${lattice}
    ${stabilizers}
    <path class="kj-genome-strand kj-genome-strand-a" d="${pathFromPoints(strandA)}" fill="none" stroke="url(#${id}-strand-a)" stroke-width="${(2.1 + metrics.complexity * 0.015).toFixed(2)}" filter="url(#${id}-glow)"/>
    <path class="kj-genome-strand kj-genome-strand-b" d="${pathFromPoints(strandB)}" fill="none" stroke="url(#${id}-strand-b)" stroke-width="${(2.1 + metrics.complexity * 0.015).toFixed(2)}" filter="url(#${id}-glow)"/>
    <path class="kj-genome-trace" d="${pathFromPoints(strandA)}" fill="none" stroke="#d8ffff" stroke-width=".65" opacity=".72" stroke-dasharray="4 12"/>
    <path class="kj-genome-trace kj-genome-trace-reverse" d="${pathFromPoints(strandB)}" fill="none" stroke="#c6efff" stroke-width=".55" opacity=".58" stroke-dasharray="3 15"/>
    ${third}
    ${branches}
    ${nodes}
    ${labels.join("")}
    ${dormantOverlay}
    <g class="kj-genome-frame" fill="none" stroke="#52767d" opacity=".48"><path d="M10 28V10H92M1190 28V10H1108M10 300v18h82M1190 300v18h-82"/><path d="M18 54h42M1140 54h42M18 274h42M1140 274h42" stroke-dasharray="7 5"/></g>
    <g class="kj-genome-coordinates" fill="#66858b" font-family="monospace" font-size="7"><text x="20" y="24">0x00</text><text x="1140" y="24">0xFF</text><text x="20" y="316">K-03 // LIVE GENOME</text><text x="1020" y="316">SEED ${escapeHTML(genomeCode(seed))}</text></g>
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
    const width = 128;
    const height = 38;
    const points = [];
    const bias = (metrics.complexity / 100) * 8 + index * 0.65;
    for (let point = 0; point < 22; point += 1) {
      const x = point * (width / 21);
      const wave = Math.sin(point * (0.66 + rng() * 0.03) + rng() * 3) * (3 + bias * 0.32);
      const jitter = (rng() - 0.5) * (2 + metrics.divergence * 0.028);
      const y = height / 2 + wave + jitter;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    const color = index % 3 === 0 ? PALETTE.vontade : index % 3 === 1 ? PALETTE.comunhao : PALETTE.humanidade;
    return `<div class="kj-genome-locus"><header><span>LOCUS ${label}</span><strong>${String(Math.round((rng() * 0.35 + metrics.mutationLoad / 130) * 99)).padStart(2, "0")}</strong></header><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path d="M0 ${height/2}H${width}" stroke="#2a4248"/><polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="1.2" opacity=".78"/><g fill="#668b90" opacity=".55">${Array.from({length:7},(_,i)=>`<circle cx="${(i*20+4)}" cy="${(height-4-rng()*9).toFixed(1)}" r="1"/>`).join("")}</g></svg></div>`;
  }).join("")}</div>`;
}

export function renderGenomePanel(carrier, { detailed = false } = {}) {
  const metrics = getGenomeMetrics(carrier);
  const sequence = locusSequence(metrics.genome.seed, detailed ? 72 : 52);
  const mutationCount = metrics.genome.mutations.length;
  const memory = metrics.genome.memory;

  const left = `<aside class="kj-genome-side kj-genome-side-left">
    <div class="kj-genome-id"><small>GENOME SIGNATURE</small><strong>${escapeHTML(genomeCode(metrics.genome.seed))}</strong><span>${metrics.dormant ? "DORMANT / UNRESOLVED" : "LIVE / TRACKED"}</span></div>
    <div class="kj-genome-side-block"><small>EXPRESSÃO ATUAL</small>${miniAxisBar("Vontade", metrics.current.vontade, PALETTE.vontade)}${miniAxisBar("Comunhão", metrics.current.comunhao, PALETTE.comunhao)}${miniAxisBar("Humanidade", metrics.current.humanidade, PALETTE.humanidade)}</div>
    <div class="kj-genome-side-block"><small>MEMÓRIA ESTRUTURAL</small><div class="kj-genome-memory"><span>V-PICO <b>${memory.maxVontade}</b></span><span>C-PICO <b>${memory.maxComunhao}</b></span><span>H-PISO <b>${memory.minHumanidade}</b></span></div></div>
  </aside>`;

  const right = `<aside class="kj-genome-side kj-genome-side-right">
    ${metricCell("Divergência", `${metrics.divergence}%`, PALETTE.vontade, "desvio acumulado")}
    ${metricCell("Coerência", `${metrics.coherence}%`, PALETTE.comunhao, "organização atual")}
    ${metricCell("Complexidade", `${metrics.complexity}%`, PALETTE.amber, "arquitetura")}
    ${metricCell("Integridade", `${metrics.stability}%`, PALETTE.humanidade, "estabilidade")}
    ${metricCell("Mutações", `${mutationCount}`, "#b9ccd0", "marcos persistentes")}
  </aside>`;

  const center = `<div class="kj-genome-core">
    <header class="kj-genome-core-head"><span><i class="fa-solid fa-dna"></i><b>ANÁLISE GENÔMICA // ASSINATURA SIMBIÓTICA</b></span><small>${metrics.dormant ? "NO ACTIVE SAMPLE" : `LOAD ${metrics.mutationLoad.toString().padStart(3,"0")} // BR ${metrics.branchCount.toString().padStart(2,"0")} // LT ${metrics.latticeCount.toString().padStart(2,"0")}`}</small></header>
    <div class="kj-genome-viewport">${renderGenomeSVG(carrier, metrics)}</div>
    <div class="kj-genome-sequence"><span>SEQ</span><code>${escapeHTML(sequence.match(/.{1,4}/g)?.join(" ") || sequence)}</code></div>
  </div>`;

  const loci = detailed ? renderLocusStrip(metrics) : "";
  return `<section class="kj-genome-panel ${detailed ? "is-detailed" : ""}" data-genome-seed="${metrics.genome.seed}" data-genome-load="${metrics.mutationLoad}">
    <div class="kj-genome-grid">${left}${center}${right}</div>${loci}
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
