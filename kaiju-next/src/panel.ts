import {renderReadout} from "./readout.ts";
import {AXES,AXIS_KEYS,ROMAN,THRESHOLDS,axisKey,diffCarrier,percent,randomId,stageAt,type Carrier,type Repository} from "./domain.ts";

type Tab = "overview" | "stages" | "notes" | "edit";
type Template = (context: Record<string,unknown>) => string;
interface Draft { base: Carrier; record: Carrier }
export class KaijuPanel {
  private readonly instance = `kaiju-${randomId()}`;
  private readonly drafts = new Map<string,Draft>();
  private selected = "";
  private tab: Tab = "overview";
  private search = "";
  private creating = false;
  private busy = false;
  private destroyed = false;
  private listeners = new AbortController();
  private readonly unsubscribe: () => void;

  constructor(private readonly root: HTMLElement,private readonly repository: Repository,private readonly template: Template) {
    this.unsubscribe = repository.subscribe(() => {if(!this.busy && !this.destroyed) this.refresh()});
    this.render();
  }
  destroy(): void {this.destroyed=true;this.listeners.abort();this.unsubscribe()}
  private current(): Draft | undefined {return this.drafts.get(this.selected)}
  private dirty(draft=this.current()): boolean {return !!draft && Object.keys(diffCarrier(draft.base,draft.record)).length>0}
  private refresh(): void {
    for (const carrier of this.repository.list()) {
      const draft=this.drafts.get(carrier.id);
      if (!this.repository.isGM || !draft || !this.dirty(draft)) this.drafts.set(carrier.id,{base:structuredClone(carrier),record:structuredClone(carrier)});
    }
    this.render();
  }
  private render(): void {
    this.listeners.abort();this.listeners=new AbortController();
    const carriers=this.repository.list();
    for (const record of carriers) if(!this.repository.isGM || !this.drafts.has(record.id)) this.drafts.set(record.id,{base:structuredClone(record),record:structuredClone(record)});
    if(!carriers.some(record=>record.id===this.selected)) this.selected=carriers[0]?.id??"";
    const draft=this.current(),carrier=draft?.record;
    const axes=AXIS_KEYS.map(key=>{
      const value=carrier?.values[key]??0,index=stageAt(key,value).index;
      return {...AXES[key],key,value,stage:stageAt(key,value),
        markers:ROMAN.map((roman,i)=>({roman,index:i,current:i===index})),
        allStages:AXES[key].stages.map((stage,i)=>({...stage,roman:ROMAN[i],range:i===5?"100":`${THRESHOLDS[i]}–${THRESHOLDS[i+1]!-1}`,current:i===index,passed:i<index}))};
    });
    this.root.innerHTML=this.template({instance:this.instance,count:carriers.length,isGM:this.repository.isGM,search:this.search,
      carriers:carriers.map(record=>({...record,selected:record.id===this.selected,subtitle:record.designation||"Portador Kaiju",initials:record.name.split(/\s+/).slice(0,2).map(part=>part.charAt(0)).join("").toUpperCase()})),
      carrier:carrier?{...carrier,code:carrier.id.slice(0,6).toUpperCase()}:null,
      readout:carrier?renderReadout(carrier.values):"",axes,dirty:this.dirty(),creating:this.creating,activeTab:this.tab,
      overview:this.tab==="overview",stages:this.tab==="stages",notes:this.tab==="notes",edit:this.tab==="edit" && this.repository.isGM,
      tabs:[{id:"overview",label:"Vínculo",icon:"link"},{id:"stages",label:"Estágios",icon:"layer-group"},{id:"notes",label:"Registro",icon:"file-lines"} ,...(this.repository.isGM?[{id:"edit",label:"Controles",icon:"sliders"}]:[])].map(tab=>({...tab,active:tab.id===this.tab}))});
    const signal=this.listeners.signal;
    this.root.addEventListener("click",this.click,{signal});
    this.root.addEventListener("input",this.input,{signal});
    this.root.addEventListener("change",this.change,{signal});
    this.root.addEventListener("keydown",this.keydown,{signal});
    this.root.addEventListener("submit",this.submit,{signal});
    if(this.creating) {
      this.root.querySelector<HTMLElement>(".kaiju-main")!.inert=true;
      this.root.querySelector<HTMLElement>(".kaiju-sidebar")!.inert=true;
      this.root.querySelector<HTMLInputElement>(".kaiju-create-form input")?.focus();
    }
    this.filterList();this.updateStatus();
  }
  private readonly click = (event: MouseEvent): void => {
    if(!(event.target instanceof Element)) return;
    const element=event.target.closest<HTMLElement>("button");if(!element || element.hasAttribute("disabled"))return;
    if(this.busy && (element.dataset.record || ["new","revert","cancel-create"].includes(element.dataset.command??"")))return;
    if(element.dataset.record) {this.selected=element.dataset.record;this.render();return}
    const tab=element.dataset.tab;
    if(tab==="overview" || tab==="stages" || tab==="notes" || (tab==="edit" && this.repository.isGM)) {this.tab=tab;this.render();this.root.querySelector<HTMLElement>(`[data-tab="${tab}"]`)?.focus();return}
    switch(element.dataset.command) {
      case "new":if(this.repository.isGM){this.creating=true;this.render()}break;
      case "cancel-create":this.creating=false;this.render();this.root.querySelector<HTMLElement>('[data-command="new"]')?.focus();break;
      case "save":void this.save();break;
      case "revert":{
        const latest=this.repository.list().find(record=>record.id===this.selected);
        if(latest)this.drafts.set(latest.id,{base:structuredClone(latest),record:structuredClone(latest)});
        this.render();break;
      }
    }
  };
  private readonly input = (event: Event): void => {
    if(!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) return;
    const target=event.target;
    if(target.hasAttribute("data-search")) {this.search=target.value;this.filterList();return}
    if(!this.repository.isGM || this.busy) return;
    const draft=this.current();if(!draft)return;
    if(target instanceof HTMLInputElement && axisKey(target.dataset.range)) this.setAxis(target.dataset.range,Number(target.value));
    if(target instanceof HTMLInputElement && axisKey(target.dataset.percent)) {
      try {
        const value=percent(target.value===""?NaN:Number(target.value));
        target.setCustomValidity("");this.setAxis(target.dataset.percent,value);
      } catch {target.setCustomValidity("Informe um inteiro entre 0 e 100.")}
    }
    const field=target.dataset.field;
    if(field==="name" || field==="designation" || field==="notes") {draft.record[field]=target.value;this.updateStatus()}
  };
  private readonly change = (event: Event): void => {
    if(event.target instanceof HTMLSelectElement && event.target.hasAttribute("data-record-select") && !this.busy) {this.selected=event.target.value;this.render();return}
    if(!this.repository.isGM || this.busy || !(event.target instanceof HTMLInputElement))return;
    const target=event.target,draft=this.current();if(!draft)return;
    if(axisKey(target.dataset.percent)) {
      try {this.setAxis(target.dataset.percent,percent(target.value===""?NaN:Number(target.value)))}
      catch(error) {target.value=String(draft.record.values[target.dataset.percent]);target.setCustomValidity("");this.error(error)}
    }
    if(target.dataset.field==="shared") {draft.record.shared=target.checked;this.updateStatus()}
  };
  private setAxis(key: typeof AXIS_KEYS[number],value:number): void {
    const draft=this.current();if(!draft)return;
    draft.record.values[key]=percent(value);
    const axis=this.root.querySelector<HTMLElement>(`[data-axis="${key}"]`),stage=stageAt(key,value);
    if(axis) {
      const slider=axis.querySelector<HTMLInputElement>("[data-range]")!;
      slider.value=String(value);slider.style.setProperty("--fill",`${value}%`);
      const numeric=axis.querySelector<HTMLInputElement>("[data-percent]")!;
      numeric.value=String(value);numeric.setCustomValidity("");
      const icon=axis.querySelector<HTMLElement>("[data-stage-icon]")!;
      const nextClass=`fa-solid fa-${stage.icon}`;
      if(icon.className!==nextClass) {const replacement=icon.cloneNode() as HTMLElement;replacement.className=nextClass;icon.replaceWith(replacement)}
      axis.querySelector<HTMLElement>("[data-stage-roman]")!.textContent=stage.roman;
      axis.querySelector<HTMLElement>("[data-stage-label]")!.textContent=stage.label;
      axis.querySelectorAll<HTMLElement>("[data-marker]").forEach(marker=>marker.classList.toggle("is-current",Number(marker.dataset.marker)===stage.index));
    }
    const readout=this.root.querySelector<HTMLElement>("[data-readout]");
    if(readout)readout.innerHTML=renderReadout(draft.record.values);
    this.updateStatus();
  }
  private filterList(): void {
    const query=this.search.toLocaleLowerCase("pt-BR");let matches=0;
    this.root.querySelectorAll<HTMLButtonElement>("[data-record]").forEach(button=>{
      const visible=(button.textContent??"").toLocaleLowerCase("pt-BR").includes(query);button.hidden=!visible;if(visible)matches++;
    });
    const empty=this.root.querySelector<HTMLElement>(".kaiju-no-results");if(empty)empty.hidden=matches!==0;
  }
  private updateStatus(message?:string): void {
    const dirty=this.dirty(),status=this.root.querySelector<HTMLElement>("[data-status]");
    if(status) {status.classList.toggle("is-dirty",dirty);status.classList.remove("is-error");status.textContent=message??(this.busy?"Salvando vínculo…":dirty?"Alterações não salvas":this.repository.isGM?"Registro atualizado":"Consulta do vínculo")}
    this.root.querySelectorAll<HTMLButtonElement>('[data-command="save"],[data-command="revert"]').forEach(button=>{button.disabled=this.busy||!dirty});
    this.root.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('[data-record],[data-record-select],[data-command="new"]').forEach(control=>{control.disabled=this.busy});
    this.root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-range],[data-percent],[data-field]").forEach(input=>{input.disabled=this.busy||!this.repository.isGM});
  }
  private error(error:unknown): void {
    const status=this.root.querySelector<HTMLElement>("[data-status]");
    if(status){status.textContent=error instanceof Error?error.message:"Não foi possível completar a operação.";status.classList.add("is-error")}
  }
  private async save(): Promise<void> {
    const draft=this.current();if(!draft || this.busy || !this.repository.isGM || !this.dirty())return;
    const invalid=[...this.root.querySelectorAll<HTMLInputElement>("[data-percent]")].find(input=>!input.checkValidity());
    if(invalid){invalid.reportValidity();this.error(new Error("Corrija o valor do eixo antes de salvar."));return}
    this.busy=true;this.updateStatus();
    try {
      const record=await this.repository.save(draft.base.id,diffCarrier(draft.base,draft.record),draft.base);
      this.drafts.set(record.id,{base:structuredClone(record),record:structuredClone(record)});
      this.busy=false;if(!this.destroyed){this.render();this.updateStatus("Vínculo salvo")}
    } catch(error) {this.busy=false;if(!this.destroyed){this.updateStatus();this.error(error)}}
  }
  private readonly submit = (event: SubmitEvent): void => {
    if(!(event.target instanceof HTMLFormElement) || !event.target.matches(".kaiju-create-form"))return;
    event.preventDefault();if(!this.repository.isGM || this.busy)return;
    const form=event.target,name=(new FormData(form).get("name")??"").toString().trim();
    if(!name) {form.querySelector<HTMLInputElement>("input")?.focus();return}
    this.busy=true;form.querySelectorAll<HTMLButtonElement>("button").forEach(button=>{button.disabled=true});
    void this.repository.create(name).then(record=>{
      this.selected=record.id;this.creating=false;this.tab="overview";this.busy=false;
      if(!this.destroyed)this.refresh();
    }).catch((error:unknown)=>{
      this.busy=false;form.querySelectorAll<HTMLButtonElement>("button").forEach(button=>{button.disabled=false});
      const alert=form.querySelector<HTMLElement>("[data-create-error]");if(alert)alert.textContent=error instanceof Error?error.message:"Não foi possível criar o portador.";
    });
  };
  private readonly keydown = (event: KeyboardEvent): void => {
    if(this.creating) {
      const form=this.root.querySelector<HTMLFormElement>(".kaiju-create-form");if(!form)return;
      if(event.key==="Escape" && !this.busy){event.preventDefault();event.stopPropagation();this.creating=false;this.render();this.root.querySelector<HTMLElement>('[data-command="new"]')?.focus()}
      if(event.key==="Tab") {
        const focusable=[...form.querySelectorAll<HTMLElement>("input,button:not(:disabled)")];
        const first=focusable[0],last=focusable.at(-1);
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus()}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus()}
      }
      return;
    }
    if(!(event.target instanceof HTMLElement) || event.target.getAttribute("role")!=="tab")return;
    const tabs=[...this.root.querySelectorAll<HTMLButtonElement>('[role="tab"]')],index=tabs.indexOf(event.target as HTMLButtonElement);
    let next=index;
    if(event.key==="ArrowRight")next=(index+1)%tabs.length;
    else if(event.key==="ArrowLeft")next=(index+tabs.length-1)%tabs.length;
    else if(event.key==="Home")next=0;
    else if(event.key==="End")next=tabs.length-1;
    else return;
    event.preventDefault();tabs[next]?.click();
  };
}
