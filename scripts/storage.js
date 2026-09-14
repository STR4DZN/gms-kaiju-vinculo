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
  Hooks.callAll(`${MODULE_ID}.databaseUpdated`, { by: game.user.id, local: true, database: normalized });
  if (emit) game.socket?.emit(`module.${MODULE_ID}`, { type: "database-updated", database: normalized, by: game.user.id });
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

export async function duplicateCarrier(id) {
  const original = getCarrier(id);
  if (!original) return null;
  const copy = clone(original);
  copy.id = foundry.utils.randomID(16);
  copy.name = `${original.name} (Cópia)`;
  copy.createdAt = Date.now();
  copy.updatedAt = Date.now();
  copy.history = [];
  copy.genome = normalizeGenomeState(null, copy.id, copy.values);
  return upsertCarrier(copy);
}

export async function resetCarrierGenome(id) {
  const carrier = getCarrier(id);
  if (!carrier) return null;
  carrier.genome = normalizeGenomeState(null, carrier.id, carrier.values);
  carrier.updatedAt = Date.now();
  return upsertCarrier(carrier, { previous: carrier });
}

export function exportDatabaseJSON() {
  const db = getDatabase();
  return JSON.stringify(db, null, 2);
}

export async function importDatabaseJSON(jsonString, { mode = "merge" } = {}) {
  if (!game.user?.isGM) throw new Error("Somente o mestre pode importar dados.");
  const parsed = typeof jsonString === "string" ? JSON.parse(jsonString) : jsonString;
  if (!parsed || typeof parsed !== "object" || !parsed.carriers) {
    throw new Error("Formato de arquivo K-03 inválido.");
  }
  const current = getDatabase();
  let nextDb = current;
  if (mode === "replace") {
    nextDb = normalizeDatabase(parsed);
  } else {
    for (const [id, carrier] of Object.entries(parsed.carriers)) {
      nextDb.carriers[id] = carrier;
      if (!nextDb.order.includes(id)) nextDb.order.push(id);
    }
    nextDb = normalizeDatabase(nextDb);
  }
  await saveDatabase(nextDb);
  return nextDb;
}

export async function importFromLegacyJournal(journalOrUuid) {
  if (!game.user?.isGM) throw new Error("Somente o mestre pode importar dados.");
  let journal = null;
  if (typeof journalOrUuid === "string") {
    journal = fromUuidSync?.(journalOrUuid) ?? game.journal.get(journalOrUuid) ?? null;
  } else {
    journal = journalOrUuid;
  }
  if (!journal) throw new Error("Diário K-03 legado não encontrado.");

  const pages = journal.pages ? Array.from(journal.pages.values()) : [];
  if (!pages.length) throw new Error("O diário selecionado não possui páginas.");

  const db = getDatabase();
  let importedCount = 0;

  for (const page of pages) {
    const html = page.text?.content || "";
    if (!html) continue;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const card = doc.querySelector(".gms-kaiju-card") || doc.querySelector("[data-vontade]");
    if (!card && !html.includes("data-kaiju-meter")) continue;

    const readVal = (key) => {
      const attr = card?.getAttribute?.(`data-${key}`);
      if (attr != null) return clamp(attr);
      const meter = doc.querySelector(`[data-kaiju-meter="${key}"]`);
      const txt = meter?.querySelector("[data-kaiju-percent]")?.textContent ?? "";
      const m = txt.match(/(\d{1,3})\s*%/);
      return clamp(m?.[1] ?? 0);
    };

    const values = {
      vontade: readVal("vontade"),
      comunhao: readVal("comunhao"),
      humanidade: readVal("humanidade")
    };

    const newId = foundry.utils.randomID(16);
    const newCarrier = {
      id: newId,
      name: page.name?.trim() || "Portador Legado",
      designation: "IMPORTADO // K-03 v1.0.0",
      description: `Registro importado da página “${page.name}” do Diário ${journal.name}.`,
      values,
      genome: normalizeGenomeState(null, newId, values),
      ownerUserIds: [],
      visibility: "all",
      publicNotes: "",
      gmNotes: "",
      history: [{
        id: foundry.utils.randomID(12),
        timestamp: Date.now(),
        userId: game.user.id,
        changes: [
          { key: "vontade", before: 0, after: values.vontade },
          { key: "comunhao", before: 0, after: values.comunhao },
          { key: "humanidade", before: 0, after: values.humanidade }
        ]
      }],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    db.carriers[newId] = newCarrier;
    if (!db.order.includes(newId)) db.order.push(newId);
    importedCount += 1;
  }

  if (importedCount > 0) {
    await saveDatabase(db);
  }
  return importedCount;
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
