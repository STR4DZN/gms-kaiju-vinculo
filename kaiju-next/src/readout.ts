/** Read-only rendering adapted from the user's K-03 v5.1.0 macro (Texto colado.txt).
 * Original vector assets and composition retained; no journal writes, dialogs or DNA renderer.
 */
import {AXES as DOMAIN_AXES, AXIS_KEYS, type AxisKey, type Values} from "./domain.ts";
const CARD_CLASS="kaiju-vinculo-card";
const UI_VERSION="0.1.0";
const UI_ICONS={triad:"fa-dragon",diagnosis:"fa-microscope"};
  const clamp = (value: number) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, Math.round(number)));
};

const escapeHTML = (value: unknown) => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  "\"": "&quot;"
})[character]!);

const STAGE_ROMAN = ["I", "II", "III", "IV", "V", "VI"];
const STAGE_LIMITS = [0, 20, 40, 60, 80, 100];
interface VisualStage {label:string;icon:string;signal:string}
interface VisualAxis {title:string;taxonomy:string;description:string;accent:string;accent2:string;rgb:string;shape:string;pattern:string;fill:string;stages:VisualStage[]}
const AXES:Record<AxisKey,VisualAxis> = {
  vontade: {
    title: "Vontade da Fera",
    taxonomy: "Pressão predatória",
    description: "A influência e a dominância do Kaiju sobre você.",
    accent: "#e85d48",
    accent2: "#d7a45a",
    rgb: "232,93,72",
    shape: "polygon(50% 0%, 90% 20%, 100% 68%, 50% 100%, 0% 68%, 10% 20%)",
    pattern: "repeating-linear-gradient(135deg, rgba(232,93,72,.045) 0 1px, transparent 1px 10px)",
    fill: "linear-gradient(90deg, #5d1720, #b83c37 58%, #d7a45a)",
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
    taxonomy: "Ressonância simbiótica",
    description: "Você aceita a fera interior em equilíbrio perfeito — ou quase.",
    accent: "#4ac8b7",
    accent2: "#9ae2d7",
    rgb: "74,200,183",
    shape: "circle(50% at 50% 50%)",
    pattern: "radial-gradient(circle at 14px 14px, rgba(74,200,183,.07) 0 1px, transparent 1.5px)",
    fill: "linear-gradient(90deg, #135259, #2f9f95 58%, #79d6c8)",
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
    taxonomy: "Integridade identitária",
    description: "O nível de resistência e rejeição da besta dentro de você.",
    accent: "#78abe1",
    accent2: "#d5e6f7",
    rgb: "120,171,225",
    shape: "polygon(50% 0%, 94% 15%, 88% 68%, 50% 100%, 12% 68%, 6% 15%)",
    pattern: "linear-gradient(rgba(120,171,225,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(120,171,225,.035) 1px, transparent 1px)",
    fill: "linear-gradient(90deg, #1b3e69, #4f82bd 60%, #b8d6f1)",
    stages: [
      { label: "Fronteiras Desfeitas", icon: "fa-ghost", signal: "Identidade dispersa" },
      { label: "Vestígios Humanos", icon: "fa-person-circle-question", signal: "Traços reconhecíveis" },
      { label: "Identidade Resistente", icon: "fa-id-card", signal: "Eu preservado" },
      { label: "Vontade Humana", icon: "fa-lightbulb", signal: "Consciência afirmada" },
      { label: "Rejeição Profunda", icon: "fa-user-shield", signal: "Barreira identitária" },
      { label: "Negação Absoluta", icon: "fa-fingerprint", signal: "Fronteira inviolável" }
    ]
  }
};

for (const key of AXIS_KEYS) {
  AXES[key].title=DOMAIN_AXES[key].title;
  AXES[key].description=DOMAIN_AXES[key].description;
  AXES[key].stages=DOMAIN_AXES[key].stages.map((stage,index)=>({...stage,icon:`fa-${stage.icon}`,signal:AXES[key].stages[index]!.signal}));
}

const svgDataURI = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const KAIJU_AMBIENT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="none">
<defs>
<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#4f7d83" stroke-width="1" opacity=".2"/><circle cx="1" cy="1" r="1" fill="#79c895" opacity=".28"/></pattern>
<style>@media (prefers-reduced-motion: reduce){.motion{display:none}}</style>
</defs>
<rect width="1200" height="800" fill="url(#grid)" opacity=".62"/>
<g fill="none" stroke="#58777d" stroke-width="1" opacity=".24">
<path d="M-90 188C36 74 170 82 258 174S430 308 566 212 790 58 930 146s214 224 360 92"/>
<path d="M-70 226C52 116 168 122 250 202s178 120 302 30 226-138 360-60 212 198 348 108"/>
<path d="M-120 650C42 520 194 548 294 634s198 102 326 12 238-124 376-30 210 128 304 70"/>
<path d="M-110 686C48 572 198 590 288 664s208 92 332 18 236-104 368-32 210 100 314 76"/>
</g>
<g class="motion" fill="none" stroke-linecap="square">
<path d="M-40 154H74l18-22 16 56 20-72 22 38h112l18-14 16 28 22-38 24 24h918" stroke="#e85d48" stroke-width="1.4" stroke-dasharray="12 26" opacity=".46"><animate attributeName="stroke-dashoffset" values="0;-76" dur="5.8s" repeatCount="indefinite"/><animate attributeName="opacity" values=".22;.54;.22" dur="4.6s" repeatCount="indefinite"/></path>
<path d="M-40 628H128l18-12 20 24 22-38 24 26h136l18-18 20 34 24-46 28 30h822" stroke="#4ac8b7" stroke-width="1.4" stroke-dasharray="7 23" opacity=".48"><animate attributeName="stroke-dashoffset" values="0;60" dur="6.7s" repeatCount="indefinite"/></path>
<path d="M82 86V40H212M988 40H1118V86M82 714V760H212M988 760H1118V714" stroke="#78abe1" stroke-width="1" stroke-dasharray="20 10" opacity=".38"><animate attributeName="stroke-dashoffset" values="0;-60" dur="10s" repeatCount="indefinite"/></path>
<g fill="#79c895" stroke="none"><circle cx="92" cy="132" r="3"><animate attributeName="opacity" values=".2;1;.2" dur="3.2s" repeatCount="indefinite"/><animate attributeName="r" values="2;4;2" dur="3.2s" repeatCount="indefinite"/></circle><circle cx="1108" cy="628" r="3"><animate attributeName="opacity" values="1;.2;1" dur="4.1s" repeatCount="indefinite"/></circle><circle cx="602" cy="402" r="2.5"><animate attributeName="opacity" values=".18;.9;.18" dur="3.7s" begin=".8s" repeatCount="indefinite"/></circle></g>
</g>
</svg>`;
const KAIJU_AMBIENT_DATA = svgDataURI(KAIJU_AMBIENT_SVG);
const kaijuAmbientHTML = () => `<img data-kj-player-ambient="true" src="${KAIJU_AMBIENT_DATA}" alt="" aria-hidden="true" draggable="false" style="position:absolute;inset:0;z-index:0;display:block;width:100%;height:100%;max-width:none;margin:0;padding:0;border:0;border-radius:0;opacity:.78;pointer-events:none;mix-blend-mode:screen;object-fit:cover;">`;

const kaijuScanHTML = (color = "#4ac8b7") => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="none"><defs><linearGradient id="field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0"/><stop offset=".68" stop-color="${color}" stop-opacity=".08"/><stop offset="1" stop-color="${color}" stop-opacity=".58"/></linearGradient><style>@media (prefers-reduced-motion: reduce){.motion{display:none}}</style></defs><g class="motion"><rect data-kj-sampling-plane="true" x="0" y="-30" width="1200" height="28" fill="url(#field)" opacity=".72"><animate attributeName="y" values="-30;830" dur="9.4s" begin=".8s" repeatCount="indefinite"/></rect><rect x="0" y="-3" width="1200" height="1.5" fill="${color}" opacity=".74"><animate attributeName="y" values="-3;827" dur="9.4s" begin=".8s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.74;.56;0" keyTimes="0;.05;.94;1" dur="9.4s" begin=".8s" repeatCount="indefinite"/></rect></g></svg>`;
  return `<img data-kj-player-scan="true" src="${svgDataURI(svg)}" alt="" aria-hidden="true" draggable="false" style="position:absolute;inset:0;z-index:4;display:block;width:100%;height:100%;max-width:none;margin:0;padding:0;border:0;border-radius:0;opacity:.76;pointer-events:none;mix-blend-mode:screen;object-fit:cover;">`;
};

const bioBusHTML = (values: Values) => {
  const channels = [
    { x: 0, value: clamp(values.vontade), color: AXES.vontade.accent },
    { x: 400, value: clamp(values.comunhao), color: AXES.comunhao.accent },
    { x: 800, value: clamp(values.humanidade), color: AXES.humanidade.accent }
  ];
  const segments = channels.map(({ x, value, color }, index) => {
    const end = x + 14 + Math.round(value * 3.72);
    const duration = (5.4 + index * .9).toFixed(1);
    return `<rect x="${x + 8}" y="3" width="384" height="4" fill="#263a42"/><rect x="${x + 8}" y="3" width="${Math.max(2, Math.round(value * 3.84))}" height="4" fill="${color}" opacity=".88"/><g class="motion"><circle cx="${x + 14}" cy="5" r="3" fill="${color}"><animate attributeName="cx" values="${x + 14};${end};${x + 14}" dur="${duration}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".18;1;.18" dur="${duration}s" repeatCount="indefinite"/></circle></g>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 10" preserveAspectRatio="none"><style>@media (prefers-reduced-motion: reduce){.motion{display:none}}</style><rect width="1200" height="10" fill="#04080b"/>${segments}<path d="M400 0V10M800 0V10" stroke="#82a4aa" opacity=".36"/></svg>`;
  return `<img data-kj-player-bus="true" src="${svgDataURI(svg)}" alt="" aria-hidden="true" draggable="false" style="display:block;width:100%;height:7px;max-width:none;margin:0;padding:0;border:0;border-radius:0;object-fit:fill;">`;
};

const kaijuRadarHTML = (values: Values, profile: ReturnType<typeof getProfile>) => {
  const pointAt = (value: number, degrees: number) => {
    const radians = degrees * Math.PI / 180;
    const radius = 18 + clamp(value) * .62;
    return { x: (90 + Math.cos(radians) * radius).toFixed(1), y: (90 + Math.sin(radians) * radius).toFixed(1) };
  };
  const dominant = AXES[profile.dominantKey];
  const sweepDuration = Math.max(5.8, 8.8 - profile.average * .03).toFixed(2);
  const contacts = [
    { key: "F", value: values.vontade, color: AXES.vontade.accent, point: pointAt(values.vontade, -90) },
    { key: "C", value: values.comunhao, color: AXES.comunhao.accent, point: pointAt(values.comunhao, 30) },
    { key: "H", value: values.humanidade, color: AXES.humanidade.accent, point: pointAt(values.humanidade, 150) }
  ].map(({ key, value, color, point }, index) => {
    const duration = Math.max(2.1, 3.9 - clamp(value) * .016).toFixed(2);
    return `<g><path d="M90 90L${point.x} ${point.y}" stroke="${color}" stroke-width="1" stroke-dasharray="3 7" opacity=".42"/><circle cx="${point.x}" cy="${point.y}" r="3.2" fill="${color}"/><circle class="motion" cx="${point.x}" cy="${point.y}" r="4" fill="none" stroke="${color}" stroke-width="1"><animate attributeName="r" values="4;11;4" dur="${duration}s" begin="${(index * .45).toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;0;.9" dur="${duration}s" begin="${(index * .45).toFixed(2)}s" repeatCount="indefinite"/></circle><text x="${point.x}" y="${Number(point.y) - 7}" fill="${color}" font-family="monospace" font-size="7" font-weight="700" text-anchor="middle">${key}${clamp(value)}</text></g>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><defs><radialGradient id="radar"><stop offset="0" stop-color="#173038" stop-opacity=".52"/><stop offset="1" stop-color="#050a0e" stop-opacity=".94"/></radialGradient><style>@media (prefers-reduced-motion: reduce){.motion{display:none}}</style></defs><rect width="180" height="180" fill="url(#radar)"/><g fill="none" stroke="#5d858a" opacity=".42"><circle cx="90" cy="90" r="22"/><circle cx="90" cy="90" r="44"/><circle cx="90" cy="90" r="66"/><circle cx="90" cy="90" r="84"/><path d="M6 90H174M90 6V174M31 31L149 149M149 31L31 149" stroke-dasharray="2 7"/></g><g class="motion"><path d="M90 90L90 6A84 84 0 0 1 149 31Z" fill="${dominant.accent}" opacity=".1"><animateTransform attributeName="transform" type="rotate" values="0 90 90;360 90 90" dur="${sweepDuration}s" repeatCount="indefinite"/></path><path d="M90 90V6" stroke="${dominant.accent}" stroke-width="1.4" opacity=".68"><animateTransform attributeName="transform" type="rotate" values="0 90 90;360 90 90" dur="${sweepDuration}s" repeatCount="indefinite"/></path></g>${contacts}<path d="M90 77L101 83V97L90 103L79 97V83Z" fill="#071014" stroke="${dominant.accent}" stroke-width="1.4"/><circle class="motion" cx="90" cy="90" r="15" fill="none" stroke="#79c895" opacity=".6"><animate attributeName="r" values="12;20;12" dur="3.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".64;.08;.64" dur="3.6s" repeatCount="indefinite"/></circle></svg>`;
  return `<img data-kj-kaiju-radar="true" data-kj-radar-average="${profile.average}" src="${svgDataURI(svg)}" alt="Radar: influência ${values.vontade}%, sincronia ${values.comunhao}%, identidade ${values.humanidade}%" draggable="false" style="display:block;width:164px;height:164px;max-width:100%;margin:0 auto;padding:0;border:1px solid #46656b;border-radius:0;box-shadow:inset 0 0 24px rgba(0,0,0,.5),0 0 18px ${dominant.accent}18;object-fit:contain;">`;
};

const bioSignatureHTML = (values: Values) => {
  const wavePath = (y: number, value: number) => {
    const amp = Math.max(2, Math.round(clamp(value) * .075));
    return `M0 ${y}H28L38 ${y - amp}L48 ${y + amp}L59 ${y - Math.ceil(amp * .58)}L70 ${y}H118L128 ${y - amp}L138 ${y + amp}L150 ${y}H208L218 ${y - Math.ceil(amp * .7)}L228 ${y + Math.ceil(amp * .7)}L240 ${y}H360`;
  };
  const tracks = [
    { y: 10, value: values.vontade, color: AXES.vontade.accent },
    { y: 24, value: values.comunhao, color: AXES.comunhao.accent },
    { y: 38, value: values.humanidade, color: AXES.humanidade.accent }
  ].map(({ y, value, color }, index) => {
    const path = wavePath(y, value);
    const duration = (4.4 + index * .8).toFixed(1);
    return `<path d="${path}" fill="none" stroke="${color}" stroke-width="1" opacity=".24"/><path class="motion" d="${path}" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="10 20" opacity=".86"><animate attributeName="stroke-dashoffset" values="0;-60" dur="${duration}s" repeatCount="indefinite"/></path>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 48" preserveAspectRatio="none"><style>@media (prefers-reduced-motion: reduce){.motion{display:none}}</style><path d="M0 10H360M0 24H360M0 38H360" stroke="#466069" stroke-width="1" opacity=".26"/>${tracks}</svg>`;
  return `<img data-kj-biosignature="true" src="${svgDataURI(svg)}" alt="" aria-hidden="true" draggable="false" style="display:block;width:100%;height:44px;max-width:none;margin:6px 0 0;padding:0;border:0;border-radius:0;object-fit:fill;">`;
};

const metricSignalHTML = (value: number, color: string, phase = 0) => {
  const safe = clamp(value);
  const end = 8 + Math.round(safe * 1.34);
  const duration = (3.2 + phase * .5).toFixed(1);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 8" preserveAspectRatio="none"><style>@media (prefers-reduced-motion: reduce){.motion{display:none}}</style><path d="M8 4H142" stroke="#30464e" stroke-width="2"/><path d="M8 4H${end}" stroke="${color}" stroke-width="2.5"/><g class="motion"><circle cx="${end}" cy="4" r="2" fill="${color}"><animate attributeName="r" values="1.3;2.6;1.3" dur="${duration}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".35;1;.35" dur="${duration}s" repeatCount="indefinite"/></circle></g></svg>`;
  return `<img data-kj-metric-signal="true" src="${svgDataURI(svg)}" alt="" aria-hidden="true" draggable="false" style="display:block;width:100%;height:7px;max-width:none;margin:6px 0 0;padding:0;border:0;border-radius:0;object-fit:fill;">`;
};

const axisTelemetryHTML = (key: AxisKey, value: number) => {
  const axis = AXES[key];
  const safe = clamp(value);
  const stage = stageAt(key, safe);
  const end = 20 + Math.round(safe * 9.6);
  const duration = Math.max(3.2, 6.2 - safe * .026).toFixed(2);
  const markers = [212, 404, 596, 788].map((x) => `<path d="M${x} 18V30" stroke="#789097" stroke-width="1" opacity=".42"/>`).join("");
  let signature;
  if (key === "vontade") {
    const amp = 3 + Math.round(safe * .07);
    signature = `<path d="M20 11H116L128 ${11 - amp}L142 ${11 + amp}L156 11H290L304 ${11 - Math.ceil(amp * .7)}L318 ${11 + Math.ceil(amp * .7)}L334 11H510L524 ${11 - amp}L538 ${11 + amp}L552 11H982" fill="none" stroke="${axis.accent}" stroke-width="1.4" stroke-dasharray="10 22" opacity=".7"><animate attributeName="stroke-dashoffset" values="0;-64" dur="${duration}s" repeatCount="indefinite"/></path>`;
  } else if (key === "comunhao") {
    const amp = 2 + Math.round(safe * .045);
    signature = `<path d="M20 11Q70 ${11 - amp} 120 11T220 11T320 11T420 11T520 11T620 11T720 11T820 11T920 11T982 11" fill="none" stroke="${axis.accent}" stroke-width="1.3" stroke-dasharray="12 18" opacity=".76"><animate attributeName="stroke-dashoffset" values="0;-60" dur="${duration}s" repeatCount="indefinite"/></path><path d="M20 11Q70 ${11 + amp} 120 11T220 11T320 11T420 11T520 11T620 11T720 11T820 11T920 11T982 11" fill="none" stroke="${axis.accent2}" stroke-width="1" stroke-dasharray="7 23" opacity=".46"><animate attributeName="stroke-dashoffset" values="0;60" dur="${(Number(duration) + .8).toFixed(2)}s" repeatCount="indefinite"/></path>`;
  } else {
    signature = Array.from({ length: 6 }, (_, index) => {
      const x = 48 + index * 156;
      const active = index <= stage.index;
      return `<path d="M${x} 4L${x + 10} 9V18L${x} 23L${x - 10} 18V9Z" fill="${active ? axis.accent : "none"}" fill-opacity="${active ? ".14" : "0"}" stroke="${active ? axis.accent : "#52666e"}" opacity="${active ? ".8" : ".32"}">${index === stage.index ? `<animate attributeName="opacity" values=".38;1;.38" dur="3.4s" repeatCount="indefinite"/>` : ""}</path>`;
    }).join("");
  }
  const packet = safe > 0 ? `<circle cx="20" cy="24" r="3" fill="${axis.accent}"><animate attributeName="cx" values="20;${end};20" dur="${duration}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".2;1;.2" dur="${duration}s" repeatCount="indefinite"/></circle>` : `<circle cx="20" cy="24" r="2.5" fill="${axis.accent}"><animate attributeName="opacity" values=".25;.9;.25" dur="3.8s" repeatCount="indefinite"/></circle>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 34" preserveAspectRatio="none"><style>@media (prefers-reduced-motion: reduce){.motion{display:none}}</style><path d="M20 24H980" stroke="#2f444b" stroke-width="3"/>${markers}<path d="M20 24H${end}" stroke="${axis.accent}" stroke-width="4"/>${signature}<g class="motion">${packet}<circle cx="${end}" cy="24" r="3" fill="${axis.accent}"><animate attributeName="r" values="2;4;2" dur="2.8s" repeatCount="indefinite"/><animate attributeName="opacity" values=".35;1;.35" dur="2.8s" repeatCount="indefinite"/></circle></g></svg>`;
  return `<img data-kj-axis-telemetry="${key}" data-kj-axis-progress="${safe}" src="${svgDataURI(svg)}" alt="" aria-hidden="true" draggable="false" style="display:block;width:100%;height:30px;max-width:none;margin:7px 0 5px;padding:0;border:1px solid rgba(${axis.rgb},.22);border-radius:0;background:rgba(3,7,10,.48);object-fit:fill;">`;
};

const stageIndexAt = (value: number) => {
  const safe = clamp(value);
  return safe === 100 ? 5 : Math.floor(safe / 20);
};

const stageAt = (key: AxisKey, value: number) => {
  const index = stageIndexAt(value);
  return { ...AXES[key].stages[index]!, index, roman: STAGE_ROMAN[index]! };
};

const getStates = (values: Values) => ({
  vontade: stageAt("vontade", values.vontade).label,
  comunhao: stageAt("comunhao", values.comunhao).label,
  humanidade: stageAt("humanidade", values.humanidade).label
});

const getReading = ({ vontade, comunhao, humanidade }: Values) => {
  if (vontade === 0 && comunhao === 0 && humanidade === 0) {
    return "O vínculo ainda permanece silencioso.";
  }

  if (comunhao >= 80 && Math.abs(vontade - humanidade) <= 20) {
    return "As duas vontades se reconhecem e agem em um equilíbrio quase perfeito.";
  }

  if (vontade >= 80 && humanidade >= 80) {
    return "Fera e humanidade recusam ceder; o vínculo está sob tensão extrema.";
  }

  if (comunhao >= vontade && comunhao >= humanidade) {
    return "A comunhão estabiliza a fronteira entre a fera e a identidade humana.";
  }

  if (vontade > humanidade) {
    return "A vontade do Kaiju avança sobre a identidade humana.";
  }

  if (humanidade > vontade) {
    return "A identidade humana resiste ao avanço da fera.";
  }

  return "Nenhuma vontade domina; o vínculo permanece instável.";
};

const getProfile = (values: Values) => {
  const entries = AXIS_KEYS.map(key => ({
    key,
    value: clamp(values[key]),
    title: AXES[key].title,
    accent: AXES[key].accent
  }));
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  const maximum = sorted[0]!.value;
  const minimum = sorted.at(-1)!.value;
  const spread = maximum - minimum;
  const average = Math.round(entries.reduce((total, entry) => total + entry.value, 0) / entries.length);
  const balance = 100 - spread;
  const tension = Math.abs(values.vontade - values.humanidade);
  const convergent = spread <= 10;

  return {
    dominant: convergent ? "Tríade convergente" : sorted[0]!.title,
    dominantKey: (convergent ? "comunhao" : sorted[0]!.key) as AxisKey,
    average,
    balance,
    spread,
    tension,
    code: convergent ? "CONVERGENCE" : `${sorted[0]!.key.toUpperCase()}-LEAD`
  };
};

  const buildMeter = ({ key, value }: {key:AxisKey;value:number}) => {
  const axis = AXES[key];
  const stage = stageAt(key, value);
  const motionProfile = key === "vontade"
    ? "pulso-sismico"
    : key === "comunhao"
      ? "ressonancia-em-fase"
      : "malha-de-contencao";
  const absoluteFera = key === "vontade" && stage.index === 5;
  const iconShape = absoluteFera
    ? "polygon(50% 0%, 63% 13%, 84% 8%, 82% 28%, 100% 43%, 88% 60%, 92% 83%, 67% 82%, 50% 100%, 33% 82%, 8% 83%, 12% 60%, 0% 43%, 18% 28%, 16% 8%, 37% 13%)"
    : axis.shape;
  const panelAlpha = (0.08 + value * 0.00135).toFixed(3);
  const markers = [20, 40, 60, 80]
    .map((position) => `<span aria-hidden="true" style="position: absolute; top: 0; bottom: 0; left: ${position}%; width: 1px; background: rgba(241,247,251,.28);"></span>`)
    .join("");
  const stageRail = axis.stages.map((entry, index) => {
    const current = index === stage.index;
    const passed = index < stage.index;
    const color = current ? axis.accent : passed ? `rgba(${axis.rgb},.66)` : "#667485";
    const background = current ? `rgba(${axis.rgb},.15)` : passed ? `rgba(${axis.rgb},.06)` : "rgba(4,7,11,.42)";
    const border = current ? `rgba(${axis.rgb},.78)` : passed ? `rgba(${axis.rgb},.25)` : "rgba(112,132,155,.18)";
    return `
      <span title="${STAGE_LIMITS[index]}% — ${escapeHTML(entry.label)}" style="display: grid; place-items: center; gap: 2px; min-height: 36px; padding: 3px 2px; color: ${color}; background: ${background}; border: 1px solid ${border}; box-shadow: ${current ? `inset 0 -3px ${axis.accent}, 0 0 10px rgba(${axis.rgb},.18)` : "none"}; font-family: Consolas, monospace; text-align: center;">
        <i class="fa-solid ${entry.icon}" aria-hidden="true" style="font-size: 10px;"></i>
        <small style="font-size: 8px; font-weight: 900; letter-spacing: .5px;">${STAGE_ROMAN[index]} · ${STAGE_LIMITS[index]}</small>
      </span>`;
  }).join("");

  return `
  <div data-kaiju-meter="${key}" data-kaiju-stage="${stage.index}" data-kj-motion-profile="${motionProfile}" style="position: relative; margin: 0 0 9px; padding: 11px 12px; overflow: hidden; background: ${axis.pattern}, radial-gradient(circle at 0% 46%, rgba(${axis.rgb},${panelAlpha}), transparent 48%), linear-gradient(145deg, rgba(17,29,35,.94), rgba(5,10,14,.97)); background-size: 28px 28px, auto, auto; border: 1px solid rgba(${axis.rgb},.54); border-left: 5px solid ${axis.accent}; clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%); box-shadow: inset 0 0 38px rgba(0,0,0,.4), 0 5px 15px rgba(0,0,0,.28);">
    <span aria-hidden="true" style="position: absolute; top: 0; right: 0; width: 70px; height: 3px; background: linear-gradient(90deg, transparent, ${axis.accent}); box-shadow: 0 0 12px rgba(${axis.rgb},.55);"></span>
    <div style="display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 9px;">
      <div style="display: flex; flex: 1 1 300px; align-items: center; gap: 10px; min-width: 0;">
        <div role="img" aria-label="${escapeHTML(stage.label)}" style="box-sizing: border-box; display: flex; flex: 0 0 ${absoluteFera ? "52px" : "48px"}; align-items: center; justify-content: center; width: ${absoluteFera ? "52px" : "48px"}; height: ${absoluteFera ? "52px" : "48px"}; padding: 2px; color: ${axis.accent}; background: ${absoluteFera ? `radial-gradient(circle, #ffd08a 0 12%, ${axis.accent} 42%, #65101c 78%)` : `linear-gradient(145deg, ${axis.accent2}, rgba(${axis.rgb},.28) 48%, ${axis.accent})`}; clip-path: ${iconShape}; filter: drop-shadow(0 0 ${absoluteFera ? "17px" : `${7 + stage.index * 2}px`} rgba(${axis.rgb},${absoluteFera ? ".8" : ".38"}));">
          <span style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: ${absoluteFera ? "radial-gradient(circle, #2b0b10, #07090d 72%)" : "#080b10"}; clip-path: ${iconShape};">
            <i class="fa-solid ${stage.icon}" aria-hidden="true" style="font-size: ${absoluteFera ? "25px" : "20px"}; text-shadow: 0 0 14px rgba(${axis.rgb},.8);"></i>
          </span>
        </div>
        <div style="min-width: 0;">
          <div style="color: ${axis.accent}; font-family: Consolas, monospace; font-size: 8px; font-weight: 900; letter-spacing: 1.8px; text-transform: uppercase;">K-03 // ${axis.taxonomy} // Canal ${stage.roman}</div>
          <div style="margin-top: 3px; color: #f2f5f7; font-size: 15px; font-weight: 900; letter-spacing: 1px; line-height: 1.1; text-transform: uppercase;">${axis.title}</div>
          <div style="margin-top: 3px; color: #aeb9c5; font-size: 10px; line-height: 1.3;">${axis.description}</div>
        </div>
      </div>
      <div data-kaiju-percent style="box-sizing: border-box; display: grid; grid-template-columns: auto auto; align-items: end; gap: 4px; flex: 0 0 auto; min-width: 92px; padding: 6px 8px; color: ${axis.accent}; background: #05090e; border: 1px solid rgba(${axis.rgb},.58); clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px); font-family: Consolas, monospace; box-shadow: inset 0 0 15px rgba(${axis.rgb},.08);">
        <strong style="font-size: 21px; line-height: .9; text-shadow: 0 0 12px rgba(${axis.rgb},.55);">${value}</strong>
        <span style="font-size: 11px; font-weight: 900;">%</span>
        <small style="grid-column: 1 / -1; margin-top: 2px; color: #8795a5; font-size: 8px; font-weight: 800; letter-spacing: .7px; text-transform: uppercase;">ESTÁGIO ${stage.roman} / ${stage.index + 1}.6</small>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(6,minmax(34px,1fr)); gap: 3px; margin: 9px 0 7px;">${stageRail}</div>
    ${axisTelemetryHTML(key, value)}
    <div role="meter" aria-label="${escapeHTML(axis.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}" style="position: relative; height: 13px; padding: 2px; overflow: hidden; background: #030609; border: 1px solid rgba(${axis.rgb},.38); box-shadow: inset 0 2px 7px rgba(0,0,0,.95);">
      <div style="width: ${value}%; height: 100%; min-width: ${value > 0 ? "3px" : "0"}; background: ${axis.fill}; box-shadow: 0 0 13px rgba(${axis.rgb},.7);"></div>
      ${markers}
    </div>

    <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px; margin-top: 6px; font-family: Consolas, monospace; font-size: 8px; font-weight: 800; letter-spacing: .7px; text-transform: uppercase;">
      <span style="color: #778699;">${motionProfile.replaceAll("-", " ")} // AMPLITUDE 000—100</span>
      <span style="color: ${axis.accent};"><i class="fa-solid ${stage.icon}" aria-hidden="true" style="margin-right: 5px;"></i>${stage.signal} // ${stage.label}</span>
    </div>
  </div>`;
};

export const renderReadout = (values: Values) => {
  const reading = getReading(values);
  const profile = getProfile(values);
  const states = getStates(values);
  const dominantAxis = AXES[profile.dominantKey];
  const containmentBand = profile.balance >= 75 ? "ESTÁVEL" : profile.balance >= 40 ? "OSCILANTE" : "CRÍTICA";
  const containmentColor = profile.balance >= 75 ? "#79c895" : profile.balance >= 40 ? "#d7a45a" : "#e85d48";
  const metricCard = (label: string, value: number, color: string, signal: string, phase: number) => `<div data-kj-summary-metric="${signal}" style="position:relative;min-width:0;padding:8px 8px 7px;overflow:hidden;background:radial-gradient(circle at 92% 16%,${color}16 0 1px,transparent 1.3px),linear-gradient(150deg,rgba(16,28,34,.94),rgba(4,9,13,.92));background-size:11px 11px,auto;border:1px solid ${color}55;border-top:3px solid ${color};box-shadow:inset 0 1px 0 rgba(255,255,255,.025);"><strong style="display:block;color:${color};font:900 16px/1 Consolas,monospace;">${value}%</strong><small style="display:block;margin-top:3px;color:#85999c;font:800 8px/1.2 Consolas,monospace;letter-spacing:.7px;text-transform:uppercase;">${label}</small>${metricSignalHTML(value, color, phase)}</div>`;

  return `
<section class="${CARD_CLASS}" data-ui-version="${UI_VERSION}" data-player-motion="embedded-svg" data-kj-layout="xeno-containment" data-kj-containment="${containmentBand}" data-vontade="${values.vontade}" data-comunhao="${values.comunhao}" data-humanidade="${values.humanidade}" style="position:relative;isolation:isolate;overflow:hidden;padding:0;color:#edf2ef;background:repeating-linear-gradient(180deg,transparent 0 3px,rgba(255,255,255,.014) 3px 4px),radial-gradient(circle at 12% 2%,rgba(232,93,72,.13),transparent 30%),radial-gradient(circle at 88% 0%,rgba(74,200,183,.1),transparent 28%),linear-gradient(155deg,#101b22 0%,#04080b 72%,#0a1217 100%);border:1px solid #4d7177;border-radius:0;box-shadow:0 0 0 2px #020406,7px 7px 0 rgba(0,0,0,.34),inset 0 0 64px rgba(0,0,0,.48);font-family:'Roboto Condensed','Arial Narrow',Arial,sans-serif;">
${kaijuAmbientHTML()}
<div data-kj-player-content="true" style="position:relative;z-index:1;">
  ${bioBusHTML(values)}
  <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:7px 12px;color:#91a7a9;background:linear-gradient(90deg,rgba(22,36,42,.96),rgba(5,10,14,.94));border-bottom:1px solid #416168;font-family:Consolas,monospace;font-size:8px;font-weight:800;letter-spacing:1.15px;text-transform:uppercase;">
    <span style="display:inline-flex;align-items:center;gap:7px;"><span style="display:inline-block;width:7px;height:7px;background:#79c895;border:1px solid #bfe8cd;border-radius:50%;box-shadow:0 0 9px rgba(121,200,149,.76);"></span>GMS // XENOBIOLOGICAL CONTAINMENT ARRAY</span>
    <span style="color:${containmentColor};">K-03 · ${UI_VERSION} · CONTENÇÃO ${containmentBand}</span>
  </div>

  <div style="padding:13px;">
    <div style="display:flex;flex-wrap:wrap;align-items:stretch;gap:9px;margin-bottom:10px;">
      <div style="display:flex;flex:1.05 1 300px;min-width:0;flex-direction:column;justify-content:space-between;padding:12px 13px;background:repeating-linear-gradient(135deg,rgba(255,255,255,.012) 0 1px,transparent 1px 8px),linear-gradient(130deg,rgba(116,34,38,.34),rgba(16,29,35,.86) 44%,rgba(4,9,13,.9));border:1px solid #49676d;border-left:5px solid #d84b58;clip-path:polygon(0 0,calc(100% - 15px) 0,100% 15px,100% 100%,0 100%);">
        <div style="display:flex;align-items:center;gap:10px;">
          <div role="img" aria-label="Matriz xenobiológica do vínculo" style="display:grid;flex:0 0 52px;place-items:center;width:52px;height:52px;color:#e46a73;background:radial-gradient(circle,rgba(216,75,88,.23),transparent 68%),#060b0e;border:1px solid #a64750;clip-path:polygon(50% 0,100% 25%,88% 78%,50% 100%,12% 78%,0 25%);box-shadow:inset 0 0 18px rgba(216,75,88,.12);">
            <i class="fa-solid ${UI_ICONS.triad}" aria-hidden="true" style="font-size:22px;text-shadow:0 0 13px rgba(216,75,88,.62);"></i>
          </div>
          <div style="min-width:0;">
            <div style="color:#8fa7aa;font:900 8px/1.2 Consolas,monospace;letter-spacing:1.8px;text-transform:uppercase;">MONITORAMENTO DE PORTADOR // PROTOCOLO K-03</div>
            <div style="margin-top:4px;color:#f1f4f1;font-size:23px;font-weight:900;letter-spacing:1.4px;line-height:1;text-transform:uppercase;">Vínculo Kaiju</div>
            <div style="margin-top:5px;color:#a7b7b8;font-size:10px;line-height:1.35;">Instinto predatório, ressonância simbiótica e integridade humana sob observação simultânea.</div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:10px;">
          <span style="padding:4px 7px;color:${dominantAxis.accent};background:${dominantAxis.accent}12;border:1px solid ${dominantAxis.accent}55;font:800 8px/1.2 Consolas,monospace;letter-spacing:.8px;text-transform:uppercase;">ASSINATURA DOMINANTE · ${escapeHTML(profile.dominant)}</span>
          <span style="padding:4px 7px;color:${containmentColor};background:${containmentColor}10;border:1px solid ${containmentColor}55;font:800 8px/1.2 Consolas,monospace;letter-spacing:.8px;text-transform:uppercase;">MALHA ${containmentBand}</span>
          <span style="padding:4px 7px;color:#a9b8b9;background:rgba(5,10,13,.58);border:1px solid #38535a;font:800 8px/1.2 Consolas,monospace;letter-spacing:.8px;text-transform:uppercase;">${profile.code}</span>
        </div>
      </div>

      <div style="display:flex;flex:1.35 1 390px;min-width:min(100%,300px);flex-wrap:wrap;align-items:stretch;gap:7px;padding:8px;background:linear-gradient(145deg,rgba(13,26,31,.92),rgba(3,8,11,.86));border:1px solid #416068;">
        <div style="display:flex;flex:0 1 178px;min-width:160px;flex-direction:column;justify-content:center;padding:6px;background:rgba(3,8,11,.54);border:1px solid #324e55;">
          <div style="display:flex;justify-content:space-between;gap:7px;margin:0 3px 5px;color:#7f989b;font:800 7px/1.2 Consolas,monospace;letter-spacing:.8px;text-transform:uppercase;"><span>RADAR DE CONTENÇÃO</span><span>3 ALVOS</span></div>
          ${kaijuRadarHTML(values, profile)}
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(88px,1fr));gap:6px;flex:1 1 205px;min-width:200px;align-content:start;">
          ${metricCard("Média vetorial", profile.average, dominantAxis.accent, "average", 0)}
          ${metricCard("Convergência", profile.balance, "#4ac8b7", "balance", 1)}
          ${metricCard("Fera × Humano", profile.tension, "#e85d48", "tension", 2)}
          ${metricCard("Dispersão total", profile.spread, "#78abe1", "spread", 3)}
          <div style="grid-column:1/-1;padding:7px 8px 5px;background:rgba(3,8,11,.54);border:1px solid #324e55;">
            <div style="display:flex;justify-content:space-between;gap:8px;color:#829a9d;font:800 7px/1.2 Consolas,monospace;letter-spacing:.8px;text-transform:uppercase;"><span>BIOASSINATURA COMPOSTA</span><span>LEITURA VISUAL</span></div>
            ${bioSignatureHTML(values)}
          </div>
        </div>
      </div>
    </div>

    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:7px;margin-bottom:8px;padding:6px 9px;color:#91a7a9;background:linear-gradient(90deg,rgba(232,93,72,.06),rgba(12,24,29,.82) 38%,rgba(74,200,183,.05));border:1px solid #3b5960;border-left:4px solid ${dominantAxis.accent};font:800 8px/1.25 Consolas,monospace;letter-spacing:.9px;text-transform:uppercase;">
      <span>// TRÊS CANAIS INDEPENDENTES · LEITURA BIOSSIMBIÓTICA ATIVA</span>
      <span style="color:${containmentColor};">MALHA ${containmentBand} · DISPERSÃO ${profile.spread}%</span>
    </div>

    ${buildMeter({ key: "vontade", value: values.vontade })}
    ${buildMeter({ key: "comunhao", value: values.comunhao })}
    ${buildMeter({ key: "humanidade", value: values.humanidade })}

    <div style="display:flex;flex-wrap:wrap;align-items:stretch;gap:8px;margin-top:9px;">
      <div style="display:flex;flex:2 1 310px;align-items:flex-start;gap:9px;padding:10px 11px;background:linear-gradient(135deg,rgba(121,200,149,.07),rgba(4,9,12,.7));border:1px solid rgba(127,164,167,.3);border-left:4px solid ${containmentColor};">
        <div style="display:flex;flex:0 0 38px;align-items:center;justify-content:center;width:38px;height:38px;color:${containmentColor};background:#050a0d;border:1px solid ${containmentColor}66;clip-path:polygon(50% 0,100% 25%,88% 78%,50% 100%,12% 78%,0 25%);"><i class="fa-solid ${UI_ICONS.diagnosis}" aria-hidden="true" style="font-size:15px;"></i></div>
        <div style="min-width:0;"><div style="color:#8ba1a4;font:900 8px/1.2 Consolas,monospace;letter-spacing:1.6px;text-transform:uppercase;">SÍNTESE OPERACIONAL // DIAGNÓSTICO ATUAL</div><div style="margin-top:6px;color:#e1e9e5;font-size:12px;line-height:1.5;">${escapeHTML(reading)}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr;gap:4px;flex:1 1 230px;padding:9px;background:rgba(4,9,12,.7);border:1px solid #39555c;font:800 8px/1.25 Consolas,monospace;">
        <span style="display:flex;justify-content:space-between;gap:8px;padding:4px 5px;color:#8ca0a2;border-bottom:1px solid rgba(126,160,163,.14);"><b style="color:${AXES.vontade.accent};">FERA // SÍSMICO</b><span>${escapeHTML(states.vontade)}</span></span>
        <span style="display:flex;justify-content:space-between;gap:8px;padding:4px 5px;color:#8ca0a2;border-bottom:1px solid rgba(126,160,163,.14);"><b style="color:${AXES.comunhao.accent};">COMUNHÃO // FASE</b><span>${escapeHTML(states.comunhao)}</span></span>
        <span style="display:flex;justify-content:space-between;gap:8px;padding:4px 5px;color:#8ca0a2;"><b style="color:${AXES.humanidade.accent};">HUMANO // MALHA</b><span>${escapeHTML(states.humanidade)}</span></span>
      </div>
    </div>
  </div>

  <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;padding:8px 12px;color:#72878a;background:#04090c;border-top:1px solid #314c53;font:800 8px/1.3 Consolas,monospace;letter-spacing:.9px;text-transform:uppercase;">
    <span>DADOS DERIVADOS SÃO LEITURA VISUAL · EIXOS BASE PERMANECEM INDEPENDENTES</span>
    <span>K-03 // VÍNCULO KAIJU</span>
  </div>
</div>
${kaijuScanHTML(dominantAxis.accent)}
</section>`;
};

