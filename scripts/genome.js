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

  /*
   * Curva visual de progressão por estágio.
   *
   * O DNA-base precisa continuar parecendo o DNA ANALYSIS original. Os estágios I–III
   * acrescentam sinais e pequenas alterações; IV começa a alterar a anatomia; V e VI
   * permitem mudanças grandes. Isso evita o erro da dev.5, onde valores medianos já
   * deformavam toda a hélice e destruíam a silhueta de referência.
   */
  const stageMorph = (value) => {
    const v = clamp(value);
    if (v <= 0) return 0;
    // Curva morfológica progressiva contínua: alterações biológicas reais perceptíveis a partir de 20%,
    // escalando para aberrações estruturais dramáticas nos estágios médios e extremos.
    return Math.pow(v / 100, 1.25);
  };

  const willMorph = dormant ? 0 : stageMorph(current.vontade);
  const communionMorph = dormant ? 0 : stageMorph(current.comunhao);
  const humanityMorph = dormant ? 0 : stageMorph(current.humanidade);
  const identityLossMorph = dormant ? 0 : stageMorph(100 - current.humanidade);
  const currentAlienSynergy = willMorph * communionMorph * (0.35 + identityLossMorph * 0.65);

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

  // Famílias morfológicas ativas: geram espigões, membranas, rupturas e mutações genuínas
  const branchCount = dormant ? 0 : Math.round(
    willMorph * 14 + identityLossMorph * 4
  );
  const latticeCount = dormant ? 0 : Math.round(
    communionMorph * 14 + currentAlienSynergy * 5
  );
  const fractureCount = dormant ? 0 : Math.round(
    identityLossMorph * 7 + (willMorph * Math.max(0, 0.75 - communionMorph)) * 4
  );
  const nodeCount = dormant ? 0 : Math.round(
    willMorph * 7 + communionMorph * 7 + humanityMorph * 5 + currentAlienSynergy * 4
  );
  const anomalousPairs = dormant ? 0 : Math.round(
    identityLossMorph * 14 + willMorph * 6 + currentAlienSynergy * 5
  );
  const extraStrand = dormant ? 0 : Math.max(0, Math.min(1,
    (communionMorph - 0.15) / 0.85 + currentAlienSynergy * 0.22
  ));
  const humanityLocks = dormant ? 0 : Math.round(humanityMorph * 12);

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
    humanityLocks,
    predatoryMemory,
    symbioticMemory,
    identityDeviation,
    will,
    communion,
    humanity,
    willMorph,
    communionMorph,
    humanityMorph,
    identityLossMorph,
    currentAlienSynergy,
    alienSynergy,
    antagonism
  };
}

function genomeCode(seed) {
  const a = (seed >>> 0).toString(16).toUpperCase().padStart(8, "0");
  const b = hashString(`K03:${seed}`).toString(16).toUpperCase().padStart(8, "0");
  return `${a.slice(0, 4)}-${a.slice(4)}-${b.slice(0, 4)}`;
}

function locusSequence(seed, length = 72) {
  const rng = mulberry32(seed ^ 0xB10C0DE);
  const bases = ["A", "T", "C", "G"];
  let output = "";
  for (let index = 0; index < length; index += 1) output += bases[Math.floor(rng() * bases.length)];
  return output;
}

function techNumbers(seed, count = 12) {
  const rng = mulberry32(seed ^ 0x71EC0DE);
  return Array.from({ length: count }, () => String(Math.floor(10000 + rng() * 899999)).padStart(6, "0"));
}

function axisDial(label, value, color, code) {
  const safe = clamp(value);
  const circumference = 94.25;
  const dash = (circumference * safe / 100).toFixed(2);
  const rest = (circumference - Number(dash)).toFixed(2);
  return `<div class="kj-dna-dial" style="--dial:${color}"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="15" class="dial-bg"/><circle cx="22" cy="22" r="15" class="dial-arc" stroke-dasharray="${dash} ${rest}"/><circle cx="22" cy="22" r="10" class="dial-inner"/></svg><div><small>${escapeHTML(code)}</small><strong>${escapeHTML(label)}</strong><b>${safe.toString().padStart(2,"0")}.0</b></div></div>`;
}

function metricCell(label, value, color = "#3ff4d5", hint = "") {
  return `<div class="kj-dna-stat" style="--stat:${color}"><small>${escapeHTML(label)}</small><strong>${escapeHTML(value)}</strong>${hint ? `<span>${escapeHTML(hint)}</span>` : ""}</div>`;
}

function codonTables(metrics) {
  const seed = metrics.genome.seed;
  const rng = mulberry32(seed ^ 0xC0D0F00D);
  const labels = ["JS_05_6", "GT_AC_8", "PX_71_K", "MUT_03", "HUM_12", "COM_44", "FER_91", "K03_CORE"];
  return `<div class="kj-dna-codon-grid">${labels.map((label, index) => {
    const values = Array.from({ length: 9 }, () => String(Math.floor(rng() * 99)).padStart(2, "0"));
    const accent = index % 3 === 0 ? PALETTE.vontade : index % 3 === 1 ? PALETTE.comunhao : PALETTE.humanidade;
    return `<div class="kj-dna-codon" style="--codon:${accent}"><header>${label}</header><div><span>${values[0]}-${values[1]}</span><span>${values[2]}-${values[3]}</span><span>${values[4]}-${values[5]}</span></div><div><span>${values[6]}-${values[7]}</span><span>${values[8]}-${String(metrics.mutationLoad).padStart(2,"0")}</span><span>${String(metrics.divergence).padStart(2,"0")}</span></div></div>`;
  }).join("")}</div>`;
}

function resequenceRows(metrics) {
  const seq = locusSequence(metrics.genome.seed, 45);
  return seq.match(/.{1,5}/g).slice(0, 4).map((block, index) => `<div><span>${String((metrics.genome.seed >>> (index * 3)) % 999999).padStart(6,"0")}</span><b>${block}</b><span>${String((metrics.complexity * (index + 3) + metrics.divergence * 7) % 99999).padStart(5,"0")}</span></div>`).join("");
}

export function renderGenomePanel(carrier, { detailed = false } = {}) {
  const metrics = getGenomeMetrics(carrier);
  const seed = metrics.genome.seed;
  const codes = techNumbers(seed, 18);
  const sequence = locusSequence(seed, detailed ? 104 : 76);
  const memory = metrics.genome.memory;
  const mutationCount = metrics.genome.mutations.length;
  const signature = genomeCode(seed);

  return `<section class="kj-dna-console ${detailed ? "is-detailed" : ""}" data-kj-genome-console data-genome-seed="${seed}">
    <div class="kj-dna-crt" aria-hidden="true"></div><div class="kj-dna-vignette" aria-hidden="true"></div>
    <header class="kj-dna-statusbar"><span class="kj-dna-badge"><i></i>K03_XENO_${signature}</span><div class="kj-dna-ticker"><span>${codes[0]}</span><em>|</em><span>${codes[1]}</span><em>|</em><span>${codes[2]}-${codes[3]}</span><em>|</em><span>SEQ_${sequence.slice(0,16)}</span><em>|</em><span>${codes[4]}</span><em>|</em><span>LIVE GENOME ARRAY</span></div><div class="kj-dna-coords"><span>X:${String(metrics.current.vontade).padStart(3,"0")}</span><span>Y:${String(metrics.current.comunhao).padStart(3,"0")}</span><span>Z:${String(metrics.current.humanidade).padStart(3,"0")}</span></div></header>

    <div class="kj-dna-main-frame">
      <aside class="kj-dna-left-col">
        <div class="kj-dna-block kj-dna-dials-panel"><header><span>08_X:K03</span><b>${(metrics.complexity / 10).toFixed(3)}</b></header><div class="kj-dna-dials">
          ${axisDial("FERA", metrics.current.vontade, PALETTE.vontade, "WILL")}
          ${axisDial("COMUNHÃO", metrics.current.comunhao, PALETTE.comunhao, "SYNC")}
          ${axisDial("HUMANO", metrics.current.humanidade, PALETTE.humanidade, "SELF")}
        </div></div>
        <div class="kj-dna-block kj-dna-telem"><div>${codes.slice(5,14).map((code, i)=>`<span>${code}</span>${i%3===2?"<br>":""}`).join(" ")}</div><button type="button" class="kj-dna-pill"><span>GENOME ${signature}</span></button><button type="button" class="kj-dna-pill is-filled"><span>${metrics.dormant ? "NO ACTIVE SAMPLE" : "SEQUENCING ACTIVE"}</span></button></div>
        <div class="kj-dna-block kj-dna-reticle"><div class="kj-reticle-viewport"><i class="r-outer"></i><i class="r-mid"></i><i class="r-inner"></i><i class="r-center"></i></div><div class="kj-reticle-data"><b>${String(metrics.mutationLoad).padStart(3,"0")}//${String(metrics.divergence).padStart(3,"0")}</b><span>MUTATION VECTOR</span><small>${codes[14]} ${codes[15]}</small></div></div>
        <div class="kj-dna-block kj-dna-memory"><header>MEMÓRIA ESTRUTURAL</header><div><span>V-PEAK <b>${memory.maxVontade}</b></span><span>C-PEAK <b>${memory.maxComunhao}</b></span><span>H-FLOOR <b>${memory.minHumanidade}</b></span><span>MUT <b>${mutationCount}</b></span></div></div>
      </aside>

      <main class="kj-dna-center-col">
        <div class="kj-dna-viewport-head"><div><span class="bracket">┌</span><small>${codes[16]} // ${codes[17]}</small><strong>ANÁLISE XENOGENÔMICA <em>// KAIJU DNA ANALYSIS</em></strong><b>${signature}</b></div><div class="kj-dna-monitor"><span><i></i>${metrics.dormant ? "AGUARDANDO AMOSTRA" : "SEQUENCIAMENTO MOLECULAR CONTÍNUO"}</span><div>${Array.from({length:12},(_,i)=>`<i style="--h:${4+(i%5)*2}px"></i>`).join("")}</div></div><span class="bracket right">┐</span></div>
        <div class="kj-dna-metric-ribbon">${metricCell("DIVERGÊNCIA", `${metrics.divergence}%`, PALETTE.vontade, "DESVIO")}${metricCell("COERÊNCIA", `${metrics.coherence}%`, PALETTE.comunhao, "SINCRONIA")}${metricCell("COMPLEXIDADE", `${metrics.complexity}%`, PALETTE.amber, "ARQUITETURA")}${metricCell("INTEGRIDADE", `${metrics.stability}%`, PALETTE.humanidade, "ESTABILIDADE")}${metricCell("MUTAÇÕES", String(mutationCount), "#d9ffff", "PERSISTENTES")}</div>
        <div class="kj-dna-canvas-container">
          <div class="kj-dna-corner tl"></div><div class="kj-dna-corner tr"></div><div class="kj-dna-corner bl"></div><div class="kj-dna-corner br"></div>
          <div class="kj-dna-y-scale left">${["572924","24214","121245","73292","823","56564","394205"].map(v=>`<span>${v}<i>—</i></span>`).join("")}</div>
          <canvas class="kj-dna-helix-canvas" data-kj-genome-canvas title="DNA procedural K-03 — mova o mouse para inclinar; clique para alterar a rotação"></canvas>
          <div class="kj-dna-y-scale right">${["572924","24214","121245","73292","823","56564","394205"].map(v=>`<span><i>—</i>${v}</span>`).join("")}</div>
          <div class="kj-dna-resequence"><header>CÓDIGO DE RESSEQUENCIAMENTO</header>${resequenceRows(metrics)}<div class="kj-dna-reseq-bar"><i style="width:${Math.max(8,metrics.coherence)}%"></i></div></div>
          <div class="kj-dna-floating"><span>RND ${String(metrics.branchCount).padStart(2,"0")} ${String(metrics.latticeCount).padStart(2,"0")}</span><span>MUT Δ ${String(metrics.divergence).padStart(3,"0")}</span><b>${String(metrics.genome.seed % 10000).padStart(4,"0")}</b><small>WAVEFORM_DATA ${metrics.currentAlienSynergy.toFixed(3)}</small></div>
          <div class="kj-dna-locus-labels"><span>L-01</span><span>L-17</span><span>L-34</span><span>L-52</span><span>L-71</span><span>L-93</span></div>
        </div>
        <div class="kj-dna-sequence"><b>SEQ</b><code>${escapeHTML(sequence.match(/.{1,4}/g)?.join(" ") || sequence)}</code><span>BR:${String(metrics.branchCount).padStart(2,"0")} LT:${String(metrics.latticeCount).padStart(2,"0")} FR:${String(metrics.fractureCount).padStart(2,"0")} ΔP:${String(metrics.anomalousPairs).padStart(2,"0")}</span></div>
      </main>
    </div>
    <footer class="kj-dna-bottom-panel"><div class="kj-dna-bottom-id"><b>K-03 // ${signature}</b><span>GENOME TELEMETRY</span><small>${codes[0]}-${codes[1]}</small></div>${codonTables(metrics)}<div class="kj-dna-bottom-count"><strong>${String(metrics.mutationLoad).padStart(3,"0")}</strong><span>LOAD</span><b>${String(Math.round(metrics.extraStrand*100)).padStart(2,"0")}%</b><small>EXTRA STRAND</small></div></footer>
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

  return `${renderGenomePanel(carrier, { detailed: true })}<section class="kj-genome-analysis-grid"><article class="kj-genome-analysis-card"><header><i class="fa-solid fa-code-branch"></i><div><small>MORFOLOGIA</small><strong>Estruturas derivadas</strong></div></header><div class="kj-genome-derived-grid">${metricCell("Ramificações", String(metrics.branchCount), PALETTE.vontade)}${metricCell("Malhas", String(metrics.latticeCount), PALETTE.comunhao)}${metricCell("Rupturas", String(metrics.fractureCount), PALETTE.vontade)}${metricCell("Nós", String(metrics.nodeCount), PALETTE.amber)}${metricCell("Pares Δ", String(metrics.anomalousPairs), PALETTE.amber)}${metricCell("Fita extra", `${Math.round(metrics.extraStrand * 100)}%`, PALETTE.comunhao)}</div></article><article class="kj-genome-analysis-card"><header><i class="fa-solid fa-timeline"></i><div><small>GENETIC MEMORY</small><strong>Registro de mutações</strong></div></header>${registry}</article></section>`;
}
