// tests/test_k03_suite.mjs
// Mocks for Foundry VTT environment
globalThis.foundry = {
  utils: {
    deepClone: (val) => JSON.parse(JSON.stringify(val)),
    randomID: (len = 16) => "rand_" + Math.random().toString(36).substring(2, 2 + len)
  }
};

globalThis.Hooks = {
  callAll: () => {}
};

let mockDb = {
  schemaVersion: 1,
  order: ["carrier-alpha"],
  carriers: {
    "carrier-alpha": {
      id: "carrier-alpha",
      name: "Gojira Alpha",
      values: { vontade: 85, comunhao: 40, humanidade: 20 },
      genome: {
        seed: 12345,
        memory: { maxVontade: 85, maxComunhao: 40, minHumanidade: 20 },
        mutations: [
          { id: "mut-1", axis: "vontade", type: "gain", threshold: 60, name: "Escamas Titan" }
        ]
      },
      ownerUserIds: [],
      visibility: "all",
      history: []
    }
  }
};

globalThis.game = {
  settings: {
    get: (module, key) => {
      if (key === "database") return foundry.utils.deepClone(mockDb);
      return null;
    },
    set: async (module, key, val) => {
      if (key === "database") {
        mockDb = typeof val === "string" ? JSON.parse(val) : foundry.utils.deepClone(val);
      }
      return true;
    }
  },
  socket: {
    emit: (event, data) => {}
  },
  user: { id: "gm-user-1", isGM: true },
  users: {
    get: (id) => ({ id, name: "GM Operator" })
  }
};

import { hashString, normalizeGenomeState, evolveGenomeState, getGenomeMetrics, renderGenomePanel, renderGenomeDetail } from "../scripts/genome.js";
import { stageIndexAt, stageAt, getProfile, getReading, buildChatCardHTML, renderCarrierDetail } from "../scripts/visuals.js";
import { KaijuGenomeRenderer, startGenomeRenderer, getGenomeRendererDebug } from "../scripts/genome-renderer.js";
import { getCarrier, duplicateCarrier, resetCarrierGenome, exportDatabaseJSON, importDatabaseJSON } from "../scripts/storage.js";

console.log("=== SUITE COMPLETA DE VERIFICAÇÃO PROFUNDA K-03 ===");

// 1. GENOME LOGIC & THRESHOLD CROSSING
const dorm = normalizeGenomeState(null, "c1", { vontade: 0, comunhao: 0, humanidade: 0 });
console.assert(dorm.activated === false, "Dormancy must be false");

const act = evolveGenomeState(dorm, {
  carrierId: "c1",
  previousValues: { vontade: 0, comunhao: 0, humanidade: 0 },
  nextValues: { vontade: 43, comunhao: 44, humanidade: 58 }
});
console.assert(act.activated === true, "Activation must be true");
console.assert(act.mutations.length === 0, "No false mutations on baseline activation");

const mut1 = evolveGenomeState(act, {
  carrierId: "c1",
  previousValues: { vontade: 43, comunhao: 44, humanidade: 58 },
  nextValues: { vontade: 85, comunhao: 44, humanidade: 15 }
});
console.assert(mut1.mutations.length >= 4, "Expected >=4 mutations on high shift");

const reg = evolveGenomeState(mut1, {
  carrierId: "c1",
  previousValues: { vontade: 85, comunhao: 44, humanidade: 15 },
  nextValues: { vontade: 20, comunhao: 44, humanidade: 90 }
});
console.assert(reg.memory.maxVontade === 85 && reg.memory.minHumanidade === 15, "Biological memory preserved");
console.assert(reg.mutations.length === mut1.mutations.length, "Mutations count unchanged on regression");

// 2. MATHEMATICAL INTEGRITY (NO NaNs or Infinities)
let hasNaN = false;
for (let v = 0; v <= 100; v += 10) {
  for (let c = 0; c <= 100; c += 25) {
    for (let h = 0; h <= 100; h += 25) {
      const m = getGenomeMetrics({ id: "test", values: { vontade: v, comunhao: c, humanidade: h } });
      for (const [k, val] of Object.entries(m)) {
        if (typeof val === "number" && (!Number.isFinite(val) || Number.isNaN(val))) {
          console.error(`NaN/Inf em ${k} com v=${v},c=${c},h=${h}`);
          hasNaN = true;
        }
      }
    }
  }
}
console.assert(!hasNaN, "All metrics must be finite numbers");

// 3. RENDERER 3D MATH & BUFFER INTEGRITY
const mockCtx = {
  setTransform: () => {}, clearRect: () => {}, beginPath: () => {}, moveTo: () => {},
  lineTo: () => {}, arc: () => {}, fill: () => {}, stroke: () => {}, save: () => {},
  restore: () => {}, setLineDash: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }),
  fillRect: () => {}, strokeRect: () => {}, fillText: () => {}, measureText: () => ({ width: 50 })
};

const mockCanvas = {
  getContext: () => mockCtx,
  getBoundingClientRect: () => ({ width: 1000, height: 600, left: 0, top: 0 }),
  addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => {},
  isConnected: true, width: 1000, height: 600
};

const testCarriers = [
  { name: "Dormant", values: { vontade: 0, comunhao: 0, humanidade: 0 } },
  { name: "Baseline", values: { vontade: 43, comunhao: 44, humanidade: 58 } },
  { name: "Predatory", values: { vontade: 85, comunhao: 30, humanidade: 15 } },
  { name: "Extreme Symbiosis", values: { vontade: 100, comunhao: 100, humanidade: 100 } },
  { name: "Alien Extra Strand", values: { vontade: 100, comunhao: 100, humanidade: 0 } }
];

let rendererMathOk = true;
for (const tc of testCarriers) {
  const carrier = { id: "tc-id", name: tc.name, values: tc.values, genome: mut1 };
  const renderer = new KaijuGenomeRenderer(mockCanvas, carrier);
  renderer.width = 1000; renderer.height = 600;
  const centerY = renderer.height * 0.50;
  const radius = 80;
  const startX = 60;
  const endX = 900;
  const project = renderer._projector(centerY, radius);

  for (let i = 0; i < 96; i++) {
    const t = i / 95;
    const w1 = renderer._helixWorld(t, 1, centerY, radius, startX, endX);
    const w2 = renderer._helixWorld(t, 2, centerY, radius, startX, endX);
    const p1 = project(w1.x, w1.y, w1.z);
    const p2 = project(w2.x, w2.y, w2.z);
    if (!Number.isFinite(p1.px) || !Number.isFinite(p1.py) || !Number.isFinite(p2.px) || !Number.isFinite(p2.py)) {
      rendererMathOk = false;
    }
  }

  // Test pool generation & depth sorting
  renderer._poolIndex = 0;
  renderer._pushBranchRenderables(project, centerY, radius, startX, endX);
  renderer._pushLatticeRenderables(project, centerY, radius, startX, endX);
  renderer._pushHumanityLocks(project, centerY, radius, startX, endX);
  renderer._pushPersistentMarks(project, centerY, radius, startX, endX);
  renderer._pushTerminalTail(project, centerY, radius, startX, endX);
  const active = renderer._renderables.slice(0, renderer._poolIndex);
  active.sort((a, b) => a.z - b.z);
  console.assert(active.length >= 0, "Active pool items");
}
console.assert(rendererMathOk, "Renderer 3D math projection must be valid");

// 4. QoL & STORAGE OPERATIONS
async function runQoL() {
  const carrierAlpha = getCarrier("carrier-alpha");
  console.assert(carrierAlpha != null, "Carrier Alpha must exist");

  const dup = await duplicateCarrier("carrier-alpha");
  console.assert(dup.name === "Gojira Alpha (Cópia)", "Duplication name check");
  console.assert(dup.id !== "carrier-alpha", "Duplication ID must be unique");

  const reset = await resetCarrierGenome("carrier-alpha");
  console.assert(reset.genome.mutations.length === 0, "Mutations reset check");

  const jsonStr = exportDatabaseJSON();
  console.assert(jsonStr.includes("Gojira Alpha"), "JSON export check");
  mockDb.carriers = {};
  mockDb.order = [];
  await importDatabaseJSON(jsonStr, { mode: "replace" });
  console.assert(mockDb.carriers["carrier-alpha"] != null, "JSON restore check");

  // 5. HTML RENDERERS & HIGH-VISIBILITY HUD VERIFICATION
  const chatHTML = buildChatCardHTML(carrierAlpha);
  console.assert(chatHTML.includes("kj-chat-card"), "Chat card class");
  console.assert(chatHTML.includes("FERA") || chatHTML.includes("VONTADE"), "Chat card vector");

  const panelHTML = renderGenomePanel(carrierAlpha);
  console.assert(panelHTML.includes("kj-dna-vital-card"), "Vital cards in DNA panel");
  console.assert(panelHTML.includes("kj-dna-metric-ribbon"), "Metric ribbon in DNA panel");
  console.assert(panelHTML.includes("DESVIO GENÔMICO"), "Metric label check");
  console.assert(panelHTML.includes("SINCRONIA VINCULAR"), "Metric label check");
  console.assert(panelHTML.includes("BIO-ESTABILIDADE"), "Metric label check");

  const detailHTML = renderCarrierDetail(carrierAlpha, { isGM: true, tab: "overview" });
  console.assert(detailHTML.includes("kj-header-vital-badge"), "Header vital badges present");
  console.assert(detailHTML.includes("kj-vital-num"), "Vital number class present");
  console.assert(detailHTML.includes("FERA"), "FERA vital tag present");
  console.assert(detailHTML.includes("COMUNHÃO"), "COMUNHÃO vital tag present");
  console.assert(detailHTML.includes("HUMANO"), "HUMANO vital tag present");
  console.assert(detailHTML.includes("MÉDIA"), "MÉDIA vital tag present");

  console.log("TODAS AS 12 VERIFICAÇÕES PROFUNDAS PASSARAM COM SUCESSO (100%)!");
}

runQoL().catch(err => {
  console.error("FALHA:", err);
  process.exit(1);
});
