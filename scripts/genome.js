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

function isDormant(values) {
  return !values.vontade && !values.comunhao && !values.humanidade;
}

/**
 * Estado genômico dinâmico K-03.
 * As mutações e variações estruturais não são persistentes: alteram-se 100% em tempo real
 * de acordo com a porcentagem ativa das três categorias (Fera, Comunhão, Humano).
 */
export function normalizeGenomeState(genome, carrierId, values = {}) {
  const current = normalizeValues(values);
  const source = genome && typeof genome === "object" ? genome : {};
  const activated = typeof source.activated === "boolean" ? source.activated : !isDormant(current);

  return {
    version: 2,
    seed: safeSeed(source.seed, carrierId || JSON.stringify(current)),
    activated,
    mutations: []
  };
}

/**
 * Atualização dinâmica do estado genômico: não acumula contagens persistentes de mutações.
 */
export function evolveGenomeState(existingGenome, {
  carrierId,
  previousValues = {},
  nextValues = {},
  now = Date.now(),
  userId = ""
} = {}) {
  const after = normalizeValues(nextValues);
  const genome = normalizeGenomeState(existingGenome, carrierId, after);
  genome.activated = !isDormant(after);
  return genome;
}

export function getGenomeMetrics(carrier) {
  const current = normalizeValues(carrier?.values || {});
  const genome = normalizeGenomeState(carrier?.genome, carrier?.id || carrier?.name, current);
  const dormant = !genome.activated && isDormant(current);

  const will = current.vontade / 100;
  const communion = current.comunhao / 100;
  const humanity = current.humanidade / 100;
  const identityLoss = (100 - current.humanidade) / 100;
  const antagonism = Math.abs(current.vontade - current.humanidade) / 100;

  const stageMorph = (value) => {
    const v = clamp(value);
    if (v <= 0) return 0;
    return Math.pow(v / 100, 1.25);
  };

  const willMorph = dormant ? 0 : stageMorph(current.vontade);
  const communionMorph = dormant ? 0 : stageMorph(current.comunhao);
  const humanityMorph = dormant ? 0 : stageMorph(current.humanidade);
  const identityLossMorph = dormant ? 0 : stageMorph(100 - current.humanidade);
  const currentAlienSynergy = willMorph * communionMorph * (0.35 + identityLossMorph * 0.65);

  const mutationLoad = dormant ? 0 : clamp(
    willMorph * 45 + identityLossMorph * 40 + currentAlienSynergy * 20
  );
  const divergence = dormant ? 0 : clamp(
    willMorph * 52 + identityLossMorph * 46 + currentAlienSynergy * 22 - communionMorph * 15
  );
  const coherence = dormant ? 100 : clamp(
    20 + communion * 50 + humanity * 35 - will * 15 - antagonism * 10
  );
  const complexity = dormant ? 8 : clamp(
    14 + willMorph * 32 + communionMorph * 34 + identityLossMorph * 20
  );
  const hybridAntagonism = will * humanity;
  const stability = dormant ? 100 : clamp(
    humanity * 60 + communion * 30 + (1 - will) * 20 - hybridAntagonism * 20 + (will === 0 ? humanity * 20 : 0)
  );

  const branchCount = dormant ? 0 : Math.round(
    willMorph * 12 + currentAlienSynergy * 4
  );
  const latticeCount = dormant ? 0 : Math.round(
    communionMorph * 12 + currentAlienSynergy * 4
  );
  const fractureCount = dormant ? 0 : Math.round(
    identityLossMorph * 6 + (willMorph * Math.max(0, 0.75 - communionMorph)) * 3
  );
  const nodeCount = dormant ? 0 : Math.round(
    willMorph * 6 + communionMorph * 6 + humanityMorph * 6
  );
  const anomalousPairs = dormant ? 0 : Math.round(
    identityLossMorph * 12 + willMorph * 6
  );
  const extraStrand = dormant ? 0 : Math.max(0, Math.min(1,
    (communionMorph - 0.20) / 0.80 + currentAlienSynergy * 0.25
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
    predatoryMemory: will,
    symbioticMemory: communion,
    identityDeviation: identityLoss,
    will,
    communion,
    humanity,
    willMorph,
    communionMorph,
    humanityMorph,
    identityLossMorph,
    currentAlienSynergy,
    alienSynergy: currentAlienSynergy,
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

const STAGE_LABELS = {
  vontade: ["Adormecida", "Sussurro", "Influência", "Predomínio", "Domínio", "Domínio Absoluto"],
  comunhao: ["Ruptura", "Contato Instável", "Ressonância", "Sintonia", "União Profunda", "Equilíbrio Perfeito"],
  humanidade: ["Fronteiras Desfeitas", "Vestígios", "Identidade Resistente", "Vontade Humana", "Rejeição Profunda", "Negação Absoluta"]
};
const STAGE_ROMANS = ["I", "II", "III", "IV", "V", "VI"];

function getAxisStage(axis, value) {
  const safe = clamp(value);
  const idx = safe === 100 ? 5 : Math.floor(safe / 20);
  return `Est. ${STAGE_ROMANS[idx]} · ${STAGE_LABELS[axis]?.[idx] || ""}`;
}

function axisDial(label, value, color, code, stageText) {
  const safe = clamp(value);
  const circumference = 138.23;
  const dash = (circumference * safe / 100).toFixed(1);
  const rest = (circumference - Number(dash)).toFixed(1);
  return `<div class="kj-dna-vital-card vertical" style="--vital:${color}">
    <div class="kj-vital-header-mini">
      <span class="kj-vital-code-tag">${escapeHTML(label)}</span>
    </div>
    <div class="kj-vital-gauge">
      <svg viewBox="0 0 54 54" aria-hidden="true">
        <circle cx="27" cy="27" r="22" class="dial-bg"/>
        <circle cx="27" cy="27" r="22" class="dial-arc" stroke-dasharray="${dash} ${rest}"/>
      </svg>
      <div class="kj-vital-val">${safe}<span>%</span></div>
    </div>
    <div class="kj-vital-vbar">
      <div class="kj-vital-vbar-fill" style="width:${safe}%;"></div>
    </div>
    <div class="kj-vital-meta-mini">
      <small class="kj-vital-sub">${escapeHTML(code)}</small>
      <span class="kj-vital-stage-tag">${escapeHTML(stageText)}</span>
    </div>
  </div>`;
}

function metricCell(label, value, color = "#3ff4d5", hint = "", pct = null) {
  const numeric = typeof value === "number" ? value : (parseInt(value, 10) || 0);
  const barWidth = pct != null ? Math.min(100, Math.max(0, pct)) : Math.min(100, Math.max(0, numeric));
  return `<div class="kj-dna-stat" style="--stat:${color}">
    <div class="kj-stat-head">
      <small>${escapeHTML(label)}</small>
      ${hint ? `<span>${escapeHTML(hint)}</span>` : ""}
    </div>
    <strong class="kj-stat-val">${escapeHTML(value)}</strong>
    <div class="kj-stat-bar"><i style="width:${barWidth}%"></i></div>
  </div>`;
}

export function renderGenomePanel(carrier, { detailed = false, reading = "", profile = null } = {}) {
  const metrics = getGenomeMetrics(carrier);
  const seed = metrics.genome.seed;
  const signature = genomeCode(seed);

  const vStage = getAxisStage("vontade", metrics.current.vontade);
  const cStage = getAxisStage("comunhao", metrics.current.comunhao);
  const hStage = getAxisStage("humanidade", metrics.current.humanidade);

  const stabilityStatus = metrics.stability >= 75 ? "ESTÁVEL" : metrics.stability >= 45 ? "COMPENSADA" : "CRÍTICA";
  const stabilityColor = metrics.stability >= 75 ? PALETTE.humanidade : metrics.stability >= 45 ? PALETTE.amber : PALETTE.vontade;

  const willMorph = metrics.willMorph || 0;
  const s1Color = lerpColor("#00f0d0", "#ff4d4d", willMorph);

  return `<section class="kj-dna-console ${detailed ? "is-detailed" : ""}" data-kj-genome-console data-genome-seed="${seed}">
    <div class="kj-dna-crt" aria-hidden="true"></div><div class="kj-dna-vignette" aria-hidden="true"></div>

    <header class="kj-dna-statusbar">
      <div class="kj-dna-badge"><i class="kj-pulse-dot"></i><span>ASSINATURA: <b>${signature}</b></span></div>
      <div class="kj-dna-ticker">
        <span>MONITOR XENOBIOLÓGICO</span><em>//</em>
        <span>HOMEOSTASE: <b style="color:${stabilityColor}">${stabilityStatus} (${metrics.stability}%)</b></span><em>//</em>
        <span>AMOSTRA: <b>${metrics.dormant ? "DORMENTE" : "EM TEMPO REAL"}</b></span>
      </div>
      <div class="kj-dna-coords">
        <span class="kj-coord-v">FERA <b>${metrics.current.vontade}%</b></span>
        <span class="kj-coord-c">COM <b>${metrics.current.comunhao}%</b></span>
        <span class="kj-coord-h">HUM <b>${metrics.current.humanidade}%</b></span>
      </div>
    </header>

    <div class="kj-dna-main-frame">
      <aside class="kj-dna-left-col">
        <div class="kj-dna-block kj-dna-vitals-panel vertical">
          <header class="kj-vitals-header vertical">
            <span>SINAIS VITAIS</span>
            <small>K-03 TELEMETRIA</small>
          </header>
          <div class="kj-dna-vitals-list vertical">
            ${axisDial("FERA", metrics.current.vontade, PALETTE.vontade, "VONTADE DA FERA", vStage)}
            ${axisDial("COMUNHÃO", metrics.current.comunhao, PALETTE.comunhao, "RESSONÂNCIA", cStage)}
            ${axisDial("HUMANO", metrics.current.humanidade, PALETTE.humanidade, "IDENTIDADE", hStage)}
          </div>
        </div>
      </aside>

      <main class="kj-dna-center-col">
        <div class="kj-dna-viewport-head">
          <div class="kj-viewport-title">
            <i class="fa-solid fa-dna"></i>
            <div>
              <strong>ANÁLISE XENOGENÔMICA // DNA KAIJU</strong>
              <small>MAPEAMENTO MOLECULAR 3D EM TEMPO REAL · B-DNA HÍBRIDO</small>
            </div>
          </div>
          <div class="kj-dna-monitor">
            <span class="kj-monitor-status"><i class="kj-pulse-dot"></i>${metrics.dormant ? "AMOSTRA INATIVA" : "AMOSTRA BIO-ESTABILIZADA"}</span>
            <div class="kj-monitor-eq">${Array.from({length:10},(_,i)=>`<i style="--h:${6+((i*3)%8)*2}px"></i>`).join("")}</div>
          </div>
        </div>

        <div class="kj-dna-metric-ribbon">
          ${metricCell("DESVIO GENÔMICO", `${metrics.divergence}%`, PALETTE.vontade, "DISTORÇÃO", metrics.divergence)}
          ${metricCell("SINCRONIA VINCULAR", `${metrics.coherence}%`, PALETTE.comunhao, "RESSONÂNCIA", metrics.coherence)}
          ${metricCell("ARQUITETURA", `${metrics.complexity}%`, PALETTE.amber, "COMPLEXIDADE", metrics.complexity)}
          ${metricCell("BIO-ESTABILIDADE", `${metrics.stability}%`, PALETTE.humanidade, "HOMEOSTASE", metrics.stability)}
          ${metricCell("CARGA MUTAGÊNICA", `${metrics.mutationLoad}%`, PALETTE.vontade, "DINÂMICA", metrics.mutationLoad)}
        </div>

        <div class="kj-dna-canvas-container">
          <canvas class="kj-dna-helix-canvas" data-kj-genome-canvas title="DNA procedural K-03 — mova o mouse para inclinar; clique para alterar a rotação"></canvas>
          <div class="kj-dna-canvas-badges">
            <span class="kj-dna-legend-strand s1" style="--s1-color:${s1Color}; color:${s1Color};"><i class="legend-dot"></i> FITA 1 (α / FERA)</span>
            <span class="kj-dna-legend-strand s2"><i class="legend-dot"></i> FITA 2 (β / HUMANO)</span>
            ${metrics.extraStrand > 0.08 ? `<span class="kj-dna-legend-strand s3"><i class="legend-dot"></i> FITA 3 (γ / ALIEN)</span>` : ""}
          </div>
        </div>
      </main>
    </div>
  </section>`;
}

export function renderGenomeDetail(carrier) {
  const metrics = getGenomeMetrics(carrier);
  const statusMsg = metrics.mutationLoad === 0
    ? `<div class="kj-genome-no-events"><i class="fa-solid fa-dna"></i><strong>Genoma Estável // Sem Anomalias</strong><span>A assinatura biológica permanece íntegra e estabilizada pela identidade humana.</span></div>`
    : `<div class="kj-genome-no-events" style="border-color:${metrics.mutationLoad > 50 ? PALETTE.vontade : PALETTE.comunhao};"><i class="fa-solid fa-biohazard" style="color:${metrics.mutationLoad > 50 ? PALETTE.vontade : PALETTE.comunhao};"></i><strong style="color:#ffffff;">Instabilidade Ativa: ${metrics.mutationLoad}%</strong><span>Estruturas mutagênicas e variações morfológicas derivadas dinamicamente em tempo real.</span></div>`;

  return `${renderGenomePanel(carrier, { detailed: true })}<section class="kj-genome-analysis-grid"><article class="kj-genome-analysis-card"><header><i class="fa-solid fa-code-branch"></i><div><small>MORFOLOGIA</small><strong>Estruturas derivadas em tempo real</strong></div></header><div class="kj-genome-derived-grid">${metricCell("Ramificações", String(metrics.branchCount), PALETTE.vontade)}${metricCell("Malhas", String(metrics.latticeCount), PALETTE.comunhao)}${metricCell("Rupturas", String(metrics.fractureCount), PALETTE.vontade)}${metricCell("Nós", String(metrics.nodeCount), PALETTE.amber)}${metricCell("Pares Δ", String(metrics.anomalousPairs), PALETTE.amber)}${metricCell("Fita extra", `${Math.round(metrics.extraStrand * 100)}%`, PALETTE.comunhao)}</div></article><article class="kj-genome-analysis-card"><header><i class="fa-solid fa-wave-square"></i><div><small>ESTADO DINÂMICO</small><strong>Telemetria Morfológica</strong></div></header>${statusMsg}</article></section>`;
}
