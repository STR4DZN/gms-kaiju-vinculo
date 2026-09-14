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

export function buildChatCardHTML(carrier) {
  const profile = getProfile(carrier.values);
  const reading = getReading(carrier.values);
  const v = clamp(carrier.values.vontade);
  const c = clamp(carrier.values.comunhao);
  const h = clamp(carrier.values.humanidade);
  const idCode = String(carrier.id || "K03").slice(0, 8).toUpperCase();
  const mutationsCount = carrier.genome?.mutations?.length ?? 0;

  return `<div class="kj-chat-card" style="--kj-v:#e85d48;--kj-c:#4ac8b7;--kj-h:#78abe1;">
    <header class="kj-chat-header">
      <div class="kj-chat-badge"><i class="fa-solid fa-dna"></i><span>K-03 // ${escapeHTML(idCode)}</span></div>
      <h3 class="kj-chat-title">${escapeHTML(carrier.name)}</h3>
      <small class="kj-chat-sub">${escapeHTML(carrier.designation || "REGISTRO DE PORTADOR")}</small>
    </header>
    <div class="kj-chat-vectors">
      <div class="kj-chat-vec" style="color:var(--kj-v)"><span>VONTADE</span><strong>${v}%</strong><small>Est. ${stageAt("vontade", v).roman}</small></div>
      <div class="kj-chat-vec" style="color:var(--kj-c)"><span>COMUNHÃO</span><strong>${c}%</strong><small>Est. ${stageAt("comunhao", c).roman}</small></div>
      <div class="kj-chat-vec" style="color:var(--kj-h)"><span>HUMANIDADE</span><strong>${h}%</strong><small>Est. ${stageAt("humanidade", h).roman}</small></div>
    </div>
    <div class="kj-chat-diagnosis">
      <i class="fa-solid fa-microscope"></i>
      <div>
        <small>DIAGNÓSTICO XENOGENÔMICO</small>
        <strong>${escapeHTML(reading)}</strong>
      </div>
    </div>
    <div class="kj-chat-meta">
      <span>DOMINANTE: <b>${escapeHTML(profile.dominant)}</b></span>
      <span>TENSÃO: <b>${profile.tension}%</b></span>
      <span>MUTAÇÕES: <b>${mutationsCount}</b></span>
    </div>
    ${carrier.description ? `<p class="kj-chat-desc">${escapeHTML(carrier.description)}</p>` : ""}
  </div>`;
}

function overviewHTML(carrier, profile) {
  const reading = getReading(carrier.values);
  return `${renderGenomePanel(carrier, { reading, profile })}
  <section class="kj-live-diagnosis">
    <div class="kj-diagnosis-main">
      <div class="kj-diagnosis-icon"><i class="fa-solid fa-heart-pulse"></i></div>
      <div class="kj-diagnosis-content">
        <div class="kj-diagnosis-label-row">
          <span class="kj-diagnosis-title">DIAGNÓSTICO CLÍNICO DO VÍNCULO</span>
          <span class="kj-diagnosis-badge">${escapeHTML(profile.dominant)}</span>
        </div>
        <p class="kj-diagnosis-desc">${escapeHTML(reading)}</p>
      </div>
    </div>
    <div class="kj-live-diagnosis-data">
      <div class="kj-diag-card"><small>MÉDIA VITAL</small><b>${profile.average}%</b></div>
      <div class="kj-diag-card"><small>CONVERGÊNCIA</small><b>${profile.balance}%</b></div>
      <div class="kj-diag-card"><small>TENSÃO</small><b>${profile.tension}%</b></div>
    </div>
  </section>`;
}

function stagesHTML(carrier) {
  return `<section class="kj-stage-matrix">${Object.entries(AXES).map(([key, axis]) => {
    const current = stageIndexAt(carrier.values[key]);
    return `<article class="kj-stage-axis" style="--kj-accent:${axis.accent};--kj-rgb:${axis.rgb}"><header><i class="fa-solid ${axis.icon}"></i><div><small>${axis.taxonomy}</small><strong>${axis.title}</strong></div><output>${clamp(carrier.values[key])}%</output></header><div class="kj-stage-rail">${axis.stages.map((stage, i) => `<div class="${i===current?"is-current":i<current?"is-passed":""}"><span>${STAGE_ROMAN[i]} · ${STAGE_LIMITS[i]}%</span><i class="fa-solid ${stage.icon}"></i><strong>${escapeHTML(stage.label)}</strong><small>${escapeHTML(stage.signal)}</small></div>`).join("")}</div></article>`;
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
  const idCode = String(carrier.id || "K03").slice(0, 8).toUpperCase();
  return `<div class="kj-detail-shell" data-carrier-id="${carrier.id}">
    <header class="kj-record-head">
      <div class="kj-record-ident"><span class="kj-record-mark"><i class="fa-solid fa-fingerprint"></i></span><div><small>REGISTRO MÉDICO // ${escapeHTML(idCode)}</small><h2>${escapeHTML(carrier.name)}</h2><p>${escapeHTML(carrier.designation || "REGISTRO DE PORTADOR")}</p></div></div>
      <div class="kj-record-vector">
        <div class="kj-header-vital-badge kj-v" title="Vontade da Fera"><span class="kj-vital-tag">FERA</span><strong class="kj-vital-num">${clamp(carrier.values.vontade)}%</strong></div>
        <div class="kj-header-vital-badge kj-c" title="Comunhão Simbiótica"><span class="kj-vital-tag">COMUNHÃO</span><strong class="kj-vital-num">${clamp(carrier.values.comunhao)}%</strong></div>
        <div class="kj-header-vital-badge kj-h" title="Integridade Humana"><span class="kj-vital-tag">HUMANO</span><strong class="kj-vital-num">${clamp(carrier.values.humanidade)}%</strong></div>
        <div class="kj-header-vital-badge kj-avg" title="Média dos Vetores"><span class="kj-vital-tag">MÉDIA</span><strong class="kj-vital-num">${profile.average}%</strong></div>
      </div>
      <div class="kj-record-link">${owners.length ? `<small>USUÁRIO VINCULADO</small><strong>${owners.map(escapeHTML).join(" / ")}</strong>` : `<small>USUÁRIO VINCULADO</small><strong>DESVINCULADO</strong>`}</div>
      <button type="button" class="kj-record-chat-btn" data-action="post-chat" title="Transmitir telemetria deste portador para o Chat"><i class="fa-solid fa-tower-broadcast"></i><span>CHAT</span></button>
    </header>
    ${carrier.description ? `<div class="kj-description">${escapeHTML(carrier.description)}</div>` : ""}
    <nav class="kj-tabs" aria-label="Seções do registro"><button data-kj-tab="overview" class="${tab==="overview"?"active":""}"><i class="fa-solid fa-dna"></i><span>ANÁLISE AO VIVO</span></button><button data-kj-tab="genome" class="${tab==="genome"?"active":""}"><i class="fa-solid fa-microscope"></i><span>MEMÓRIA GENÉTICA</span></button><button data-kj-tab="stages" class="${tab==="stages"?"active":""}"><i class="fa-solid fa-bars-staggered"></i><span>ESTÁGIOS</span></button><button data-kj-tab="history" class="${tab==="history"?"active":""}"><i class="fa-solid fa-clock-rotate-left"></i><span>HISTÓRICO</span></button><button data-kj-tab="notes" class="${tab==="notes"?"active":""}"><i class="fa-solid fa-note-sticky"></i><span>NOTAS</span></button></nav>
    <div class="kj-tab-body">${body}</div>
  </div>`;
}
