import { DEFAULT_JOURNAL_UUID, MODULE_ID } from "./constants.js";

export function registerSettings() {
  game.settings.register(MODULE_ID, "journalUuid", {
    name: "Diário principal do Vínculo Kaiju",
    hint: "UUID do JournalEntry que contém as páginas/portadores administrados pelo K-03.",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULT_JOURNAL_UUID,
    requiresReload: false
  });

  game.settings.register(MODULE_ID, "showJournalButton", {
    name: "Exibir botão no diretório de Diários",
    hint: "Adiciona um botão K-03 no diretório de Journal para mestres.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: false
  });
}
