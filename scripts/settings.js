import { DATABASE_VERSION, DEFAULT_DATABASE, MODULE_ID, SETTINGS } from "./constants.js";

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.DATABASE, {
    name: "Banco de dados K-03",
    hint: "Armazenamento interno do módulo. Não depende de JournalEntry.",
    scope: "world",
    config: false,
    type: Object,
    default: foundry.utils.deepClone(DEFAULT_DATABASE),
    requiresReload: false
  });

  game.settings.register(MODULE_ID, SETTINGS.SIDEBAR_COLLAPSED, {
    name: "Aba de portadores recolhida",
    scope: "user",
    config: false,
    type: Boolean,
    default: false,
    requiresReload: false
  });

  game.settings.register(MODULE_ID, SETTINGS.LAST_CARRIER, {
    name: "Último portador aberto",
    scope: "user",
    config: false,
    type: String,
    default: "",
    requiresReload: false
  });

  game.settings.register(MODULE_ID, SETTINGS.SORT_MODE, {
    name: "Ordenação da lista K-03",
    scope: "user",
    config: false,
    type: String,
    default: "manual",
    requiresReload: false
  });
}

export function normalizeDatabase(database) {
  const source = database && typeof database === "object" ? database : {};
  const carriers = source.carriers && typeof source.carriers === "object" ? source.carriers : {};
  const order = Array.isArray(source.order) ? source.order.filter((id) => carriers[id]) : [];

  for (const id of Object.keys(carriers)) {
    if (!order.includes(id)) order.push(id);
  }

  return {
    schemaVersion: Number(source.schemaVersion) || DATABASE_VERSION,
    order,
    carriers
  };
}
