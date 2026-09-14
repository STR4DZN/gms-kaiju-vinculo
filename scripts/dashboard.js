import { MODULE_ID, SETTINGS } from "./constants.js";
import { openKaijuEditor } from "./editor.js";
import { canViewCarrier, getOrderedCarriers } from "./storage.js";
import { buildChatCardHTML, renderCarrierDetail } from "./visuals.js";
import { startGenomeRenderer } from "./genome-renderer.js";

let dashboardInstance = null;

function rootOf(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return null;
}

export class KaijuDashboardApplication extends Application {
  constructor(options = {}) {
    super(options);
    this._selectedId = "";
    this._activeTab = "overview";
    this._genomeRenderer = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "gms-kaiju-vinculo-dashboard",
      title: "GMS // K-03 — Matriz de Vínculos",
      template: `modules/${MODULE_ID}/templates/dashboard.hbs`,
      classes: ["gms-kaiju-dashboard-window"],
      width: 1380,
      height: 820,
      minWidth: 720,
      minHeight: 540,
      resizable: true,
      popOut: true
    });
  }

  _visibleCarriers() {
    let carriers = getOrderedCarriers().filter((carrier) => canViewCarrier(carrier));
    const sortMode = game.settings.get(MODULE_ID, SETTINGS.SORT_MODE) || "manual";
    if (sortMode === "name") carriers = [...carriers].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    if (["vontade", "comunhao", "humanidade"].includes(sortMode)) carriers = [...carriers].sort((a, b) => (b.values?.[sortMode] ?? 0) - (a.values?.[sortMode] ?? 0));
    return carriers;
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    const collapsed = Boolean(game.settings.get(MODULE_ID, SETTINGS.SIDEBAR_COLLAPSED));
    const carriers = this._visibleCarriers();
    const saved = game.settings.get(MODULE_ID, SETTINGS.LAST_CARRIER) || "";
    const chosen = this._selectedId && carriers.some((c) => c.id === this._selectedId)
      ? this._selectedId
      : saved && carriers.some((c) => c.id === saved)
        ? saved
        : carriers[0]?.id || "";
    this._selectedId = chosen;

    const rows = carriers.map((carrier) => ({
      id: carrier.id,
      name: carrier.name,
      designation: carrier.designation,
      vontade: carrier.values?.vontade ?? 0,
      comunhao: carrier.values?.comunhao ?? 0,
      humanidade: carrier.values?.humanidade ?? 0,
      isSelected: carrier.id === chosen,
      isMine: carrier.ownerUserIds?.includes(game.user.id) ?? false
    }));

    return {
      ...data,
      isGM: game.user?.isGM ?? false,
      collapsed,
      carriers: rows,
      hasCarriers: rows.length > 0,
      carrierCount: rows.length,
      selectedId: chosen,
      sortMode: game.settings.get(MODULE_ID, SETTINGS.SORT_MODE) || "manual",
      sortManual: (game.settings.get(MODULE_ID, SETTINGS.SORT_MODE) || "manual") === "manual",
      sortName: (game.settings.get(MODULE_ID, SETTINGS.SORT_MODE) || "manual") === "name",
      sortVontade: (game.settings.get(MODULE_ID, SETTINGS.SORT_MODE) || "manual") === "vontade",
      sortComunhao: (game.settings.get(MODULE_ID, SETTINGS.SORT_MODE) || "manual") === "comunhao",
      sortHumanidade: (game.settings.get(MODULE_ID, SETTINGS.SORT_MODE) || "manual") === "humanidade"
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root = rootOf(html);
    if (!root) return;

    const shell = root.querySelector("[data-kj-dashboard]");
    const applySidebarState = (collapsed) => {
      if (!shell) return;
      const next = Boolean(collapsed);
      shell.dataset.sidebarCollapsed = String(next);
      shell.classList.toggle("is-sidebar-collapsed", next);
      shell.style.setProperty("--kj-carrier-column", next ? "42px" : "clamp(184px, 23vw, 284px)");
      const icon = root.querySelector("[data-action='toggle-carriers'] i");
      if (icon) icon.className = `fa-solid ${next ? "fa-angles-right" : "fa-angles-left"}`;
      const toggle = root.querySelector("[data-action='toggle-carriers']");
      if (toggle) toggle.setAttribute("aria-expanded", String(!next));
    };

    applySidebarState(shell?.dataset.sidebarCollapsed === "true");
    root.querySelector("[data-action='toggle-carriers']")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const collapsed = shell?.classList.contains("is-sidebar-collapsed") ?? false;
      const next = !collapsed;
      applySidebarState(next); // visual primeiro: nunca depende da persistência para recolher
      Promise.resolve(game.settings.set(MODULE_ID, SETTINGS.SIDEBAR_COLLAPSED, next)).catch((error) => {
        console.error("K-03 | Falha ao salvar estado da aba de portadores", error);
      });
      requestAnimationFrame(() => this._genomeRenderer?._resize?.());
    }, { capture: true });

    root.querySelector("[data-action='editor']")?.addEventListener("click", () => openKaijuEditor());
    root.querySelector("[data-action='close-dashboard']")?.addEventListener("click", () => this.close());

    const dragBar = root.querySelector(".kj-system-bar");
    dragBar?.addEventListener("mousedown", (event) => {
      if (event.button !== 0 || event.target.closest("button, input, select, textarea, a")) return;
      const startX = event.clientX;
      const startY = event.clientY;
      const appEl = this.element?.[0] ?? this.element;
      const appBox = appEl?.getBoundingClientRect?.();
      const startLeft = Number(this.position?.left ?? appBox?.left ?? 0);
      const startTop = Number(this.position?.top ?? appBox?.top ?? 0);
      const onMove = (moveEvent) => {
        this.setPosition({ left: startLeft + (moveEvent.clientX - startX), top: startTop + (moveEvent.clientY - startY) });
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      event.preventDefault();
    });

    root.querySelector("[data-kj-search]")?.addEventListener("input", (event) => {
      const query = String(event.currentTarget.value || "").trim().toLocaleLowerCase("pt-BR");
      root.querySelectorAll("[data-carrier-row]").forEach((row) => {
        row.hidden = query && !row.dataset.search.toLocaleLowerCase("pt-BR").includes(query);
      });
    });

    root.querySelector("[data-kj-sort]")?.addEventListener("change", async (event) => {
      await game.settings.set(MODULE_ID, SETTINGS.SORT_MODE, event.currentTarget.value);
      this.render(false);
    });

    root.querySelectorAll("[data-carrier-row]").forEach((row) => row.addEventListener("click", async () => {
      const id = row.dataset.carrierRow;
      if (!id) return;
      this._selectedId = id;
      this._activeTab = "overview";
      await game.settings.set(MODULE_ID, SETTINGS.LAST_CARRIER, id);
      root.querySelectorAll("[data-carrier-row]").forEach((entry) => entry.classList.toggle("is-selected", entry.dataset.carrierRow === id));
      this._renderSelected(root);
    }));

    this._renderSelected(root);
  }

  _renderSelected(root) {
    const detail = root.querySelector("[data-kj-detail-root]");
    if (!detail) return;
    const carrier = this._visibleCarriers().find((entry) => entry.id === this._selectedId);
    if (!carrier) {
      this._genomeRenderer?.stop?.();
      this._genomeRenderer = null;
      detail.innerHTML = `<div class="kj-empty-detail"><span class="kj-empty-sigil"><i class="fa-solid fa-dna"></i></span><h2>Nenhum portador selecionado</h2><p>${game.user?.isGM ? "Use o Editor K-03 para adicionar o primeiro registro." : "Nenhum registro está disponível para sua conta."}</p></div>`;
      return;
    }

    this._genomeRenderer?.stop?.();
    this._genomeRenderer = null;
    detail.innerHTML = renderCarrierDetail(carrier, { isGM: game.user?.isGM ?? false, tab: this._activeTab });
    this._genomeRenderer = startGenomeRenderer(detail, carrier);

    detail.querySelector("[data-action='post-chat']")?.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const cardHTML = buildChatCardHTML(carrier);
      await ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker(),
        content: cardHTML,
        flavor: "K-03 // Telemetria Xenobiológica de Vínculo"
      });
      ui.notifications.info(`K-03: telemetria de “${carrier.name}” transmitida ao chat.`);
    });

    const pauseBtn = detail.querySelector(".kj-monitor-status, .kj-dna-pill.is-filled");
    pauseBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      if (!this._genomeRenderer) return;
      const isPaused = this._genomeRenderer.togglePause();
      if (pauseBtn.classList.contains("kj-monitor-status")) {
        pauseBtn.innerHTML = `<i class="kj-pulse-dot"></i>${isPaused ? "SEQUENCIAMENTO PAUSADO" : "AMOSTRA BIO-ESTABILIZADA"}`;
      } else {
        const span = pauseBtn.querySelector("span");
        if (span) span.textContent = isPaused ? "SEQUENCING PAUSED" : "SEQUENCING ACTIVE";
        pauseBtn.classList.toggle("is-paused", isPaused);
      }
    });

    detail.querySelectorAll("[data-kj-tab]").forEach((button) => button.addEventListener("click", () => {
      this._activeTab = button.dataset.kjTab || "overview";
      this._renderSelected(root);
    }));
  }

  async close(options = {}) {
    this._genomeRenderer?.stop?.();
    this._genomeRenderer = null;
    return super.close(options);
  }

  refreshFromDatabase() {
    if (!this.rendered) return;
    const visible = this._visibleCarriers();
    if (this._selectedId && !visible.some((carrier) => carrier.id === this._selectedId)) this._selectedId = visible[0]?.id || "";
    this.render(false);
  }
}

export function openKaijuDashboard() {
  if (!dashboardInstance) dashboardInstance = new KaijuDashboardApplication();
  dashboardInstance.render(true);
  const viewportWidth = Math.max(760, window.innerWidth || 1380);
  const viewportHeight = Math.max(560, window.innerHeight || 820);
  const width = Math.min(1380, Math.max(780, viewportWidth - 12));
  const height = Math.min(860, Math.max(600, viewportHeight - 12));
  dashboardInstance.setPosition({
    width, height,
    left: Math.max(6, Math.round((viewportWidth - width) / 2)),
    top: Math.max(6, Math.round((viewportHeight - height) / 2))
  });
  return dashboardInstance;
}

export function refreshKaijuDashboard() {
  dashboardInstance?.refreshFromDatabase();
}
