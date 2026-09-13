import { MODULE_ID, MODULE_TITLE, MODULE_VERSION } from "./constants.js";
import { openKaijuDashboard, refreshKaijuDashboard } from "./dashboard.js";
import { openKaijuEditor, refreshKaijuEditor } from "./editor.js";
import { getCarrier, getDatabase, getOrderedCarriers, migrateGenomeDatabase } from "./storage.js";
import { registerSettings } from "./settings.js";

function getRoot(html) {
  if (!html) return null;
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  if (html?.element instanceof HTMLElement) return html.element;
  return null;
}

function addDirectoryButton(html) {
  const root = getRoot(html);
  if (!root || root.querySelector(`[data-${MODULE_ID}-open]`)) return;
  const host = root.querySelector(".directory-header .header-actions") || root.querySelector(".directory-header") || root.querySelector("header") || root;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "gms-kaiju-open-button";
  button.setAttribute(`data-${MODULE_ID}-open`, "true");
  button.innerHTML = '<i class="fa-solid fa-dna" aria-hidden="true"></i><span>K-03 // Vínculo Kaiju</span>';
  button.title = "Abrir a Matriz de Vínculos K-03";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openKaijuDashboard();
  });
  host.append(button);
}

Hooks.once("init", () => {
  registerSettings();
  game.keybindings.register(MODULE_ID, "openDashboard", {
    name: "Abrir Matriz de Vínculos K-03",
    hint: "Abre a página principal de portadores do Vínculo Kaiju.",
    editable: [],
    onDown: () => { openKaijuDashboard(); return true; },
    restricted: false,
    precedence: CONST.KEYBINDING_PRECEDENCE?.NORMAL ?? 0
  });
});

Hooks.on(`${MODULE_ID}.databaseUpdated`, () => {
  refreshKaijuDashboard();
  refreshKaijuEditor();
});

Hooks.once("ready", async () => {
  game.socket?.on(`module.${MODULE_ID}`, (payload) => {
    if (payload?.type !== "database-updated") return;
    Hooks.callAll(`${MODULE_ID}.databaseUpdated`, { ...payload, local: false });
  });

  if (game.user?.isGM) {
    try {
      await migrateGenomeDatabase();
    } catch (error) {
      console.error(`${MODULE_TITLE} | Falha ao normalizar memória genética K-03.`, error);
    }
  }

  const API = Object.freeze({
    open: openKaijuDashboard,
    openDashboard: openKaijuDashboard,
    openEditor: openKaijuEditor,
    getDatabase,
    getCarriers: getOrderedCarriers,
    getCarrier,
    version: MODULE_VERSION
  });
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = API;
  globalThis.GMSKaijuVinculo = API;
  console.info(`${MODULE_TITLE} | v${MODULE_VERSION} pronto — banco próprio, sem Journal.`);
});

Hooks.on("renderActorDirectory", (_app, html) => addDirectoryButton(html));
Hooks.on("renderActorDirectoryPF", (_app, html) => addDirectoryButton(html));
