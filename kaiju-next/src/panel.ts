import {PanelMotion} from "./motion.ts";
import {paletteStyle} from "./palette.ts";
import {renderReadout} from "./readout.ts";
import {AXES,AXIS_KEYS,ROMAN,THRESHOLDS,axisKey,diffCarrier,percent,randomId,stageAt,portraitPath,type Carrier,type Repository} from "./domain.ts";

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
  private readonly motion:PanelMotion;
  private readonly resize:ResizeObserver;
  private readonly scrollPositions=new Map<string,number>();
  private renderedView="";

  constructor(private readonly root: HTMLElement,private readonly repository: Repository,private readonly template: Template,private readonly imageOptions:{localImages?:boolean;resolvePortrait?:(path:string)=>string;pickImage?:(current:string,select:(path:string)=>void)=>void}={}) {
    this.motion=new PanelMotion(root);
    this.resize=new ResizeObserver(()=>this.motion.indicator());this.resize.observe(root);
    this.unsubscribe = repository.subscribe(() => {if(!this.busy && !this.destroyed) this.refresh()});
    this.render("initial");
  }
  setMotion(mode:"auto"|"calm"|"off"):void {this.motion.setMode(mode)}
  destroy(): void {this.destroyed=true;this.listeners.abort();this.unsubscribe();this.motion.destroy();this.resize.disconnect()}
  private focusNew():void {const button=[...this.root.querySelectorAll<HTMLElement>('[data-command="new"]')].find(element=>element.offsetParent!==null);button?.focus({preventScroll:true})}
  private current(): Draft | undefined {return this.drafts.get(this.selected)}
  private dirty(draft=this.current()): boolean {return !!draft && Object.keys(diffCarrier(draft.base,draft.record)).length>0}
  private refresh(): void {
    for (const carrier of this.repository.list()) {
      const draft=this.drafts.get(carrier.id);
      if (!this.repository.isGM || !draft || !this.dirty(draft)) this.drafts.set(carrier.id,{base:structuredClone(carrier),record:structuredClone(carrier)});
    }
    this.render();
  }
  private render(reason:"initial"|"tab"|"record"|"dialog"|"refresh"="refresh",direction=1): void {
    const oldIndicator=this.root.querySelector(".kaiju-tab-indicator")?.getBoundingClientRect();
    const sidebarScroll=this.root.querySelector(".kaiju-carriers")?.scrollTop??0;
    const body=this.root.querySelector(".kaiju-body");
    if(body && this.renderedView)this.scrollPositions.set(this.renderedView,body.scrollTop);
    const active=document.activeElement;
    const focused=active instanceof HTMLElement && this.root.contains(active)?active:undefined;
    const focusKey=focused?.dataset.field?`[data-field="${focused.dataset.field}"]`:focused?.dataset.percent?`[data-percent="${focused.dataset.percent}"]`:focused?.dataset.command?`[data-command="${focused.dataset.command}"]`:focused?.dataset.record?`[data-record="${focused.dataset.record}"]`:focused?.dataset.tab?`[role="tab"][data-tab="${focused.dataset.tab}"]`:undefined;
    this.motion.stop();this.motion.clearAmbient();
    this.listeners.abort();this.listeners=new AbortController();
    const carriers=this.repository.list();
    for (const record of carriers) if(!this.repository.isGM || !this.drafts.has(record.id)) this.drafts.set(record.id,{base:structuredClone(record),record:structuredClone(record)});
    if(!carriers.some(record=>record.id===this.selected)) this.selected=carriers[0]?.id??"";
    const draft=this.current(),carrier=draft?.record;
    const axes=AXIS_KEYS.map(key=>{
      const value=carrier?.values[key]??0,index=stageAt(key,value).index;
      return {...AXES[key],key,value,theme:paletteStyle(key,value),stage:stageAt(key,value),
        markers:ROMAN.map((roman,i)=>({roman,index:i,current:i===index})),
        allStages:AXES[key].stages.map((stage,i)=>({...stage,theme:paletteStyle(key,THRESHOLDS[i]!),roman:ROMAN[i],range:i===5?"100":`${THRESHOLDS[i]}–${THRESHOLDS[i+1]!-1}`,current:i===index,passed:i<index}))};
    });
    this.root.innerHTML=this.template({instance:this.instance,count:carriers.length,isGM:this.repository.isGM,search:this.search,
      carriers:carriers.map(record=>({...record,displayPortrait:this.imageOptions.resolvePortrait?.(record.portrait)??record.portrait,selected:record.id===this.selected,pending:this.dirty(this.drafts.get(record.id)),subtitle:record.designation||"Portador Kaiju",initials:record.name.split(/\s+/).slice(0,2).map(part=>part.charAt(0)).join("").toUpperCase()})),
      carrier:carrier?{...carrier,displayPortrait:this.imageOptions.resolvePortrait?.(carrier.portrait)??carrier.portrait,code:carrier.id.slice(0,6).toUpperCase()}:null,
      readout:carrier?renderReadout(carrier.values,this.repository.isGM):"",axes,dirty:this.dirty(),creating:this.creating,activeTab:this.tab,localImages:!!this.imageOptions.localImages,canPickImage:!!this.imageOptions.pickImage,
      overview:this.tab==="overview",stages:this.tab==="stages",notes:this.tab==="notes",edit:this.tab==="edit" && this.repository.isGM,
      tabs:[{id:"overview",label:"Vínculo",icon:"link"},{id:"stages",label:"Estágios",icon:"layer-group"},{id:"notes",label:"Registro",icon:"file-lines"} ,...(this.repository.isGM?[{id:"edit",label:"Controles",icon:"sliders"}]:[])].map(tab=>({...tab,active:tab.id===this.tab}))});
    const signal=this.listeners.signal;
    this.root.addEventListener("error",event=>{if(event.target instanceof HTMLImageElement && event.target.hasAttribute("data-portrait-image")){event.target.hidden=true;event.target.closest(".kaiju-photo")?.classList.add("image-unavailable")}}, {capture:true,signal});
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
    this.renderedView=`${this.selected}:${this.tab}`;
    const newBody=this.root.querySelector(".kaiju-body");if(newBody)newBody.scrollTop=this.scrollPositions.get(this.renderedView)??0;
    const list=this.root.querySelector(".kaiju-carriers");if(list)list.scrollTop=sidebarScroll;
    if(reason==="refresh" && !this.creating && focusKey)this.root.querySelector<HTMLElement>(focusKey)?.focus({preventScroll:true});
    this.motion.indicator(reason==="tab"?oldIndicator:undefined);this.motion.enter(reason,direction);this.motion.observeAmbient();
  }
  private readonly click = (event: MouseEvent): void => {
    if(!(event.target instanceof Element)) return;
    const element=event.target.closest<HTMLElement>("button");if(!element || element.hasAttribute("disabled"))return;
    if(this.busy && (element.dataset.record || ["new","revert","cancel-create"].includes(element.dataset.command??"")))return;
    if(element.dataset.record) {if(this.selected===element.dataset.record)return;this.selected=element.dataset.record;this.render("record");this.root.querySelector<HTMLElement>(`[data-record="${this.selected}"]`)?.focus({preventScroll:true});return}
    const tab=element.dataset.tab;
    if(tab==="overview" || tab==="stages" || tab==="notes" || (tab==="edit" && this.repository.isGM)) {
      const direction=["overview","stages","notes","edit"].indexOf(tab)>["overview","stages","notes","edit"].indexOf(this.tab)?1:-1;
      if(this.tab!==tab){this.tab=tab;this.render("tab",direction)}
      const key=element.dataset.axisFocus;
      if(axisKey(key)) {
        const section=this.root.querySelector<HTMLElement>(tab==="edit"?`[data-axis="${key}"]`:`[data-stage-axis="${key}"]`);
        section?.scrollIntoView({block:"nearest",behavior:"instant"});
        if(tab==="edit")section?.querySelector<HTMLElement>("[data-percent]")?.focus({preventScroll:true});
        else section?.focus({preventScroll:true});
        this.motion.feedback(section);
      }else this.root.querySelector<HTMLElement>(`[role="tab"][data-tab="${tab}"]`)?.focus({preventScroll:true});
      return;
    }
    switch(element.dataset.command) {
      case "new":if(this.repository.isGM){this.creating=true;this.render("dialog")}break;
      case "cancel-create":this.creating=false;this.render();this.focusNew();break;
      case "pick-image":{
        const selected=this.selected;
        if(this.repository.isGM && this.imageOptions.pickImage)this.imageOptions.pickImage(this.current()?.record.portrait??"",path=>{if(!this.destroyed && selected===this.selected)this.setPortrait(path)});
        break;
      }
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
    if(field==="portrait"){try{draft.record.portrait=portraitPath(target.value);target.setCustomValidity("");this.updateStatus()}catch(error){target.setCustomValidity(error instanceof Error?error.message:"Imagem inválida")}}
    if(field==="name" || field==="designation" || field==="notes") {draft.record[field]=target.value;this.updateStatus()}
  };
  private readonly change = (event: Event): void => {
    if(event.target instanceof HTMLSelectElement && event.target.hasAttribute("data-record-select") && !this.busy) {this.selected=event.target.value;this.render("record");this.root.querySelector<HTMLElement>("[data-record-select]")?.focus({preventScroll:true});return}
    if(!this.repository.isGM || this.busy || !(event.target instanceof HTMLInputElement))return;
    const target=event.target,draft=this.current();if(!draft)return;
    if(target.hasAttribute("data-portrait-upload") && this.imageOptions.localImages){
      const file=target.files?.[0];if(!file)return;
      if(!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type) || file.size>2000000){this.error(new Error("Escolha PNG, JPEG, WebP ou GIF de até 2 MB."));return}
      const selected=this.selected,reader=new FileReader();
      reader.onload=()=>{if(!this.destroyed && selected===this.selected && typeof reader.result==="string")this.setPortrait(reader.result)};
      reader.onerror=()=>this.error(new Error("Não foi possível ler a imagem."));reader.readAsDataURL(file);return;
    }
    if(axisKey(target.dataset.percent)) {
      try {this.setAxis(target.dataset.percent,percent(target.value===""?NaN:Number(target.value)))}
      catch(error) {target.value=String(draft.record.values[target.dataset.percent]);target.setCustomValidity("");this.error(error)}
    }
    if(target.dataset.field==="shared") {draft.record.shared=target.checked;this.updateStatus()}
  };
  private setAxis(key: typeof AXIS_KEYS[number],value:number): void {
    const draft=this.current();if(!draft)return;
    const oldStage=stageAt(key,draft.record.values[key]).index;
    draft.record.values[key]=percent(value);
    const axis=this.root.querySelector<HTMLElement>(`[data-axis="${key}"]`),stage=stageAt(key,value);
    if(axis) {
      axis.style.cssText=paletteStyle(key,value);
      const slider=axis.querySelector<HTMLInputElement>("[data-range]")!;
      slider.value=String(value);slider.style.setProperty("--fill",`${value}%`);
      const numeric=axis.querySelector<HTMLInputElement>("[data-percent]")!;
      numeric.value=String(value);numeric.setCustomValidity("");
      const icon=axis.querySelector<HTMLElement>("[data-stage-icon]")!;
      const nextClass=`fa-solid fa-${stage.icon}`;
      if(icon.className!==nextClass) {const replacement=icon.cloneNode() as HTMLElement;replacement.className=nextClass;icon.replaceWith(replacement)}
      axis.querySelector<HTMLElement>("[data-stage-roman]")!.textContent=stage.roman;
      axis.querySelector<HTMLElement>("[data-stage-label]")!.textContent=stage.label;
      if(stage.index!==oldStage)this.motion.feedback(axis.querySelector(".kaiju-stage-icon"));
      axis.querySelectorAll<HTMLElement>("[data-marker]").forEach(marker=>marker.classList.toggle("is-current",Number(marker.dataset.marker)===stage.index));
    }
    const readout=this.root.querySelector<HTMLElement>("[data-readout]");
    if(readout){this.motion.clearAmbient();readout.innerHTML=renderReadout(draft.record.values,this.repository.isGM);this.motion.observeAmbient()}
    this.updateStatus();
  }
  private setPortrait(path:string):void {
    if(!this.repository.isGM || this.busy)return;
    try {const draft=this.current();if(!draft)return;draft.record.portrait=portraitPath(path);this.render();this.updateStatus("Retrato alterado — salve o vínculo")}catch(error){this.error(error)}
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
    this.root.querySelectorAll<HTMLElement>("[data-record]").forEach(button=>{
      const pending=this.dirty(this.drafts.get(button.dataset.record??""));button.classList.toggle("has-draft",pending);
      const marker=button.querySelector<HTMLElement>(".kaiju-draft-marker");if(marker)marker.hidden=!pending;
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-command="save"],[data-command="revert"]').forEach(button=>{button.disabled=this.busy||!dirty});
    this.root.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('[data-record],[data-record-select],[data-command="new"]').forEach(control=>{control.disabled=this.busy});
    this.root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-range],[data-percent],[data-field]").forEach(input=>{input.disabled=this.busy||!this.repository.isGM});
  }
  private error(error:unknown): void {
    const status=this.root.querySelector<HTMLElement>("[data-status]");
    if(status){status.textContent=error instanceof Error?error.message:"Não foi possível completar a operação.";status.classList.add("is-error");this.motion.feedback(status)}
  }
  private async save(): Promise<void> {
    const draft=this.current();if(!draft || this.busy || !this.repository.isGM || !this.dirty())return;
    const invalid=[...this.root.querySelectorAll<HTMLInputElement>("[data-percent],[data-field=portrait]")].find(input=>!input.checkValidity());
    if(invalid){invalid.reportValidity();this.error(new Error(invalid.dataset.field==="portrait"?"Corrija o caminho da imagem antes de salvar.":"Corrija o valor do eixo antes de salvar."));return}
    this.busy=true;this.updateStatus();
    try {
      const record=await this.repository.save(draft.base.id,diffCarrier(draft.base,draft.record),draft.base);
      this.drafts.set(record.id,{base:structuredClone(record),record:structuredClone(record)});
      this.busy=false;if(!this.destroyed){this.render();this.updateStatus("Vínculo salvo");this.motion.feedback(this.root.querySelector("[data-status]"))}
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
      if(!this.destroyed){this.refresh();this.motion.enter("record");this.root.querySelector<HTMLElement>(".kaiju-body")?.focus({preventScroll:true})}
    }).catch((error:unknown)=>{
      this.busy=false;form.querySelectorAll<HTMLButtonElement>("button").forEach(button=>{button.disabled=false});
      const alert=form.querySelector<HTMLElement>("[data-create-error]");if(alert)alert.textContent=error instanceof Error?error.message:"Não foi possível criar o portador.";
    });
  };
  private readonly keydown = (event: KeyboardEvent): void => {
    if(this.creating) {
      const form=this.root.querySelector<HTMLFormElement>(".kaiju-create-form");if(!form)return;
      if(event.key==="Escape" && !this.busy){event.preventDefault();event.stopPropagation();this.creating=false;this.render();this.focusNew()}
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
