/**
 * VÍNCULO KAIJU — Gerenciador de Vontade, Comunhão e Humanidade
 * Interface GMS/K-03 v5.1.0: contenção xenobiológica, radar, telemetria Kaiju e skin integral da página.
 * Compatível com Foundry Virtual Tabletop V13 (build 351).
 *
 * Tipo da macro: Script
 * Diário principal: JournalEntry.wVaD3Qgcpv8Cbldq
 */

import { MODULE_ID, DEFAULT_JOURNAL_UUID } from "./constants.js";

export async function openKaijuManager() {
  "use strict";

  const JOURNAL_UUID = String(game.settings.get(MODULE_ID, "journalUuid") || DEFAULT_JOURNAL_UUID).trim();
  const CARD_CLASS = "kaiju-vinculo-card";
  const PAGE_CLASS = "kaiju-vinculo-page";
  const DIALOG_CLASS = "kaiju-vinculo-dialog";
  const UI_STYLE_ID = "kaiju-vinculo-lancer-ui-v5-1";
  const UI_VERSION = "5.1.0-GMS-FULL-PAGE";
  const DialogV2 = foundry.applications.api.DialogV2;

  /**
   * Vocabulário visual do terminal K-03. Mantê-lo centralizado evita que um
   * mesmo símbolo ganhe significados diferentes entre seleção, leitura e
   * gravação. Todos pertencem ao Font Awesome 6 incluído no Foundry V13.
   */
  const UI_ICONS = Object.freeze({
    carrier: "fa-fingerprint",
    journal: "fa-database",
    connect: "fa-satellite-dish",
    triad: "fa-dna",
    telemetry: "fa-wave-square",
    independent: "fa-code-branch",
    review: "fa-magnifying-glass-chart",
    authorize: "fa-shield-halved",
    protectedRecord: "fa-lock",
    diagnosis: "fa-microscope",
    save: "fa-floppy-disk",
    cancel: "fa-xmark",
    information: "fa-circle-info"
  });

  /**
   * A folha do diário usa estilos inline para continuar temática para todos os
   * jogadores. Os diálogos usam esta folha escopada, instalada uma vez por
   * sessão, para também alcançar o frame e os botões nativos do Foundry V13.
   */
  const ensureUIStyles = () => {
    if (document.getElementById(UI_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = UI_STYLE_ID;
    style.textContent = `
      .${DIALOG_CLASS} {
        --kj-void: #04080b;
        --kj-deep: #081017;
        --kj-surface: #101a22;
        --kj-surface-2: #182832;
        --kj-line: #39535e;
        --kj-line-soft: rgba(105, 148, 157, .22);
        --kj-text: #edf2ef;
        --kj-muted: #a5b5b7;
        --kj-dim: #71858a;
        --kj-red: #e85d48;
        --kj-cyan: #4ac8b7;
        --kj-blue: #78abe1;
        --kj-gms: #d84b58;
        --kj-amber: #d7a45a;
        --kj-bio: #79c895;
        --kj-font-display: "Roboto Condensed", "Arial Narrow", "Trebuchet MS", sans-serif;
        --kj-font-data: "Roboto Mono", "Cascadia Mono", Consolas, monospace;
        color: var(--kj-text);
        background: var(--kj-deep);
        border: 1px solid #40536a;
        border-radius: 0;
        box-shadow: 0 24px 80px rgba(0, 0, 0, .72), 0 0 0 1px rgba(118, 158, 199, .09);
        font-family: var(--kj-font-display);
      }

      .${DIALOG_CLASS} .window-header {
        position: relative;
        min-height: 38px;
        padding: 0 10px;
        overflow: hidden;
        color: var(--kj-text);
        background:
          linear-gradient(90deg, rgba(216, 75, 88, .92) 0 5px, transparent 5px),
          linear-gradient(90deg, #171f2b, #0d121b 72%, #17131a);
        border-bottom: 1px solid #4e6074;
        box-shadow: inset 0 -1px rgba(255, 255, 255, .035);
      }

      .${DIALOG_CLASS} .window-header::after {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent 0 16%, #4ac8b7 46% 58%, transparent 84%);
        content: "";
        opacity: .72;
        pointer-events: none;
        transform: translateX(-100%);
        animation: kj-header-trace 7.2s linear infinite;
      }

      .${DIALOG_CLASS} .window-header .window-title {
        color: #f5f7f9;
        font-family: var(--kj-font-display);
        font-size: 13px;
        font-weight: 900;
        letter-spacing: 1.35px;
        text-transform: uppercase;
      }

      .${DIALOG_CLASS} .window-header button {
        color: #c8d2de;
        border-radius: 0;
      }

      .${DIALOG_CLASS} .window-content,
      .${DIALOG_CLASS} .dialog-content {
        padding: 0;
        color: var(--kj-text);
        background:
          linear-gradient(rgba(93, 127, 162, .035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(93, 127, 162, .035) 1px, transparent 1px),
          radial-gradient(circle at 50% -15%, rgba(76, 126, 174, .17), transparent 46%),
          var(--kj-void);
        background-size: 28px 28px, 28px 28px, auto, auto;
        animation: kj-field-drift 18s linear infinite;
      }

      .${DIALOG_CLASS} form {
        gap: 0;
      }

      .${DIALOG_CLASS} .form-footer {
        gap: 7px;
        padding: 7px 10px 9px;
        background: linear-gradient(180deg, #0b1018, #080b11);
        border-top: 1px solid #334257;
      }

      .${DIALOG_CLASS} .form-footer button {
        min-height: 38px;
        margin: 0;
        padding: 6px 16px;
        color: #eef2f5;
        background: linear-gradient(180deg, #293747, #17212d);
        border: 1px solid #52677e;
        border-radius: 0;
        clip-path: polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px);
        box-shadow: inset 0 1px rgba(255, 255, 255, .07), 0 4px 12px rgba(0, 0, 0, .28);
        font-family: var(--kj-font-display);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 1.1px;
        text-transform: uppercase;
        transition: color .14s ease, background .14s ease, border-color .14s ease, transform .14s ease;
      }

      .${DIALOG_CLASS} .form-footer button:hover {
        color: #fff;
        background: linear-gradient(180deg, #3a4e63, #223143);
        border-color: #82a0bd;
        transform: translateY(-1px);
      }

      .${DIALOG_CLASS} .form-footer button[data-action="ok"],
      .${DIALOG_CLASS} .form-footer button[data-action="yes"] {
        background: linear-gradient(180deg, #9f2c39, #661923);
        border-color: #e45966;
      }

      .${DIALOG_CLASS} .form-footer button[data-action="ok"]:hover,
      .${DIALOG_CLASS} .form-footer button[data-action="yes"]:hover {
        background: linear-gradient(180deg, #ca3d4b, #8a2430);
        border-color: #ff7b86;
      }

      .${DIALOG_CLASS} :is(button, select, input):focus-visible {
        outline: 2px solid #f4f6f8;
        outline-offset: 2px;
        box-shadow: 0 0 0 4px rgba(74, 200, 183, .28);
      }

      .${DIALOG_CLASS} * {
        scrollbar-color: #536a81 #090d14;
        scrollbar-width: thin;
      }

      .${DIALOG_CLASS} *::-webkit-scrollbar { width: 9px; height: 9px; }
      .${DIALOG_CLASS} *::-webkit-scrollbar-track { background: #090d14; }
      .${DIALOG_CLASS} *::-webkit-scrollbar-thumb { background: #536a81; border: 2px solid #090d14; }

      .kj-shell {
        position: relative;
        box-sizing: border-box;
        color: var(--kj-text);
        font-family: var(--kj-font-display);
        animation: kj-terminal-boot .48s cubic-bezier(.2,.82,.2,1) both;
      }

      .kj-corner-grid {
        position: absolute;
        z-index: 0;
        pointer-events: none;
        opacity: .3;
      }

      .kj-kicker {
        color: #8fa2b8;
        font-family: var(--kj-font-data);
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 2px;
        text-transform: uppercase;
      }

      .kj-status-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 24px;
        padding: 2px 8px;
        color: #b8c6d6;
        background: rgba(5, 9, 14, .68);
        border: 1px solid rgba(126, 154, 187, .28);
        clip-path: polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px);
        font-family: var(--kj-font-data);
        font-size: 8px;
        font-weight: 800;
        letter-spacing: .8px;
        text-transform: uppercase;
      }

      .kj-status-chip::before {
        width: 6px;
        height: 6px;
        background: #4ac8b7;
        border-radius: 50%;
        box-shadow: 0 0 8px rgba(74, 200, 183, .8);
        content: "";
        animation: kj-status-beacon 2.8s ease-in-out infinite;
      }

      .kj-page-picker {
        min-height: 270px;
        padding: 16px;
        overflow: hidden;
      }

      .kj-page-picker::after,
      .kj-manager::after,
      .kj-confirmation::after {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 86px;
        height: 5px;
        background: linear-gradient(90deg, transparent, #d84b58);
        content: "";
        pointer-events: none;
      }

      .kj-page-picker-header {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: 54px 1fr;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
        padding: 12px;
        background: linear-gradient(125deg, rgba(216, 75, 88, .16), rgba(24, 34, 47, .9) 42%, rgba(9, 13, 20, .92));
        border: 1px solid #485c72;
        border-left: 5px solid #d84b58;
        clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%);
      }

      .kj-page-sigil {
        display: grid;
        place-items: center;
        width: 50px;
        height: 50px;
        color: #ec6572;
        background: radial-gradient(circle, rgba(216, 75, 88, .19), transparent 68%), #080b10;
        border: 1px solid #9d3540;
        clip-path: polygon(50% 0, 100% 25%, 88% 78%, 50% 100%, 12% 78%, 0 25%);
        font-size: 19px;
        box-shadow: inset 0 0 18px rgba(216, 75, 88, .12);
      }

      .kj-page-picker-header h2,
      .kj-manager-title h2,
      .kj-confirmation h2 {
        margin: 3px 0 0;
        color: #f4f6f8;
        border: 0;
        font-family: var(--kj-font-display);
        font-size: 19px;
        font-weight: 900;
        letter-spacing: 1.7px;
        line-height: 1;
        text-transform: uppercase;
      }

      .kj-page-picker-header p,
      .kj-manager-title p {
        margin: 5px 0 0;
        color: #a3afbd;
        font-size: 11px;
        line-height: 1.3;
      }

      .kj-field-block {
        position: relative;
        z-index: 1;
        padding: 11px;
        background: rgba(12, 18, 27, .86);
        border: 1px solid #34485d;
        border-top: 2px solid #607992;
      }

      .kj-field-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
        color: #cbd5df;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 1.2px;
        text-transform: uppercase;
      }

      .kj-field-label small {
        color: #6f8092;
        font-family: var(--kj-font-data);
        font-size: 8px;
      }

      .kj-page-picker select {
        box-sizing: border-box;
        width: 100%;
        min-height: 40px;
        padding: 6px 10px;
        color: #f0f3f6;
        background: #080d14;
        border: 1px solid #617890;
        border-radius: 0;
        font-family: var(--kj-font-data);
        font-size: 11px;
        font-weight: 800;
      }

      .kj-page-picker-note {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-top: 8px;
        color: #8492a2;
        font-size: 10px;
        line-height: 1.3;
      }

      .kj-manager {
        display: flex;
        flex-direction: column;
        max-height: none;
        overflow: hidden;
      }

      .kj-manager-overview {
        position: relative;
        z-index: 2;
        display: grid;
        grid-template-columns: minmax(0, .9fr) minmax(420px, 1.1fr);
        gap: 8px 12px;
        flex: 0 0 auto;
        padding: 10px 13px 9px;
        background: linear-gradient(120deg, rgba(216, 75, 88, .12), rgba(17, 25, 36, .96) 38%, rgba(6, 10, 16, .98));
        border-bottom: 1px solid #40536a;
      }

      .kj-manager-title {
        min-width: 0;
      }

      .kj-manager-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 7px;
      }

      .kj-manager-reading {
        grid-column: 1 / -1;
        margin-top: 0;
        padding: 6px 8px;
        color: #c9d3de;
        background: rgba(5, 8, 13, .58);
        border-left: 3px solid #8298af;
        font-size: 10px;
        line-height: 1.3;
      }

      .kj-manager-reading strong {
        display: block;
        margin-bottom: 3px;
        color: #8799ad;
        font-family: var(--kj-font-data);
        font-size: 8px;
        letter-spacing: 1.4px;
        text-transform: uppercase;
      }

      .kj-manager-summary {
        display: grid;
        grid-template-columns: 1.35fr repeat(2, minmax(92px, .8fr));
        gap: 6px;
        align-self: stretch;
      }

      .kj-manager-summary-card {
        position: relative;
        display: block;
        min-width: 0;
        padding: 9px 10px;
        overflow: hidden;
        color: #90a1b4;
        background: linear-gradient(145deg, rgba(18,27,39,.9), rgba(5,9,14,.9));
        border: 1px solid #34485d;
        border-top: 2px solid var(--kj-metric-accent, #8298af);
        clip-path: polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 0 100%);
      }

      .kj-manager-summary-card::after {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent 0 18%, var(--kj-metric-accent, #8298af) 48% 62%, transparent 86%);
        content: "";
        opacity: .62;
        transform: translateX(-100%);
        animation: kj-summary-trace 6.4s linear infinite;
      }

      .kj-manager-summary-card small {
        display: block;
        margin-bottom: 5px;
        font-family: var(--kj-font-data);
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 1px;
        text-transform: uppercase;
      }

      .kj-manager-summary-card strong {
        display: block;
        overflow-wrap: anywhere;
        color: var(--kj-metric-accent, #eef2f6);
        font-size: 13px;
        font-weight: 900;
        line-height: 1.1;
        text-transform: uppercase;
      }

      .kj-controls-scroll {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 9px;
        flex: 0 0 auto;
        min-height: 0;
        padding: 10px 12px;
        overflow: visible;
      }

      .kj-control {
        --kj-value: 0%;
        position: relative;
        margin-bottom: 0;
        padding: 10px;
        overflow: hidden;
        background:
          linear-gradient(90deg, rgba(var(--kj-rgb), .12), transparent 46%),
          linear-gradient(145deg, rgba(23, 33, 46, .96), rgba(8, 12, 18, .98));
        border: 1px solid rgba(var(--kj-rgb), .42);
        border-left: 5px solid var(--kj-accent);
        clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%);
        box-shadow: inset 0 0 28px rgba(0, 0, 0, .34);
      }

      .kj-control::after {
        position: absolute;
        top: 0;
        left: 0;
        width: 34%;
        height: 2px;
        background: linear-gradient(90deg, transparent, var(--kj-accent), transparent);
        box-shadow: 0 0 10px rgba(var(--kj-rgb), .62);
        content: "";
        transform: translateX(-140%);
        animation: kj-specimen-trace 5.8s linear infinite;
      }

      .kj-control-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .kj-control-identity {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .kj-control-identity strong {
        display: block;
        color: #f1f4f6;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .9px;
        line-height: 1.1;
        text-transform: uppercase;
      }

      .kj-control-identity small {
        display: block;
        margin-top: 2px;
        color: var(--kj-accent);
        font-family: var(--kj-font-data);
        font-size: 8px;
        font-weight: 800;
        letter-spacing: .7px;
        text-transform: uppercase;
      }

      .kj-live-icon {
        position: relative;
        display: inline-flex;
        flex: 0 0 36px;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        color: var(--kj-accent);
        background: radial-gradient(circle, rgba(var(--kj-rgb), .14), transparent 68%), #070a0f;
        border: 1px solid rgba(var(--kj-rgb), .62);
        clip-path: polygon(50% 0, 100% 25%, 90% 78%, 50% 100%, 10% 78%, 0 25%);
        box-shadow: inset 0 0 13px rgba(var(--kj-rgb), .08), 0 0 10px rgba(var(--kj-rgb), .12);
      }

      .kj-live-icon::after {
        position: absolute;
        inset: 4px;
        border: 1px solid rgba(var(--kj-rgb), .56);
        content: "";
        pointer-events: none;
      }

      .kj-control[data-key="vontade"] .kj-live-icon::after {
        border-radius: 50%;
        animation: kj-predator-pulse 2.9s ease-out infinite;
      }

      .kj-control[data-key="comunhao"] .kj-live-icon::after {
        border-style: dashed;
        border-radius: 50%;
        animation: kj-resonance-orbit 7.2s linear infinite;
      }

      .kj-control[data-key="humanidade"] .kj-live-icon::after {
        clip-path: polygon(50% 0, 94% 24%, 88% 78%, 50% 100%, 12% 78%, 6% 24%);
        animation: kj-shield-cycle 3.8s ease-in-out infinite;
      }

      .kj-live-icon i {
        font-size: 15px;
        text-shadow: 0 0 10px rgba(var(--kj-rgb), .72);
      }

      .kj-control output {
        min-width: 58px;
        padding: 6px 7px;
        color: var(--kj-accent);
        background: #060a0f;
        border: 1px solid rgba(var(--kj-rgb), .5);
        clip-path: polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px);
        font-family: var(--kj-font-data);
        font-size: 15px;
        font-weight: 900;
        text-align: center;
      }

      .kj-control-stage {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        margin: 7px 0 0;
        padding-top: 5px;
        border-top: 1px solid rgba(var(--kj-rgb), .18);
      }

      .kj-control-stage span {
        color: #758598;
        font-family: var(--kj-font-data);
        font-size: 8px;
        font-weight: 800;
        letter-spacing: .7px;
      }

      .kj-control-stage strong {
        color: var(--kj-accent);
        font-size: 9px;
        letter-spacing: .5px;
        text-align: right;
        text-transform: uppercase;
      }

      .kj-control-description {
        min-height: 26px;
        margin: 4px 0 7px;
        color: #a9b4c0;
        font-size: 10px;
        line-height: 1.25;
      }

      .kj-input-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 62px;
        align-items: center;
        gap: 8px;
      }

      .kj-input-row input[type="range"] {
        appearance: none;
        -webkit-appearance: none;
        box-sizing: border-box;
        width: 100%;
        height: 14px;
        margin: 0;
        padding: 3px;
        background: linear-gradient(90deg, var(--kj-accent) 0 var(--kj-value), rgba(255, 255, 255, .1) var(--kj-value) 100%);
        border: 1px solid rgba(var(--kj-rgb), .52);
        border-radius: 0;
        box-shadow: inset 0 2px 6px rgba(0, 0, 0, .92), 0 0 9px rgba(var(--kj-rgb), .12);
        cursor: pointer;
      }

      .kj-input-row input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        -webkit-appearance: none;
        width: 20px;
        height: 26px;
        background: linear-gradient(135deg, var(--kj-accent2), var(--kj-accent) 55%, #111 57%);
        border: 2px solid #06080d;
        border-radius: 0;
        clip-path: polygon(50% 0, 100% 22%, 100% 78%, 50% 100%, 0 78%, 0 22%);
        box-shadow: 0 0 0 1px var(--kj-accent), 0 0 12px rgba(var(--kj-rgb), .7);
        cursor: grab;
      }

      .kj-input-row input[type="range"]::-moz-range-track {
        height: 10px;
        background: transparent;
        border: 0;
      }

      .kj-input-row input[type="range"]::-moz-range-thumb {
        width: 20px;
        height: 26px;
        background: var(--kj-accent);
        border: 2px solid #06080d;
        border-radius: 0;
        box-shadow: 0 0 0 1px var(--kj-accent), 0 0 12px rgba(var(--kj-rgb), .7);
        cursor: grab;
      }

      .kj-input-row input[type="number"] {
        box-sizing: border-box;
        width: 62px;
        min-height: 36px;
        padding: 4px;
        color: #f1f4f6;
        background: #070b11;
        border: 1px solid rgba(var(--kj-rgb), .58);
        border-radius: 0;
        font-family: var(--kj-font-data);
        font-size: 13px;
        font-weight: 900;
        text-align: center;
      }

      .kj-stage-map {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 3px;
        margin: 7px 0 0;
      }

      .kj-stage-map button {
        display: grid;
        grid-template-columns: 1fr;
        place-items: center;
        gap: 2px;
        min-width: 0;
        min-height: 38px;
        margin: 0;
        padding: 3px 1px;
        color: #718093;
        background: rgba(3, 6, 10, .62);
        border: 1px solid #28394c;
        border-radius: 0;
        font-family: var(--kj-font-data);
        cursor: pointer;
        transition: color .12s ease, background .12s ease, border-color .12s ease, transform .12s ease;
      }

      .kj-stage-map button:hover {
        color: #dbe3ea;
        background: rgba(var(--kj-rgb), .08);
        border-color: rgba(var(--kj-rgb), .44);
      }

      .kj-stage-map button i { font-size: 11px; }
      .kj-stage-map button small { font: 800 8px/1 var(--kj-font-data); }
      .kj-stage-map button.is-passed { color: rgba(var(--kj-rgb), .64); border-color: rgba(var(--kj-rgb), .22); }

      .kj-stage-map button.is-current {
        color: var(--kj-accent);
        background: rgba(var(--kj-rgb), .14);
        border-color: rgba(var(--kj-rgb), .76);
        box-shadow: inset 0 -3px var(--kj-accent), 0 0 10px rgba(var(--kj-rgb), .19);
        transform: translateY(-2px);
        animation: kj-stage-lock 3.2s ease-in-out infinite;
      }

      .kj-control[data-key="vontade"][data-stage="5"] {
        border-color: rgba(232, 93, 72, .78);
        box-shadow: inset 0 0 34px rgba(130, 16, 27, .24), 0 0 16px rgba(232, 93, 72, .13);
        animation: kj-danger-breathe 3.4s ease-in-out infinite;
      }

      .kj-control[data-key="vontade"][data-stage="5"] .kj-live-icon {
        color: #ffbd75;
        background: radial-gradient(circle, #53131b, #07090d 70%);
        border-color: #ff735e;
        box-shadow: inset 0 0 16px rgba(232, 93, 72, .22), 0 0 17px rgba(232, 93, 72, .48);
      }

      .kj-manager-note {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 6px 12px 7px;
        color: #7d8c9e;
        background: #080c12;
        border-top: 1px solid #29394b;
        font-family: var(--kj-font-data);
        font-size: 8px;
        line-height: 1.4;
      }

      .kj-confirmation {
        padding: 14px;
      }

      .kj-confirm-head {
        display: grid;
        grid-template-columns: 48px 1fr;
        align-items: center;
        gap: 11px;
        margin-bottom: 9px;
        padding: 10px;
        background: linear-gradient(125deg, rgba(216, 75, 88, .12), rgba(19, 28, 40, .92));
        border: 1px solid #40536a;
        border-left: 4px solid #d84b58;
      }

      .kj-confirm-icon {
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        color: #ed6673;
        background: #070a0f;
        border: 1px solid #a33b46;
        clip-path: polygon(50% 0, 100% 25%, 90% 78%, 50% 100%, 10% 78%, 0 25%);
        font-size: 17px;
      }

      .kj-confirm-target {
        margin-top: 4px;
        color: #a5b2c0;
        font-size: 10px;
      }

      .kj-confirm-summary {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        margin-bottom: 8px;
      }

      .kj-confirm-stat {
        padding: 6px;
        color: #9cadbe;
        background: rgba(6, 10, 15, .72);
        border: 1px solid #304257;
        text-align: center;
      }

      .kj-confirm-stat strong {
        display: block;
        color: #edf1f4;
        font-family: var(--kj-font-data);
        font-size: 13px;
      }

      .kj-confirm-stat small {
        display: block;
        margin-top: 2px;
        font-size: 8px;
        letter-spacing: 1px;
        text-transform: uppercase;
      }

      .kj-confirm-row {
        display: grid;
        grid-template-columns: 38px minmax(0, 1fr) auto;
        align-items: center;
        gap: 8px;
        margin-top: 6px;
        padding: 7px 9px;
        background: linear-gradient(90deg, rgba(var(--kj-rgb), .11), transparent 54%), rgba(4, 7, 11, .54);
        border: 1px solid rgba(var(--kj-rgb), .34);
        border-left: 4px solid var(--kj-accent);
      }

      .kj-confirm-row-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        color: var(--kj-accent);
        background: #06090e;
        border: 1px solid rgba(var(--kj-rgb), .48);
        clip-path: polygon(50% 0, 100% 25%, 88% 78%, 50% 100%, 12% 78%, 0 25%);
      }

      .kj-confirm-row strong { display: block; }

      .kj-confirm-row small {
        display: block;
        margin-top: 2px;
        color: var(--kj-accent);
        font-size: 9px;
      }

      .kj-confirm-values {
        text-align: right;
      }

      .kj-confirm-values strong {
        color: var(--kj-accent);
        font-family: var(--kj-font-data);
        font-size: 14px;
      }

      .kj-confirm-values small {
        color: #8b9bad;
        font-family: var(--kj-font-data);
      }

      /* Integração visual com a página inteira do Journal.
         A skin principal também é salva inline no Journal para que os players
         recebam o mesmo visual sem precisar executar a macro. */
      .application:has(.${PAGE_CLASS}) .window-content,
      .application:has(.${PAGE_CLASS}) .journal-entry-content,
      .application:has(.${PAGE_CLASS}) .journal-page-content,
      .application:has(.${PAGE_CLASS}) .prosemirror,
      .application:has(.${PAGE_CLASS}) .editor-content {
        color: #edf2ef !important;
        background:
          linear-gradient(rgba(74,200,183,.022) 1px, transparent 1px),
          linear-gradient(90deg, rgba(74,200,183,.018) 1px, transparent 1px),
          radial-gradient(circle at 8% 0%, rgba(232,93,72,.11), transparent 31%),
          radial-gradient(circle at 92% 0%, rgba(74,200,183,.08), transparent 30%),
          linear-gradient(155deg, #101a22 0%, #04080b 72%, #071014 100%) !important;
        background-size: 26px 26px, 26px 26px, auto, auto, auto !important;
      }

      .application:has(.${PAGE_CLASS}) ::-webkit-scrollbar-track {
        background: #071014;
      }

      .application:has(.${PAGE_CLASS}) ::-webkit-scrollbar-thumb {
        background: #39535e;
        border: 1px solid #4ac8b7;
      }

      .${PAGE_CLASS},
      .${PAGE_CLASS} * {
        box-sizing: border-box;
      }

      @keyframes kj-terminal-boot {
        0% { opacity: 0; filter: saturate(.55) contrast(1.28); transform: translateY(4px); clip-path: inset(0 100% 0 0); }
        58% { opacity: .9; filter: saturate(.86) contrast(1.12); }
        100% { opacity: 1; filter: none; transform: none; clip-path: inset(0); }
      }

      @keyframes kj-field-drift {
        from { background-position: 0 0, 0 0, center top, center; }
        to { background-position: 28px 28px, -28px 28px, center top, center; }
      }

      @keyframes kj-status-beacon {
        0%, 100% { opacity: .56; transform: scale(.82); box-shadow: 0 0 5px rgba(74,200,183,.46); }
        50% { opacity: 1; transform: scale(1); box-shadow: 0 0 12px rgba(74,200,183,.9); }
      }

      @keyframes kj-summary-trace {
        0%, 14% { opacity: 0; transform: translateX(-100%); }
        24% { opacity: .68; }
        62%, 100% { opacity: 0; transform: translateX(100%); }
      }

      @keyframes kj-header-trace {
        0%, 18% { opacity: 0; transform: translateX(-100%); }
        28% { opacity: .74; }
        64%, 100% { opacity: 0; transform: translateX(100%); }
      }

      @keyframes kj-specimen-trace {
        0%, 12% { opacity: 0; transform: translateX(-140%); }
        20% { opacity: .9; }
        66%, 100% { opacity: 0; transform: translateX(430%); }
      }

      @keyframes kj-predator-pulse {
        0% { opacity: .78; transform: scale(.58); }
        68%, 100% { opacity: 0; transform: scale(1.42); }
      }

      @keyframes kj-resonance-orbit {
        from { opacity: .42; transform: rotate(0deg); }
        50% { opacity: .92; }
        to { opacity: .42; transform: rotate(360deg); }
      }

      @keyframes kj-shield-cycle {
        0%, 100% { opacity: .32; transform: scale(.78); }
        50% { opacity: .92; transform: scale(1.02); }
      }

      @keyframes kj-stage-lock {
        0%, 100% { filter: brightness(.9); }
        50% { filter: brightness(1.2); }
      }

      @keyframes kj-danger-breathe {
        0%, 100% { border-color: rgba(232,93,72,.54); box-shadow: inset 0 0 30px rgba(130,16,27,.18), 0 0 10px rgba(232,93,72,.08); }
        50% { border-color: rgba(232,93,72,.9); box-shadow: inset 0 0 38px rgba(130,16,27,.28), 0 0 18px rgba(232,93,72,.18); }
      }

      @media (max-width: 900px) {
        .kj-controls-scroll { grid-template-columns: 1fr; overflow: auto; }
        .kj-manager { max-height: calc(100vh - 130px); }
      }

      @media (max-width: 680px) {
        .kj-manager-overview { grid-template-columns: 1fr; }
        .kj-manager-summary { grid-template-columns: repeat(3, 1fr); }
      }

      @media (max-width: 460px) {
        .kj-page-picker { padding: 14px; }
        .kj-page-picker-header { grid-template-columns: 1fr; }
        .kj-page-sigil { width: 48px; height: 48px; }
        .kj-manager-summary { grid-template-columns: 1fr; }
        .kj-control-stage, .kj-control-description { margin-left: 0; }
        .kj-input-row { grid-template-columns: 1fr; }
        .kj-input-row input[type="number"] { width: 100%; }
        .kj-stage-map { grid-template-columns: repeat(3, 1fr); }
        .kj-confirmation { padding: 14px; }
        .kj-confirm-head { grid-template-columns: 1fr; }
        .kj-confirm-summary { grid-template-columns: 1fr; }
      }

      @media (prefers-reduced-motion: reduce) {
        .${DIALOG_CLASS} *, .${DIALOG_CLASS} *::before, .${DIALOG_CLASS} *::after {
          scroll-behavior: auto !important;
          transition: none !important;
          animation: none !important;
        }
      }
    `;

    document.head.append(style);
  };

  ensureUIStyles();

  const clamp = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.min(100, Math.max(0, Math.round(number)));
  };

  const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;"
  })[character]);

  const STAGE_ROMAN = ["I", "II", "III", "IV", "V", "VI"];
  const STAGE_LIMITS = [0, 20, 40, 60, 80, 100];
  const AXES = {
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

  const svgDataURI = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

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

  const bioBusHTML = (values) => {
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

  const kaijuRadarHTML = (values, profile) => {
    const pointAt = (value, degrees) => {
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
    return `<img data-kj-kaiju-radar="true" data-kj-radar-average="${profile.average}" src="${svgDataURI(svg)}" alt="Radar de contenção com os três canais independentes" draggable="false" style="display:block;width:164px;height:164px;max-width:100%;margin:0 auto;padding:0;border:1px solid #46656b;border-radius:0;box-shadow:inset 0 0 24px rgba(0,0,0,.5),0 0 18px ${dominant.accent}18;object-fit:contain;">`;
  };

  const bioSignatureHTML = (values) => {
    const wavePath = (y, value) => {
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

  const metricSignalHTML = (value, color, phase = 0) => {
    const safe = clamp(value);
    const end = 8 + Math.round(safe * 1.34);
    const duration = (3.2 + phase * .5).toFixed(1);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 8" preserveAspectRatio="none"><style>@media (prefers-reduced-motion: reduce){.motion{display:none}}</style><path d="M8 4H142" stroke="#30464e" stroke-width="2"/><path d="M8 4H${end}" stroke="${color}" stroke-width="2.5"/><g class="motion"><circle cx="${end}" cy="4" r="2" fill="${color}"><animate attributeName="r" values="1.3;2.6;1.3" dur="${duration}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".35;1;.35" dur="${duration}s" repeatCount="indefinite"/></circle></g></svg>`;
    return `<img data-kj-metric-signal="true" src="${svgDataURI(svg)}" alt="" aria-hidden="true" draggable="false" style="display:block;width:100%;height:7px;max-width:none;margin:6px 0 0;padding:0;border:0;border-radius:0;object-fit:fill;">`;
  };

  const axisTelemetryHTML = (key, value) => {
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

  const stageIndexAt = (value) => {
    const safe = clamp(value);
    return safe === 100 ? 5 : Math.floor(safe / 20);
  };

  const stageAt = (key, value) => {
    const index = stageIndexAt(value);
    return { ...AXES[key].stages[index], index, roman: STAGE_ROMAN[index] };
  };

  const getStates = (values) => ({
    vontade: stageAt("vontade", values.vontade).label,
    comunhao: stageAt("comunhao", values.comunhao).label,
    humanidade: stageAt("humanidade", values.humanidade).label
  });

  const getReading = ({ vontade, comunhao, humanidade }) => {
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

  const getProfile = (values) => {
    const entries = Object.entries(values).map(([key, value]) => ({
      key,
      value: clamp(value),
      title: AXES[key].title,
      accent: AXES[key].accent
    }));
    const sorted = [...entries].sort((a, b) => b.value - a.value);
    const maximum = sorted[0].value;
    const minimum = sorted.at(-1).value;
    const spread = maximum - minimum;
    const average = Math.round(entries.reduce((total, entry) => total + entry.value, 0) / entries.length);
    const balance = 100 - spread;
    const tension = Math.abs(values.vontade - values.humanidade);
    const convergent = spread <= 10;

    return {
      dominant: convergent ? "Tríade convergente" : sorted[0].title,
      dominantKey: convergent ? "comunhao" : sorted[0].key,
      average,
      balance,
      spread,
      tension,
      code: convergent ? "CONVERGENCE" : `${sorted[0].key.toUpperCase()}-LEAD`
    };
  };

  const applyFullPageSkin = (parsedPage, pageName) => {
    let pageShell = parsedPage.body.querySelector(`.${PAGE_CLASS}`);

    if (!pageShell || pageShell.parentElement !== parsedPage.body) {
      pageShell = parsedPage.createElement("section");
      pageShell.className = PAGE_CLASS;

      while (parsedPage.body.firstChild) {
        pageShell.append(parsedPage.body.firstChild);
      }

      parsedPage.body.append(pageShell);
    }

    pageShell.dataset.ui = "gms-kaiju-vinculo-page";
    pageShell.dataset.uiVersion = UI_VERSION;
    pageShell.dataset.kjPageSkin = "xenobiological-containment";

    /*
     * Tudo abaixo é inline de propósito. Assim a página continua temática para
     * jogadores que apenas abrem o Journal e nunca executam esta macro.
     */
    pageShell.style.cssText =
      "position:relative;" +
      "isolation:isolate;" +
      "box-sizing:border-box;" +
      "width:calc(100% + 28px);" +
      "min-height:calc(100vh - 54px);" +
      "margin:-14px;" +
      "padding:14px;" +
      "overflow:hidden;" +
      "color:#edf2ef;" +
      "background:" +
        "repeating-linear-gradient(180deg,transparent 0 3px,rgba(255,255,255,.011) 3px 4px)," +
        "radial-gradient(circle,rgba(74,200,183,.042) 0 1px,transparent 1.25px)," +
        "linear-gradient(rgba(74,200,183,.025) 1px,transparent 1px)," +
        "linear-gradient(90deg,rgba(74,200,183,.021) 1px,transparent 1px)," +
        "radial-gradient(circle at 8% 0%,rgba(232,93,72,.13),transparent 31%)," +
        "radial-gradient(circle at 92% 0%,rgba(74,200,183,.09),transparent 30%)," +
        "radial-gradient(circle at 50% 110%,rgba(120,171,225,.055),transparent 38%)," +
        "linear-gradient(155deg,#101a22 0%,#04080b 70%,#071014 100%);" +
      "background-size:auto,18px 18px,26px 26px,26px 26px,auto,auto,auto,auto;" +
      "border:1px solid #456269;" +
      "box-shadow:inset 0 0 58px rgba(0,0,0,.46);" +
      "font-family:'Roboto Condensed','Arial Narrow',Arial,sans-serif;";

    const titleCandidates = Array.from(
      pageShell.querySelectorAll("[data-kj-page-title], h1, h2, h3")
    );

    let pageTitle = titleCandidates.find(
      (node) => !node.closest(`.${CARD_CLASS}`)
    );

    if (!pageTitle) {
      pageTitle = parsedPage.createElement("h1");
      pageShell.prepend(pageTitle);
    }

    const titleText =
      pageTitle.getAttribute("data-kj-page-title-text") ||
      pageTitle.textContent.trim() ||
      String(pageName || "Vínculo Kaiju");

    pageTitle.setAttribute("data-kj-page-title", "true");
    pageTitle.setAttribute("data-kj-page-title-text", titleText);
    pageTitle.style.cssText =
      "position:relative;" +
      "display:flex;" +
      "flex-wrap:wrap;" +
      "align-items:center;" +
      "justify-content:space-between;" +
      "gap:10px;" +
      "margin:0 0 7px;" +
      "padding:11px 14px;" +
      "overflow:hidden;" +
      "color:#fff;" +
      "background:" +
        "radial-gradient(circle at 92% 0%,rgba(74,200,183,.09),transparent 32%)," +
        "repeating-linear-gradient(135deg,rgba(255,255,255,.015) 0 1px,transparent 1px 8px)," +
        "linear-gradient(110deg,rgba(216,75,88,.18),rgba(16,26,34,.97) 42%,rgba(4,8,11,.99));" +
      "border:1px solid #405c63;" +
      "border-left:6px solid #d84b58;" +
      "clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,0 100%);" +
      "box-shadow:inset 0 1px 0 rgba(255,255,255,.035),inset 12px 0 28px rgba(216,75,88,.05);" +
      "font-family:'Roboto Condensed','Arial Narrow',Arial,sans-serif;" +
      "font-size:inherit;" +
      "line-height:1;" +
      "text-align:left;" +
      "text-transform:uppercase;";

    pageTitle.innerHTML =
      `<span style="display:block;min-width:0;">` +
        `<small style="display:block;margin-bottom:5px;color:#4ac8b7;font-family:Consolas,monospace;font-size:8px;font-weight:900;letter-spacing:.16em;">GMS // ARQUIVO XENOBIOLÓGICO INTEGRAL</small>` +
        `<strong style="display:block;color:#fff;font-size:22px;font-weight:900;letter-spacing:.045em;line-height:1.05;overflow-wrap:anywhere;">${escapeHTML(titleText)}</strong>` +
      `</span>` +
      `<span style="display:inline-flex;align-items:center;gap:7px;padding:5px 8px;color:#79c895;background:rgba(4,9,12,.72);border:1px solid #38545a;font-family:Consolas,monospace;font-size:8px;font-weight:900;letter-spacing:.1em;">` +
        `<span style="display:inline-block;width:7px;height:7px;background:#79c895;border:1px solid #bfe8cd;border-radius:50%;box-shadow:0 0 8px rgba(121,200,149,.7);"></span>` +
        `CONTENÇÃO ONLINE` +
      `</span>`;

    let pageBand = pageShell.querySelector('[data-kj-page-band="true"]');

    if (!pageBand) {
      pageBand = parsedPage.createElement("div");
      pageBand.setAttribute("data-kj-page-band", "true");
      pageTitle.insertAdjacentElement("afterend", pageBand);
    }

    pageBand.style.cssText =
      "display:grid;" +
      "grid-template-columns:repeat(3,minmax(0,1fr));" +
      "gap:1px;" +
      "margin:0 0 11px;" +
      "padding:1px;" +
      "overflow:hidden;" +
      "color:#80979a;" +
      "background:#21383e;" +
      "border-left:4px solid #4ac8b7;" +
      "font-family:Consolas,monospace;" +
      "font-size:7px;" +
      "font-weight:900;" +
      "letter-spacing:.11em;" +
      "text-transform:uppercase;";

    pageBand.innerHTML =
      `<span style="padding:5px 8px;background:#071014;color:#e85d48;">K-03 // XENO-CONTAINMENT</span>` +
      `<span style="padding:5px 8px;background:#071014;text-align:center;color:#4ac8b7;">BIO-LINK MATRIX // LIVE</span>` +
      `<span style="padding:5px 8px;background:#071014;text-align:right;color:#78abe1;">JOURNAL NODE // SECURE</span>`;

    Array.from(pageShell.children)
      .filter((node) => node.tagName === "HR")
      .forEach((divider) => {
        divider.style.cssText =
          "margin:12px 0;" +
          "border:0;" +
          "border-top:1px solid #39535e;" +
          "box-shadow:0 1px 0 rgba(74,200,183,.12);";
      });

    return pageShell;
  };

  const parseValues = (content) => {
    const defaults = { vontade: 0, comunhao: 0, humanidade: 0 };
    if (!content) return defaults;

    const parsed = new DOMParser().parseFromString(content, "text/html");
    const card = parsed.body.querySelector(`.${CARD_CLASS}`);
    if (!card) return defaults;

    const readValue = (key) => {
      const attributeValue = card.getAttribute(`data-${key}`);
      if (attributeValue !== null) return clamp(attributeValue);

      const meter = card.querySelector(`[data-kaiju-meter="${key}"]`);
      const text = meter?.querySelector("[data-kaiju-percent]")?.textContent ?? "";
      const match = text.match(/(\d{1,3})\s*%/);
      return clamp(match?.[1] ?? 0);
    };

    return {
      vontade: readValue("vontade"),
      comunhao: readValue("comunhao"),
      humanidade: readValue("humanidade")
    };
  };

  const buildMeter = ({ key, value }) => {
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
      <div role="progressbar" aria-label="${escapeHTML(axis.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}" style="position: relative; height: 13px; padding: 2px; overflow: hidden; background: #030609; border: 1px solid rgba(${axis.rgb},.38); box-shadow: inset 0 2px 7px rgba(0,0,0,.95);">
        <div style="width: ${value}%; height: 100%; min-width: ${value > 0 ? "3px" : "0"}; background: ${axis.fill}; box-shadow: 0 0 13px rgba(${axis.rgb},.7);"></div>
        ${markers}
      </div>

      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px; margin-top: 6px; font-family: Consolas, monospace; font-size: 8px; font-weight: 800; letter-spacing: .7px; text-transform: uppercase;">
        <span style="color: #778699;">${motionProfile.replaceAll("-", " ")} // AMPLITUDE 000—100</span>
        <span style="color: ${axis.accent};"><i class="fa-solid ${stage.icon}" aria-hidden="true" style="margin-right: 5px;"></i>${stage.signal} // ${stage.label}</span>
      </div>
    </div>`;
  };

  const buildJournalCard = (values) => {
    const reading = getReading(values);
    const profile = getProfile(values);
    const states = getStates(values);
    const dominantAxis = AXES[profile.dominantKey];
    const containmentBand = profile.balance >= 75 ? "ESTÁVEL" : profile.balance >= 40 ? "OSCILANTE" : "CRÍTICA";
    const containmentColor = profile.balance >= 75 ? "#79c895" : profile.balance >= 40 ? "#d7a45a" : "#e85d48";
    const metricCard = (label, value, color, signal, phase) => `<div data-kj-summary-metric="${signal}" style="position:relative;min-width:0;padding:8px 8px 7px;overflow:hidden;background:radial-gradient(circle at 92% 16%,${color}16 0 1px,transparent 1.3px),linear-gradient(150deg,rgba(16,28,34,.94),rgba(4,9,13,.92));background-size:11px 11px,auto;border:1px solid ${color}55;border-top:3px solid ${color};box-shadow:inset 0 1px 0 rgba(255,255,255,.025);"><strong style="display:block;color:${color};font:900 16px/1 Consolas,monospace;">${value}%</strong><small style="display:block;margin-top:3px;color:#85999c;font:800 8px/1.2 Consolas,monospace;letter-spacing:.7px;text-transform:uppercase;">${label}</small>${metricSignalHTML(value, color, phase)}</div>`;

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
              <div style="display:flex;justify-content:space-between;gap:8px;color:#829a9d;font:800 7px/1.2 Consolas,monospace;letter-spacing:.8px;text-transform:uppercase;"><span>BIOASSINATURA COMPOSTA</span><span>LIVE FEED</span></div>
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
      <span>K-03 // XENOFEED ONLINE</span>
    </div>
  </div>
  ${kaijuScanHTML(dominantAxis.accent)}
</section>`;
  };

  const buildControl = ({ key, value }) => {
    const axis = AXES[key];
    const stage = stageAt(key, value);
    const stageMap = axis.stages.map((entry, index) => `
      <button type="button" data-kj-step="${index}" data-kj-step-value="${STAGE_LIMITS[index]}" class="${index < stage.index ? "is-passed" : ""}${index === stage.index ? " is-current" : ""}" aria-label="Definir ${axis.title} em ${STAGE_LIMITS[index]} por cento: ${escapeHTML(entry.label)}" aria-pressed="${index === stage.index}" title="${STAGE_LIMITS[index]}% — ${escapeHTML(entry.label)}">
        <i class="fa-solid ${entry.icon}" aria-hidden="true"></i>
        <small>${STAGE_ROMAN[index]} · ${STAGE_LIMITS[index]}</small>
      </button>`).join("");

    return `
    <div class="kj-control" data-key="${key}" data-stage="${stage.index}" style="--kj-accent: ${axis.accent}; --kj-accent2: ${axis.accent2}; --kj-rgb: ${axis.rgb}; --kj-value: ${value}%;">
      <div class="kj-control-head">
        <div class="kj-control-identity">
          <span class="kj-live-icon"><i data-kj-live-icon class="fa-solid ${stage.icon}" aria-hidden="true"></i></span>
          <span>
            <strong>${axis.title}</strong>
            <small>K-03/${key.toUpperCase()} · ${axis.taxonomy}</small>
          </span>
        </div>
        <output aria-live="polite">${value}%</output>
      </div>
      <div class="kj-control-stage"><span data-kj-live-grade>ESTÁGIO ${stage.roman} · ${stage.index + 1}/6</span><strong data-kj-live-state>${stage.label}</strong></div>
      <div class="kj-control-description">${axis.description}</div>
      <div class="kj-input-row">
        <input data-kj-range type="range" name="${key}" min="0" max="100" step="1" value="${value}" aria-label="${axis.title}">
        <input data-kj-number type="number" name="${key}Number" min="0" max="100" step="1" value="${value}" aria-label="Porcentagem de ${axis.title}">
      </div>
      <div class="kj-stage-map" role="group" aria-label="Atalhos dos estágios de ${axis.title}">${stageMap}</div>
    </div>`;
  };

  const setupManagerControls = (root) => {
    if (!root) return;

    const readLiveValues = () => Object.fromEntries(
      Object.keys(AXES).map((key) => {
        const input = root.querySelector(`.kj-control[data-key="${key}"] [data-kj-range]`);
        return [key, clamp(input?.valueAsNumber ?? 0)];
      })
    );

    const updateOverview = () => {
      const values = readLiveValues();
      const profile = getProfile(values);

      const reading = root.querySelector("[data-kj-live-reading]");
      if (reading) reading.textContent = getReading(values);

      const dominant = root.querySelector("[data-kj-live-dominant]");
      if (dominant) dominant.textContent = profile.dominant;

      const balance = root.querySelector("[data-kj-live-balance]");
      if (balance) balance.textContent = `${profile.balance}%`;

      const average = root.querySelector("[data-kj-live-average]");
      if (average) average.textContent = `${profile.average}%`;
    };

    for (const control of root.querySelectorAll(".kj-control")) {
      const key = control.dataset.key;
      const range = control.querySelector("[data-kj-range]");
      const number = control.querySelector("[data-kj-number]");
      if (!AXES[key] || !range || !number) continue;

      const syncControl = (source) => {
        const rawValue = source.valueAsNumber;
        const value = clamp(Number.isFinite(rawValue) ? rawValue : 0);
        const stage = stageAt(key, value);

        range.value = String(value);
        number.value = String(value);
        control.dataset.stage = String(stage.index);
        control.style.setProperty("--kj-value", `${value}%`);

        const output = control.querySelector("output");
        output.value = `${value}%`;
        output.textContent = `${value}%`;
        control.querySelector("[data-kj-live-icon]").className = `fa-solid ${stage.icon}`;
        control.querySelector("[data-kj-live-state]").textContent = stage.label;
        control.querySelector("[data-kj-live-grade]").textContent = `ESTÁGIO ${stage.roman} · ${stage.index + 1}/6`;

        for (const marker of control.querySelectorAll("[data-kj-step]")) {
          const markerIndex = Number(marker.dataset.kjStep);
          const current = markerIndex === stage.index;
          marker.classList.toggle("is-current", current);
          marker.classList.toggle("is-passed", markerIndex < stage.index);
          marker.setAttribute("aria-pressed", String(current));
        }

        updateOverview();
      };

      range.addEventListener("input", () => syncControl(range));
      range.addEventListener("change", () => syncControl(range));
      number.addEventListener("input", () => syncControl(number));
      number.addEventListener("change", () => syncControl(number));
      for (const marker of control.querySelectorAll("[data-kj-step-value]")) {
        marker.addEventListener("click", () => {
          range.value = marker.dataset.kjStepValue;
          syncControl(range);
        });
      }
      syncControl(range);
    }

    updateOverview();
  };

  const buildConfirmationRow = (key, currentValue, value) => {
    const axis = AXES[key];
    const stage = stageAt(key, value);
    const oldStage = stageAt(key, currentValue);
    const delta = value - currentValue;
    const deltaLabel = delta === 0 ? "SEM ALTERAÇÃO" : `${delta > 0 ? "+" : ""}${delta} PONTOS`;
    const stageChanged = oldStage.index !== stage.index;

    return `
      <div class="kj-confirm-row" style="--kj-accent: ${axis.accent}; --kj-rgb: ${axis.rgb};">
        <span class="kj-confirm-row-icon"><i class="fa-solid ${stage.icon}" aria-hidden="true"></i></span>
        <span>
          <strong>${axis.title}</strong>
          <small>${stage.label} · Estágio ${stage.roman}${stageChanged ? ` · antes ${oldStage.roman}` : ""}</small>
        </span>
        <span class="kj-confirm-values">
          <strong>${currentValue}% → ${value}%</strong>
          <small>${deltaLabel}</small>
        </span>
      </div>`;
  };

  if (!game.user?.isGM) {
    ui.notifications.warn("Vínculo Kaiju: este gerenciador só pode ser usado pelo mestre.");
    return;
  }

  let sourceDocument;
  try {
    sourceDocument = await fromUuid(JOURNAL_UUID);
  } catch (error) {
    console.error("Vínculo Kaiju | Falha ao resolver o diário:", error);
  }

  if (!sourceDocument) {
    ui.notifications.error(`Vínculo Kaiju: diário não encontrado (${JOURNAL_UUID}).`);
    return;
  }

  if (sourceDocument.documentName !== "JournalEntry") {
    ui.notifications.error("Vínculo Kaiju: o UUID configurado não pertence a um Diário principal.");
    return;
  }

  const journal = sourceDocument;
  const htmlFormat = CONST.JOURNAL_ENTRY_PAGE_FORMATS?.HTML ?? 1;
  const pages = journal.pages?.contents ?? Array.from(journal.pages ?? []);
  const textPages = pages.filter((page) => page.type === "text" && page.text?.format === htmlFormat);

  if (!textPages.length) {
    ui.notifications.error(`Vínculo Kaiju: o diário “${journal.name}” não possui páginas de texto em HTML.`);
    return;
  }

  const pageOptions = textPages.map((page) => `
    <option value="${escapeHTML(page.id)}">${escapeHTML(page.name)} — ${escapeHTML(page.id)}</option>`)
    .join("");

  const selectedPageId = await DialogV2.prompt({
    classes: [DIALOG_CLASS, "kj-picker-window"],
    window: {
      title: "K-03 // Selecionar Portador",
      icon: `fa-solid ${UI_ICONS.carrier}`
    },
    position: { width: 620 },
    content: `
      <div class="kj-shell kj-page-picker" data-kj-shell="picker">
        <div class="kj-page-picker-header">
          <span class="kj-page-sigil" role="img" aria-label="Portador do vínculo"><i class="fa-solid ${UI_ICONS.carrier}" aria-hidden="true"></i></span>
          <div>
            <div class="kj-kicker">GMS XENOBIOLOGICAL ARRAY // ACCESS GATE</div>
            <h2>Localizar Portador</h2>
            <p>Selecione a assinatura registrada que receberá a leitura da Tríade do Vínculo.</p>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;">
              <span class="kj-status-chip">CONTENÇÃO ONLINE</span>
              <span class="kj-status-chip">${textPages.length} REGISTRO${textPages.length === 1 ? "" : "S"}</span>
            </div>
          </div>
        </div>
        <div class="kj-field-block">
          <label class="kj-field-label" for="kj-target-page">
            <span><i class="fa-solid ${UI_ICONS.journal}" aria-hidden="true" style="margin-right:6px;color:#d84b58;"></i>Portador / Registro</span>
            <small>JOURNAL NODE</small>
          </label>
          <select id="kj-target-page" name="pageId" autofocus>${pageOptions}</select>
          <div class="kj-page-picker-note">
            <i class="fa-solid ${UI_ICONS.information}" aria-hidden="true" style="margin-top:2px;color:#78abe1;"></i>
            <span>O identificador exibido após o nome garante que a gravação alcance a página correta, mesmo se existirem nomes repetidos.</span>
          </div>
        </div>
      </div>`,
    ok: {
      label: "Conectar ao Portador",
      icon: `fa-solid ${UI_ICONS.connect}`,
      callback: (_event, button) => button.form.elements.pageId.value
    },
    rejectClose: false,
    modal: true
  });

  if (!selectedPageId) return;

  const targetPage = journal.pages.get(selectedPageId);

  if (!targetPage || targetPage.documentName !== "JournalEntryPage" || targetPage.type !== "text") {
    ui.notifications.error(`Vínculo Kaiju: a página de ID “${selectedPageId}” não foi encontrada.`);
    return;
  }

  if (!targetPage.isOwner) {
    ui.notifications.error("Vínculo Kaiju: você não possui permissão para alterar esta página.");
    return;
  }

  const currentContent = targetPage.text?.content ?? "";
  const currentValues = parseValues(currentContent);
  const currentProfile = getProfile(currentValues);

  const dialogContent = `
    <div class="kj-shell kj-manager" data-kj-shell="manager">
      <div class="kj-manager-overview">
        <div class="kj-manager-title">
          <div class="kj-kicker">GMS // K-03 XENOFEED // EDIT MODE</div>
          <h2>Tríade do Vínculo</h2>
          <p><strong style="color:#eef2f6;">${escapeHTML(targetPage.name)}</strong> · <span style="font-family:var(--kj-font-data);">${escapeHTML(targetPage.id)}</span></p>
          <div class="kj-manager-tags">
            <span class="kj-status-chip">BIOASSINATURA ATIVA</span>
            <span class="kj-status-chip">TRÊS CANAIS INDEPENDENTES</span>
          </div>
        </div>
        <div class="kj-manager-summary" aria-label="Resumo da telemetria atual">
          <div class="kj-manager-summary-card" style="--kj-metric-accent:#eef2f6;">
            <small>Aspecto dominante</small>
            <strong data-kj-live-dominant>${escapeHTML(currentProfile.dominant)}</strong>
          </div>
          <div class="kj-manager-summary-card" style="--kj-metric-accent:#4ac8b7;">
            <small>Convergência</small>
            <strong data-kj-live-balance>${currentProfile.balance}%</strong>
          </div>
          <div class="kj-manager-summary-card" style="--kj-metric-accent:#78abe1;">
            <small>Média</small>
            <strong data-kj-live-average>${currentProfile.average}%</strong>
          </div>
        </div>
        <div class="kj-manager-reading">
          <strong><i class="fa-solid ${UI_ICONS.telemetry}" aria-hidden="true" style="margin-right:5px;"></i>Leitura simultânea</strong>
          <span data-kj-live-reading aria-live="polite">${escapeHTML(getReading(currentValues))}</span>
        </div>
      </div>

      <div class="kj-controls-scroll">
        ${buildControl({ key: "vontade", value: currentValues.vontade })}
        ${buildControl({ key: "comunhao", value: currentValues.comunhao })}
        ${buildControl({ key: "humanidade", value: currentValues.humanidade })}
      </div>

      <div class="kj-manager-note">
        <span><i class="fa-solid ${UI_ICONS.independent}" aria-hidden="true" style="margin-right:5px;color:#78abe1;"></i>Os três eixos são independentes e não precisam somar 100%.</span>
        <span>ARRASTE · DIGITE · OU CLIQUE EM UM ESTÁGIO</span>
      </div>
    </div>`;

  const values = await DialogV2.prompt({
    classes: [DIALOG_CLASS, "kj-manager-window"],
    window: {
      title: `K-03 // ${targetPage.name}`,
      icon: `fa-solid ${UI_ICONS.triad}`
    },
    position: { width: Math.min(1040, window.innerWidth - 48) },
    content: dialogContent,
    render: (_event, dialog) => setupManagerControls(dialog.element),
    ok: {
      label: "Revisar Telemetria",
      icon: `fa-solid ${UI_ICONS.review}`,
      callback: (_event, button) => ({
        vontade: clamp(button.form.elements.vontade.valueAsNumber),
        comunhao: clamp(button.form.elements.comunhao.valueAsNumber),
        humanidade: clamp(button.form.elements.humanidade.valueAsNumber)
      })
    },
    rejectClose: false,
    modal: true
  });

  if (!values) return;

  const nextProfile = getProfile(values);
  const changedAxes = Object.keys(AXES).filter((key) => currentValues[key] !== values[key]).length;

  const confirmed = await DialogV2.confirm({
    classes: [DIALOG_CLASS, "kj-confirm-window"],
    window: {
      title: "K-03 // Autorizar Gravação",
      icon: `fa-solid ${UI_ICONS.authorize}`
    },
    position: { width: 650 },
    content: `
      <div class="kj-shell kj-confirmation" data-kj-shell="confirmation">
        <div class="kj-confirm-head">
          <span class="kj-confirm-icon" role="img" aria-label="Registro protegido"><i class="fa-solid ${UI_ICONS.protectedRecord}" aria-hidden="true"></i></span>
          <div>
            <div class="kj-kicker">WRITE AUTHORIZATION // JOURNAL MATRIX</div>
            <h2>Confirmar Telemetria</h2>
            <div class="kj-confirm-target">Destino: <strong style="color:#eef2f6;">${escapeHTML(targetPage.name)}</strong> · ${escapeHTML(targetPage.id)}</div>
          </div>
        </div>

        <div class="kj-confirm-summary">
          <div class="kj-confirm-stat"><strong>${changedAxes}/3</strong><small>Eixos alterados</small></div>
          <div class="kj-confirm-stat"><strong>${nextProfile.balance}%</strong><small>Convergência</small></div>
          <div class="kj-confirm-stat"><strong>${nextProfile.average}%</strong><small>Média vetorial</small></div>
        </div>

        ${buildConfirmationRow("vontade", currentValues.vontade, values.vontade)}
        ${buildConfirmationRow("comunhao", currentValues.comunhao, values.comunhao)}
        ${buildConfirmationRow("humanidade", currentValues.humanidade, values.humanidade)}

        <div class="kj-manager-reading" style="margin-top:12px;">
          <strong><i class="fa-solid ${UI_ICONS.diagnosis}" aria-hidden="true" style="margin-right:5px;"></i>Diagnóstico resultante</strong>
          <span>${escapeHTML(getReading(values))}</span>
        </div>
      </div>`,
    yes: {
      label: "Gravar Matriz",
      icon: `fa-solid ${UI_ICONS.save}`
    },
    no: {
      label: "Cancelar",
      icon: `fa-solid ${UI_ICONS.cancel}`
    },
    rejectClose: false,
    modal: true
  });

  if (!confirmed) return;

  const newCardHTML = buildJournalCard(values);
  const parser = new DOMParser();
  const parsedPage = parser.parseFromString(currentContent, "text/html");
  const parsedCard = parser.parseFromString(newCardHTML, "text/html");
  const newCard = parsedPage.importNode(parsedCard.body.firstElementChild, true);
  const oldCard = parsedPage.body.querySelector(`.${CARD_CLASS}`);

  if (oldCard) {
    oldCard.replaceWith(newCard);
  } else {
    if (parsedPage.body.innerHTML.trim()) {
      const divider = parsedPage.createElement("hr");
      divider.style.cssText = "margin: 22px 0; border: 0; border-top: 1px solid rgba(86,119,151,.46); box-shadow: 0 1px rgba(0,0,0,.48);";
      parsedPage.body.append(divider);
    }
    parsedPage.body.append(newCard);
  }

  applyFullPageSkin(parsedPage, targetPage.name);

  try {
    await targetPage.update({ "text.content": parsedPage.body.innerHTML });
    ui.notifications.info(`[K-03] Matriz do Vínculo atualizada em “${targetPage.name}”.`);
  } catch (error) {
    console.error("Vínculo Kaiju | Falha ao atualizar a página:", error);
    ui.notifications.error("Vínculo Kaiju: ocorreu um erro ao atualizar a página. Veja o console (F12).");
  }
}
