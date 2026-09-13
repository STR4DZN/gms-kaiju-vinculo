export const MODULE_ID = "gms-kaiju-vinculo";
export const MODULE_TITLE = "GMS // Vínculo Kaiju";
export const MODULE_VERSION = "2.0.0-dev.6";
export const DATABASE_VERSION = 2;

export const SETTINGS = Object.freeze({
  DATABASE: "database",
  SIDEBAR_COLLAPSED: "sidebarCollapsed",
  LAST_CARRIER: "lastCarrierId",
  SORT_MODE: "sortMode"
});

export const DEFAULT_DATABASE = Object.freeze({
  schemaVersion: DATABASE_VERSION,
  order: [],
  carriers: {}
});
