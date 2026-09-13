import { MODULE_ID, MODULE_TITLE, MODULE_VERSION } from "./constants.js";
import { openKaijuManager } from "./manager.js";
import { registerSettings } from "./settings.js";

const API = Object.freeze({
  openManager: openKaijuManager,
  version: MODULE_VERSION
});

function getRoot(html) {
  if (!html) return null;
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  if (html?.element instanceof HTMLElement) return html.element;
  return null;
}

function addJournalButton(html) {
  if (!game.user?.isGM) return;
  if (!game.settings.get(MODULE_ID, "showJournalButton")) return;

  const root = getRoot(html);
  if (!root || root.querySelector(`[data-${MODULE_ID}-open]`)) return;

  const host =
    root.querySelector(".directory-header .header-actions") ||
    root.querySelector(".directory-header") ||
    root.querySelector("header") ||
    root;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "gms-kaiju-open-button";
  button.dataset[`${MODULE_ID.replaceAll("-", "_")}_open`] = "true";
  button.setAttribute(`data-${MODULE_ID}-open`, "true");
  button.innerHTML = '<i class="fa-solid fa-dna" aria-hidden="true"></i><span>K-03 // Vínculo Kaiju</span>';
  button.title = "Abrir o Gerenciador do Vínculo Kaiju";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openKaijuManager();
  });

  host.append(button);
}

Hooks.once("init", () => {
  registerSettings();

  game.keybindings.register(MODULE_ID, "openManager", {
    name: "Abrir Gerenciador K-03",
    hint: "Abre o Gerenciador de Vontade, Comunhão e Humanidade.",
    editable: [],
    onDown: () => {
      if (!game.user?.isGM) return false;
      openKaijuManager();
      return true;
    },
    restricted: true,
    precedence: CONST.KEYBINDING_PRECEDENCE?.NORMAL ?? 0
  });
});

Hooks.once("ready", () => {
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = API;
  globalThis.GMSKaijuVinculo = API;
  console.info(`${MODULE_TITLE} | v${MODULE_VERSION} pronto.`);
});

Hooks.on("renderJournalDirectory", (_app, html) => addJournalButton(html));
Hooks.on("renderJournalDirectoryPF", (_app, html) => addJournalButton(html));
