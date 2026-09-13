import { MODULE_ID, SETTINGS } from "./constants.js";
import { openKaijuEditor } from "./editor.js";
import { canViewCarrier, getOrderedCarriers } from "./storage.js";
import { renderCarrierDetail } from "./visuals.js";

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
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "gms-kaiju-vinculo-dashboard",
      title: "GMS // K-03 — Matriz de Vínculos",
      template: `modules/${MODULE_ID}/templates/dashboard.hbs`,
      classes: ["gms-kaiju-dashboard-window"],
      width: 1180,
      height: 780,
      minWidth: 720,
      minHeight: 520,
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

    root.querySelector("[data-action='toggle-carriers']")?.addEventListener("click", async () => {
      const shell = root.querySelector("[data-kj-dashboard]");
      const collapsed = shell?.dataset.sidebarCollapsed === "true";
      await game.settings.set(MODULE_ID, SETTINGS.SIDEBAR_COLLAPSED, !collapsed);
      if (shell) shell.dataset.sidebarCollapsed = String(!collapsed);
      const button = root.querySelector("[data-action='toggle-carriers'] i");
      if (button) button.className = `fa-solid ${!collapsed ? "fa-angles-right" : "fa-angles-left"}`;
    });

    root.querySelector("[data-action='editor']")?.addEventListener("click", () => openKaijuEditor());

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
      detail.innerHTML = `<div class="kj-empty-detail"><span class="kj-empty-sigil"><i class="fa-solid fa-dna"></i></span><h2>Nenhum portador selecionado</h2><p>${game.user?.isGM ? "Use o Editor K-03 para adicionar o primeiro registro." : "Nenhum registro está disponível para sua conta."}</p></div>`;
      return;
    }

    detail.innerHTML = renderCarrierDetail(carrier, { isGM: game.user?.isGM ?? false, tab: this._activeTab });
    detail.querySelectorAll("[data-kj-tab]").forEach((button) => button.addEventListener("click", () => {
      this._activeTab = button.dataset.kjTab || "overview";
      this._renderSelected(root);
    }));
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
  return dashboardInstance;
}

export function refreshKaijuDashboard() {
  dashboardInstance?.refreshFromDatabase();
}
