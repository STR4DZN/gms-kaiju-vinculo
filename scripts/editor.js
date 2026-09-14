import { DEFAULT_LEGACY_JOURNAL_UUID, MODULE_ID } from "./constants.js";
import { AXES, stageAt } from "./visuals.js";
import {
  deleteCarrier,
  duplicateCarrier,
  exportDatabaseJSON,
  getOrderedCarriers,
  importDatabaseJSON,
  importFromLegacyJournal,
  moveCarrier,
  resetCarrierGenome,
  upsertCarrier
} from "./storage.js";

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
      callback: (event, button) => {
        const form = button.form;
        const nameInput = form?.elements?.name;
        const name = String(nameInput?.value || "").trim();
        if (!name) {
          event?.preventDefault?.();
          ui.notifications.warn("Vínculo Kaiju: informe o nome do portador.");
          nameInput?.focus?.();
          nameInput?.style?.setProperty("border-color", "#e85d48");
          throw new Error("O nome do portador é obrigatório.");
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

    root.querySelectorAll("[data-action='duplicate']").forEach((button) => button.addEventListener("click", async () => {
      const duplicated = await duplicateCarrier(button.dataset.id);
      if (duplicated) {
        ui.notifications.info(`Vínculo Kaiju: ${duplicated.name} duplicado.`);
        this.render(false);
      }
    }));

    root.querySelectorAll("[data-action='reset-genome']").forEach((button) => button.addEventListener("click", async () => {
      const carrier = getOrderedCarriers().find((entry) => entry.id === button.dataset.id);
      if (!carrier) return;
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "K-03 // Reiniciar Memória Genética", icon: "fa-solid fa-rotate-left" },
        content: `<div class="kj-delete-confirm"><strong>Reiniciar genoma de ${escapeHTML(carrier.name)}?</strong><p>Todas as mutações persistentes e extremos históricos serão zerados para os valores atuais deste portador.</p></div>`,
        yes: { label: "Reiniciar genoma", icon: "fa-solid fa-rotate-left" },
        no: { label: "Cancelar", icon: "fa-solid fa-xmark" },
        modal: true
      });
      if (!confirmed) return;
      await resetCarrierGenome(carrier.id);
      ui.notifications.info(`Vínculo Kaiju: memória genética de ${carrier.name} reiniciada.`);
      this.render(false);
    }));

    root.querySelector("[data-action='export-json']")?.addEventListener("click", () => {
      const json = exportDatabaseJSON();
      saveDataToFile(json, "application/json", `k03-database-${new Date().toISOString().slice(0, 10)}.json`);
      ui.notifications.info("Vínculo Kaiju: backup exportado com sucesso.");
    });

    root.querySelector("[data-action='import-json']")?.addEventListener("click", async () => {
      const content = `<div class="kj-import-shell" style="padding:10px;"><p style="margin-bottom:8px;color:#c0d0d4;">Cole o conteúdo do backup JSON e escolha a estratégia:</p><label style="display:block;margin-bottom:8px;"><span style="display:block;font-size:10px;color:#8ab;">MODO</span><select id="kj-import-mode" style="width:100%;height:30px;background:#050a0e;color:#fff;border:1px solid #3c5861;"><option value="merge">Mesclar (adicionar novos e atualizar existentes)</option><option value="replace">Substituir banco inteiro</option></select></label><textarea id="kj-import-data" rows="8" placeholder="Cole o JSON de backup aqui..." style="width:100%;background:#050a0e;color:#fff;border:1px solid #3c5861;padding:6px;font-family:monospace;"></textarea></div>`;
      const result = await foundry.applications.api.DialogV2.prompt({
        window: { title: "K-03 // Restaurar Backup JSON", icon: "fa-solid fa-file-import" },
        content,
        ok: {
          label: "Restaurar",
          icon: "fa-solid fa-download",
          callback: (_event, button) => {
            const form = button.form;
            const raw = form.querySelector("#kj-import-data")?.value?.trim();
            const mode = form.querySelector("#kj-import-mode")?.value || "merge";
            if (!raw) {
              ui.notifications.warn("Vínculo Kaiju: informe o conteúdo JSON antes de importar.");
              return false;
            }
            return { raw, mode };
          }
        },
        modal: true
      });
      if (!result) return;
      try {
        await importDatabaseJSON(result.raw, { mode: result.mode });
        ui.notifications.info("Vínculo Kaiju: banco K-03 restaurado com sucesso!");
        this.render(false);
      } catch (err) {
        ui.notifications.error(`Falha ao importar: ${err.message}`);
      }
    });

    root.querySelector("[data-action='import-legacy']")?.addEventListener("click", async () => {
      const content = `<div class="kj-import-shell" style="padding:10px;"><p style="margin-bottom:8px;color:#c0d0d4;">Informe o UUID ou ID do Diário contendo os cards legados da v1.0.0:</p><input type="text" id="kj-legacy-uuid" value="${escapeHTML(DEFAULT_LEGACY_JOURNAL_UUID)}" style="width:100%;height:32px;background:#050a0e;color:#fff;border:1px solid #3c5861;padding:4px 8px;font-family:monospace;"><small style="display:block;margin-top:6px;color:#789;">Padrão: ${escapeHTML(DEFAULT_LEGACY_JOURNAL_UUID)}</small></div>`;
      const result = await foundry.applications.api.DialogV2.prompt({
        window: { title: "K-03 // Importar do Diário Legado (v1.0.0)", icon: "fa-solid fa-book-bookmark" },
        content,
        ok: {
          label: "Importar agora",
          icon: "fa-solid fa-file-import",
          callback: (_event, button) => {
            const val = button.form.querySelector("#kj-legacy-uuid")?.value?.trim();
            return val || null;
          }
        },
        modal: true
      });
      if (!result) return;
      try {
        const count = await importFromLegacyJournal(result);
        if (count > 0) {
          ui.notifications.info(`Vínculo Kaiju: ${count} portador(es) importado(s) com sucesso!`);
          this.render(false);
        } else {
          ui.notifications.warn("Nenhum card de portador legado foi localizado no diário informado.");
        }
      } catch (err) {
        ui.notifications.error(`Falha ao importar do diário: ${err.message}`);
      }
    });
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
