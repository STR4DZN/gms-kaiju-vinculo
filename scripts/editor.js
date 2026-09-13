import { MODULE_ID } from "./constants.js";
import { AXES, stageAt } from "./visuals.js";
import { deleteCarrier, getOrderedCarriers, moveCarrier, upsertCarrier } from "./storage.js";

let editorInstance = null;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
}

function rootOf(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return null;
}

async function openCarrierForm(carrier = null) {
  if (!game.user?.isGM) return null;
  const DialogV2 = foundry.applications.api.DialogV2;
  const current = carrier ?? {
    name: "",
    designation: "",
    description: "",
    values: { vontade: 0, comunhao: 0, humanidade: 0 },
    ownerUserIds: [],
    visibility: "all",
    publicNotes: "",
    gmNotes: ""
  };

  const users = game.users?.contents ?? Array.from(game.users ?? []);
  const userRows = users.map((user) => {
    const checked = current.ownerUserIds?.includes(user.id) ? "checked" : "";
    return `<label class="kj-editor-user"><input type="checkbox" name="ownerUserIds" value="${escapeHTML(user.id)}" ${checked}><span class="kj-editor-user-dot ${user.active ? "is-online" : ""}"></span><span><strong>${escapeHTML(user.name)}</strong><small>${user.isGM ? "MESTRE" : "PLAYER"}</small></span></label>`;
  }).join("");

  const axisFields = Object.entries(AXES).map(([key, axis]) => {
    const value = Number(current.values?.[key] ?? 0);
    const stage = stageAt(key, value);
    return `<div class="kj-editor-axis" style="--kj-accent:${axis.accent};--kj-rgb:${axis.rgb}" data-editor-axis="${key}"><header><span><i class="fa-solid ${axis.icon}"></i><strong>${escapeHTML(axis.title)}</strong></span><output data-axis-output>${value}%</output></header><div class="kj-editor-range"><input type="range" name="${key}" min="0" max="100" step="1" value="${value}"><input type="number" name="${key}Number" min="0" max="100" step="1" value="${value}"></div><small data-axis-stage>Estágio ${stage.roman} · ${escapeHTML(stage.label)}</small></div>`;
  }).join("");

  const content = `<div class="kj-editor-form-shell">
    <section class="kj-editor-section"><header><i class="fa-solid fa-fingerprint"></i><div><small>IDENTIFICAÇÃO</small><strong>Registro do Portador</strong></div></header><div class="kj-editor-grid two"><label><span>Nome do portador</span><input name="name" type="text" value="${escapeHTML(current.name)}" autocomplete="off" required></label><label><span>Designação / referência</span><input name="designation" type="text" value="${escapeHTML(current.designation)}" autocomplete="off"></label></div><label><span>Descrição pública</span><textarea name="description" rows="3">${escapeHTML(current.description)}</textarea></label></section>
    <section class="kj-editor-section"><header><i class="fa-solid fa-wave-square"></i><div><small>TRÍADE</small><strong>Telemetria do Vínculo</strong></div></header><div class="kj-editor-axis-grid">${axisFields}</div></section>
    <section class="kj-editor-section"><header><i class="fa-solid fa-user-group"></i><div><small>ACESSO</small><strong>Players vinculados</strong></div></header><div class="kj-editor-grid two"><label><span>Visibilidade</span><select name="visibility"><option value="all" ${current.visibility !== "owners" ? "selected" : ""}>Todos os jogadores</option><option value="owners" ${current.visibility === "owners" ? "selected" : ""}>Somente players vinculados</option></select></label></div><div class="kj-editor-users">${userRows || '<div class="kj-editor-empty">Nenhum usuário encontrado.</div>'}</div></section>
    <section class="kj-editor-section"><header><i class="fa-solid fa-note-sticky"></i><div><small>ANOTAÇÕES</small><strong>Informações complementares</strong></div></header><div class="kj-editor-grid two"><label><span>Notas visíveis aos players</span><textarea name="publicNotes" rows="5">${escapeHTML(current.publicNotes)}</textarea></label><label><span>Notas privadas do mestre</span><textarea name="gmNotes" rows="5">${escapeHTML(current.gmNotes)}</textarea></label></div></section>
  </div>`;

  const result = await DialogV2.prompt({
    classes: ["gms-kaiju-editor-dialog"],
    window: { title: carrier ? `K-03 // Editar ${current.name}` : "K-03 // Novo Portador", icon: "fa-solid fa-dna" },
    position: { width: Math.min(940, window.innerWidth - 60) },
    content,
    render: (_event, dialog) => {
      const root = dialog.element;
      root.querySelectorAll("[data-editor-axis]").forEach((axisEl) => {
        const key = axisEl.dataset.editorAxis;
        const range = axisEl.querySelector(`input[name="${key}"]`);
        const number = axisEl.querySelector(`input[name="${key}Number"]`);
        const output = axisEl.querySelector("[data-axis-output]");
        const stageEl = axisEl.querySelector("[data-axis-stage]");
        const sync = (source) => {
          const value = Math.min(100, Math.max(0, Math.round(Number(source.value) || 0)));
          range.value = value; number.value = value; output.textContent = `${value}%`;
          const stage = stageAt(key, value);
          stageEl.textContent = `Estágio ${stage.roman} · ${stage.label}`;
          range.style.setProperty("--kj-editor-value", `${value}%`);
        };
        range.addEventListener("input", () => sync(range));
        number.addEventListener("input", () => sync(number));
        sync(range);
      });
    },
    ok: {
      label: carrier ? "Salvar alterações" : "Criar portador",
      icon: "fa-solid fa-floppy-disk",
      callback: (_event, button) => {
        const form = button.form;
        const name = String(form.elements.name?.value || "").trim();
        if (!name) {
          ui.notifications.warn("Vínculo Kaiju: informe o nome do portador.");
          return false;
        }
        return {
          id: carrier?.id,
          name,
          designation: form.elements.designation?.value || "",
          description: form.elements.description?.value || "",
          values: {
            vontade: form.elements.vontade?.valueAsNumber ?? 0,
            comunhao: form.elements.comunhao?.valueAsNumber ?? 0,
            humanidade: form.elements.humanidade?.valueAsNumber ?? 0
          },
          ownerUserIds: [...form.querySelectorAll('input[name="ownerUserIds"]:checked')].map((el) => el.value),
          visibility: form.elements.visibility?.value || "all",
          publicNotes: form.elements.publicNotes?.value || "",
          gmNotes: form.elements.gmNotes?.value || ""
        };
      }
    },
    rejectClose: false,
    modal: true
  });

  if (!result) return null;
  return upsertCarrier(result, { previous: carrier });
}

export class KaijuEditorApplication extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "gms-kaiju-vinculo-editor",
      title: "K-03 // Editor de Portadores",
      template: `modules/${MODULE_ID}/templates/editor.hbs`,
      classes: ["gms-kaiju-editor-window"],
      width: 820,
      height: 680,
      resizable: true,
      popOut: true
    });
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    const carriers = getOrderedCarriers().map((carrier, index, list) => ({
      ...carrier,
      vontade: carrier.values?.vontade ?? 0,
      comunhao: carrier.values?.comunhao ?? 0,
      humanidade: carrier.values?.humanidade ?? 0,
      ownerNames: (carrier.ownerUserIds || []).map((id) => game.users?.get(id)?.name).filter(Boolean).join(", ") || "—",
      canMoveUp: index > 0,
      canMoveDown: index < list.length - 1
    }));
    return { ...data, carriers, hasCarriers: carriers.length > 0 };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root = rootOf(html);
    if (!root) return;

    root.querySelector("[data-action='add']")?.addEventListener("click", async () => {
      const created = await openCarrierForm();
      if (created) {
        ui.notifications.info(`Vínculo Kaiju: ${created.name} adicionado.`);
        this.render(false);
      }
    });

    root.querySelectorAll("[data-action='edit']").forEach((button) => button.addEventListener("click", async () => {
      const carrier = getOrderedCarriers().find((entry) => entry.id === button.dataset.id);
      if (!carrier) return;
      const saved = await openCarrierForm(carrier);
      if (saved) {
        ui.notifications.info(`Vínculo Kaiju: ${saved.name} atualizado.`);
        this.render(false);
      }
    }));

    root.querySelectorAll("[data-action='delete']").forEach((button) => button.addEventListener("click", async () => {
      const carrier = getOrderedCarriers().find((entry) => entry.id === button.dataset.id);
      if (!carrier) return;
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "K-03 // Apagar Portador", icon: "fa-solid fa-triangle-exclamation" },
        content: `<div class="kj-delete-confirm"><strong>Apagar ${escapeHTML(carrier.name)}?</strong><p>O registro, as notas e o histórico desse portador serão removidos do banco K-03.</p></div>`,
        yes: { label: "Apagar definitivamente", icon: "fa-solid fa-trash" },
        no: { label: "Cancelar", icon: "fa-solid fa-xmark" },
        modal: true
      });
      if (!confirmed) return;
      await deleteCarrier(carrier.id);
      ui.notifications.info(`Vínculo Kaiju: ${carrier.name} removido.`);
      this.render(false);
    }));

    root.querySelectorAll("[data-action='move']").forEach((button) => button.addEventListener("click", async () => {
      await moveCarrier(button.dataset.id, button.dataset.direction);
      this.render(false);
    }));
  }
}

export function openKaijuEditor() {
  if (!game.user?.isGM) {
    ui.notifications.warn("Vínculo Kaiju: somente o mestre pode abrir o Editor K-03.");
    return null;
  }
  if (!editorInstance) editorInstance = new KaijuEditorApplication();
  editorInstance.render(true);
  return editorInstance;
}

export function refreshKaijuEditor() {
  if (editorInstance?.rendered) editorInstance.render(false);
}
