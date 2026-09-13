import { MODULE_ID, SETTINGS } from "./constants.js";
import { normalizeDatabase } from "./settings.js";
import { evolveGenomeState, normalizeGenomeState } from "./genome.js";

const clone = (value) => foundry.utils.deepClone(value);

export function getDatabase() {
  return normalizeDatabase(clone(game.settings.get(MODULE_ID, SETTINGS.DATABASE)));
}

export function getCarrier(id) {
  if (!id) return null;
  const db = getDatabase();
  return db.carriers[id] ? clone(db.carriers[id]) : null;
}

export function getOrderedCarriers() {
  const db = getDatabase();
  return db.order.map((id) => db.carriers[id]).filter(Boolean).map(clone);
}

export async function saveDatabase(database, { emit = true } = {}) {
  if (!game.user?.isGM) throw new Error("Somente o mestre pode alterar o banco K-03.");
  const normalized = normalizeDatabase(database);
  await game.settings.set(MODULE_ID, SETTINGS.DATABASE, normalized);
  Hooks.callAll(`${MODULE_ID}.databaseUpdated`, { by: game.user.id, local: true });
  if (emit) game.socket?.emit(`module.${MODULE_ID}`, { type: "database-updated", by: game.user.id });
  return normalized;
}

export async function upsertCarrier(carrier, { previous = null } = {}) {
  const db = getDatabase();
  const now = Date.now();
  const id = carrier.id || foundry.utils.randomID(16);
  const existing = previous || db.carriers[id] || null;

  const history = Array.isArray(existing?.history) ? clone(existing.history) : [];
  if (existing) {
    const changes = [];
    for (const key of ["vontade", "comunhao", "humanidade"]) {
      const before = Number(existing.values?.[key] ?? 0);
      const after = Number(carrier.values?.[key] ?? 0);
      if (before !== after) changes.push({ key, before, after });
    }
    if (changes.length) {
      history.unshift({ id: foundry.utils.randomID(12), timestamp: now, userId: game.user.id, changes });
      history.splice(100);
    }
  }

  const nextValues = {
    vontade: clamp(carrier.values?.vontade),
    comunhao: clamp(carrier.values?.comunhao),
    humanidade: clamp(carrier.values?.humanidade)
  };
  const genome = existing
    ? evolveGenomeState(existing.genome, {
        carrierId: id,
        previousValues: existing.values,
        nextValues,
        now,
        userId: game.user.id
      })
    : normalizeGenomeState(carrier.genome, id, nextValues);

  const record = {
    id,
    name: String(carrier.name || "Sem nome").trim() || "Sem nome",
    designation: String(carrier.designation || "").trim(),
    description: String(carrier.description || "").trim(),
    values: nextValues,
    genome,
    ownerUserIds: Array.isArray(carrier.ownerUserIds) ? [...new Set(carrier.ownerUserIds.filter(Boolean))] : [],
    visibility: carrier.visibility === "owners" ? "owners" : "all",
    publicNotes: String(carrier.publicNotes || ""),
    gmNotes: String(carrier.gmNotes || ""),
    history,
    createdAt: Number(existing?.createdAt) || now,
    updatedAt: now
  };

  db.carriers[id] = record;
  if (!db.order.includes(id)) db.order.push(id);
  await saveDatabase(db);
  return clone(record);
}

export async function deleteCarrier(id) {
  const db = getDatabase();
  if (!db.carriers[id]) return false;
  delete db.carriers[id];
  db.order = db.order.filter((entry) => entry !== id);
  await saveDatabase(db);
  return true;
}

export async function moveCarrier(id, direction) {
  const db = getDatabase();
  const index = db.order.indexOf(id);
  if (index < 0) return false;
  const next = direction === "up" ? index - 1 : index + 1;
  if (next < 0 || next >= db.order.length) return false;
  [db.order[index], db.order[next]] = [db.order[next], db.order[index]];
  await saveDatabase(db);
  return true;
}

export async function migrateGenomeDatabase() {
  if (!game.user?.isGM) return false;
  const db = getDatabase();
  let changed = false;
  for (const [id, carrier] of Object.entries(db.carriers)) {
    const normalized = normalizeGenomeState(carrier.genome, id, carrier.values);
    if (!carrier.genome || JSON.stringify(carrier.genome) !== JSON.stringify(normalized)) {
      carrier.genome = normalized;
      changed = true;
    }
  }
  if (!changed) return false;
  await saveDatabase(db, { emit: false });
  return true;
}

export function canViewCarrier(carrier, user = game.user) {
  if (!carrier || !user) return false;
  if (user.isGM) return true;
  if (carrier.visibility !== "owners") return true;
  return carrier.ownerUserIds?.includes(user.id) ?? false;
}

export function clamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, Math.round(number)));
}
