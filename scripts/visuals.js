import { clamp } from "./storage.js";
import { renderGenomeDetail, renderGenomePanel } from "./genome.js";

export const STAGE_ROMAN = ["I", "II", "III", "IV", "V", "VI"];
export const STAGE_LIMITS = [0, 20, 40, 60, 80, 100];

export const AXES = Object.freeze({
  vontade: {
    title: "Vontade da Fera",
    short: "Vontade",
    taxonomy: "Pressão predatória",
    description: "A influência e a dominância do Kaiju sobre você.",
    accent: "#e85d48",
    rgb: "232,93,72",
    icon: "fa-paw",
    stages: [
      { label: "Adormecida", icon: "fa-bed", signal: "Presença latente" },
      { label: "Sussurro Instintivo", icon: "fa-ear-listen", signal: "Instinto desperto" },
      { label: "Influência Crescente", icon: "fa-arrow-trend-up", signal: "Marca predatória" },
      { label: "Predomínio", icon: "fa-gavel", signal: "Pressão dominante" },
      { label: "Domínio", icon: "fa-crown", signal: "Identidade acuada" },
      { label: "Domínio Absoluto da Fera", icon: "fa-biohazard", signal: "Identidade subjugada" }
    ]
  },
  comunhao: {
    title: "Comunhão",
    short: "Comunhão",
    taxonomy: "Ressonância simbiótica",
    description: "Você aceita a fera interior em equilíbrio perfeito — ou quase.",
    accent: "#4ac8b7",
    rgb: "74,200,183",
    icon: "fa-dna",
    stages: [
      { label: "Ruptura", icon: "fa-circle-xmark", signal: "Vínculo interrompido" },
      { label: "Contato Instável", icon: "fa-tower-broadcast", signal: "Primeiro contato" },
      { label: "Ressonância", icon: "fa-radio", signal: "Frequências alinhadas" },
      { label: "Sintonia", icon: "fa-arrows-rotate", signal: "Resposta recíproca" },
      { label: "União Profunda", icon: "fa-share-nodes", signal: "Consciências entrelaçadas" },
      { label: "Equilíbrio Perfeito", icon: "fa-scale-balanced", signal: "Simbiose integral" }
    ]
  },
  humanidade: {
    title: "Nível da Sua Humanidade",
    short: "Humanidade",
    taxonomy: "Integridade identitária",
    description: "O nível de resistência e rejeição da besta dentro de você.",
    accent: "#78abe1",
    rgb: "120,171,225",
    icon: "fa-fingerprint",
    stages: [
      { label: "Fronteiras Desfeitas", icon: "fa-ghost", signal: "Identidade dispersa" },
      { label: "Vestígios Humanos", icon: "fa-person-circle-question", signal: "Traços reconhecíveis" },
      { label: "Identidade Resistente", icon: "fa-id-card", signal: "Eu preservado" },
      { label: "Vontade Humana", icon: "fa-lightbulb", signal: "Consciência afirmada" },
      { label: "Rejeição Profunda", icon: "fa-user-shield", signal: "Barreira identitária" },
      { label: "Negação Absoluta", icon: "fa-fingerprint", signal: "Fronteira inviolável" }
    ]
  }
});

export function stageIndexAt(value) {
  const safe = clamp(value);
  return safe === 100 ? 5 : Math.floor(safe / 20);
}

export function stageAt(key, value) {
  const index = stageIndexAt(value);
  return { ...AXES[key].stages[index], index, roman: STAGE_ROMAN[index], threshold: STAGE_LIMITS[index] };
}

export function getProfile(values) {
  const entries = Object.entries(values).map(([key, value]) => ({ key, value: clamp(value), title: AXES[key].title }));
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  const maximum = sorted[0]?.value ?? 0;
  const minimum = sorted.at(-1)?.value ?? 0;
  const spread = maximum - minimum;
  const average = Math.round(entries.reduce((sum, entry) => sum + entry.value, 0) / Math.max(entries.length, 1));
  const convergent = spread <= 10;
  return {
    dominant: convergent ? "Tríade convergente" : sorted[0]?.title ?? "—",
    dominantKey: convergent ? "comunhao" : sorted[0]?.key ?? "comunhao",
    average,
    balance: 100 - spread,
    spread,
    tension: Math.abs(clamp(values.vontade) - clamp(values.humanidade))
  };
}

export function getReading({ vontade, comunhao, humanidade }) {
  vontade = clamp(vontade); comunhao = clamp(comunhao); humanidade = clamp(humanidade);
  if (vontade === 0 && comunhao === 0 && humanidade === 0) return "O vínculo ainda permanece silencioso.";
  if (comunhao >= 80 && Math.abs(vontade - humanidade) <= 20) return "As duas vontades se reconhecem e agem em um equilíbrio quase perfeito.";
  if (vontade >= 80 && humanidade >= 80) return "Fera e humanidade recusam ceder; o vínculo está sob tensão extrema.";
  if (comunhao >= vontade && comunhao >= humanidade) return "A comunhão estabiliza a fronteira entre a fera e a identidade humana.";
  if (vontade > humanidade) return "A vontade do Kaiju avança sobre a identidade humana.";
  if (humanidade > vontade) return "A identidade humana resiste ao avanço da fera.";
  return "Nenhuma vontade domina; o vínculo permanece instável.";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
}

function radarSVG(values, profile) {
  const pointAt = (value, degrees) => {
    const radians = degrees * Math.PI / 180;
    const radius = 18 + clamp(value) * 0.62;
    return { x: (90 + Math.cos(radians) * radius).toFixed(1), y: (90 + Math.sin(radians) * radius).toFixed(1) };
  };
  const contacts = [
    ["F", "vontade", -90], ["C", "comunhao", 30], ["H", "humanidade", 150]
  ].map(([label, key, deg]) => {
    const point = pointAt(values[key], deg);
    const axis = AXES[key];
    return `<g><path d="M90 90L${point.x} ${point.y}" stroke="${axis.accent}" stroke-width="1" stroke-dasharray="3 7" opacity=".42"/><circle cx="${point.x}" cy="${point.y}" r="3.2" fill="${axis.accent}"/><circle class="kj-radar-pulse" cx="${point.x}" cy="${point.y}" r="5" fill="none" stroke="${axis.accent}"/><text x="${point.x}" y="${Number(point.y)-7}" fill="${axis.accent}" font-family="monospace" font-size="7" font-weight="700" text-anchor="middle">${label}${clamp(values[key])}</text></g>`;
  }).join("");
  const dominant = AXES[profile.dominantKey];
  return `<svg class="kj-radar-svg" viewBox="0 0 180 180" aria-label="Radar de contenção"><defs><radialGradient id="kjradar"><stop offset="0" stop-color="#173038" stop-opacity=".52"/><stop offset="1" stop-color="#050a0e" stop-opacity=".96"/></radialGradient></defs><rect width="180" height="180" fill="url(#kjradar)"/><g fill="none" stroke="#5d858a" opacity=".42"><circle cx="90" cy="90" r="22"/><circle cx="90" cy="90" r="44"/><circle cx="90" cy="90" r="66"/><circle cx="90" cy="90" r="84"/><path d="M6 90H174M90 6V174M31 31L149 149M149 31L31 149" stroke-dasharray="2 7"/></g><g class="kj-radar-sweep"><path d="M90 90L90 6A84 84 0 0 1 149 31Z" fill="${dominant.accent}" opacity=".12"/><path d="M90 90V6" stroke="${dominant.accent}" stroke-width="1.4" opacity=".8"/></g>${contacts}<path d="M90 77L101 83V97L90 103L79 97V83Z" fill="#071014" stroke="${dominant.accent}" stroke-width="1.4"/></svg>`;
}

function metricHTML(key, value) {
  const axis = AXES[key];
  const stage = stageAt(key, value);
  return `<article class="kj-metric" style="--kj-accent:${axis.accent};--kj-rgb:${axis.rgb};--kj-value:${clamp(value)}%" data-axis="${key}">
    <div class="kj-metric-head"><span class="kj-metric-icon"><i class="fa-solid ${axis.icon}"></i></span><div><small>${escapeHTML(axis.taxonomy)}</small><strong>${escapeHTML(axis.title)}</strong></div><output>${clamp(value)}%</output></div>
    <div class="kj-progress"><span></span></div>
    <div class="kj-metric-stage"><span>ESTÁGIO ${stage.roman}</span><strong>${escapeHTML(stage.label)}</strong></div>
    <p>${escapeHTML(axis.description)}</p>
  </article>`;
}

function overviewHTML(carrier, profile) {
  return `${renderGenomePanel(carrier)}<section class="kj-overview-grid kj-overview-secondary">
    <div class="kj-radar-card">${radarSVG(carrier.values, profile)}<div class="kj-radar-meta"><small>DOMINÂNCIA</small><strong>${escapeHTML(profile.dominant)}</strong><span>Convergência ${profile.balance}% · Média ${profile.average}%</span></div></div>
    <div class="kj-metrics-grid">${metricHTML("vontade", carrier.values.vontade)}${metricHTML("comunhao", carrier.values.comunhao)}${metricHTML("humanidade", carrier.values.humanidade)}</div>
  </section><section class="kj-diagnosis"><div><i class="fa-solid fa-microscope"></i><span><small>LEITURA DO VÍNCULO</small><strong>${escapeHTML(getReading(carrier.values))}</strong></span></div></section>`;
}

function stagesHTML(carrier) {
  return `<section class="kj-stage-matrix">${Object.entries(AXES).map(([key, axis]) => {
    const current = stageIndexAt(carrier.values[key]);
    return `<article class="kj-stage-axis" style="--kj-accent:${axis.accent};--kj-rgb:${axis.rgb}"><header><i class="fa-solid ${axis.icon}"></i><div><small>${axis.taxonomy}</small><strong>${axis.title}</strong></div><output>${clamp(carrier.values[key])}%</output></header><div class="kj-stage-rail">${axis.stages.map((stage, i) => `<div class="${i===current?"is-current":i<current?"is-passed":""}"><span>${STAGE_ROMAN[i]} · ${STAGE_LIMITS[i]}</span><i class="fa-solid ${stage.icon}"></i><strong>${escapeHTML(stage.label)}</strong><small>${escapeHTML(stage.signal)}</small></div>`).join("")}</div></article>`;
  }).join("")}</section>`;
}

function historyHTML(carrier) {
  const history = Array.isArray(carrier.history) ? carrier.history : [];
  if (!history.length) return `<div class="kj-empty-panel"><i class="fa-solid fa-clock-rotate-left"></i><strong>Nenhuma alteração registrada</strong><span>O histórico será preenchido quando os valores forem modificados.</span></div>`;
  return `<section class="kj-history">${history.map((entry) => {
    const user = game.users?.get(entry.userId);
    const date = new Date(entry.timestamp).toLocaleString("pt-BR");
    const changes = (entry.changes || []).map((change) => `${AXES[change.key]?.short || change.key}: <b>${change.before}% → ${change.after}%</b>`).join(" · ");
    return `<article><i class="fa-solid fa-wave-square"></i><div><strong>${changes}</strong><small>${escapeHTML(user?.name || "Mestre")} · ${escapeHTML(date)}</small></div></article>`;
  }).join("")}</section>`;
}

function notesHTML(carrier, isGM) {
  const publicNotes = carrier.publicNotes?.trim();
  const gmNotes = carrier.gmNotes?.trim();
  return `<section class="kj-notes-grid"><article><header><i class="fa-solid fa-note-sticky"></i><strong>Registro compartilhado</strong></header>${publicNotes ? `<div class="kj-note-content">${escapeHTML(publicNotes).replaceAll("\n","<br>")}</div>` : `<div class="kj-note-empty">Nenhuma anotação compartilhada.</div>`}</article>${isGM ? `<article class="kj-gm-note"><header><i class="fa-solid fa-lock"></i><strong>Notas do mestre</strong></header>${gmNotes ? `<div class="kj-note-content">${escapeHTML(gmNotes).replaceAll("\n","<br>")}</div>` : `<div class="kj-note-empty">Nenhuma anotação privada.</div>`}</article>` : ""}</section>`;
}

export function renderCarrierDetail(carrier, { isGM = false, tab = "overview" } = {}) {
  const profile = getProfile(carrier.values);
  const owners = (carrier.ownerUserIds || []).map((id) => game.users?.get(id)?.name).filter(Boolean);
  const body = tab === "genome" ? renderGenomeDetail(carrier) : tab === "stages" ? stagesHTML(carrier) : tab === "history" ? historyHTML(carrier) : tab === "notes" ? notesHTML(carrier, isGM) : overviewHTML(carrier, profile);
  return `<div class="kj-detail-shell" data-carrier-id="${carrier.id}">
    <header class="kj-detail-head"><div class="kj-detail-ident"><span class="kj-detail-sigil"><i class="fa-solid fa-fingerprint"></i></span><div><small>GMS XENOBIOLOGICAL ARRAY // INDIVIDUAL RECORD</small><h2>${escapeHTML(carrier.name)}</h2><p>${escapeHTML(carrier.designation || "REGISTRO DE PORTADOR")}</p></div></div><div class="kj-detail-facts"><span><small>VÍNCULO</small><strong>${profile.average}%</strong></span><span><small>CONVERGÊNCIA</small><strong>${profile.balance}%</strong></span></div></header>
    ${carrier.description ? `<div class="kj-description">${escapeHTML(carrier.description)}</div>` : ""}
    ${owners.length ? `<div class="kj-owner-strip"><i class="fa-solid fa-user-group"></i><span>Vinculado a <strong>${owners.map(escapeHTML).join(", ")}</strong></span></div>` : ""}
    <nav class="kj-tabs" aria-label="Seções do registro"><button data-kj-tab="overview" class="${tab==="overview"?"active":""}"><i class="fa-solid fa-chart-line"></i> Visão geral</button><button data-kj-tab="genome" class="${tab==="genome"?"active":""}"><i class="fa-solid fa-dna"></i> Genoma</button><button data-kj-tab="stages" class="${tab==="stages"?"active":""}"><i class="fa-solid fa-bars-staggered"></i> Estágios</button><button data-kj-tab="history" class="${tab==="history"?"active":""}"><i class="fa-solid fa-clock-rotate-left"></i> Histórico</button><button data-kj-tab="notes" class="${tab==="notes"?"active":""}"><i class="fa-solid fa-note-sticky"></i> Notas</button></nav>
    <div class="kj-tab-body">${body}</div>
  </div>`;
}
