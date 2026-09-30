import templateSource from "../templates/panel.hbs?raw";
import {MODULE_ID} from "./domain.ts";
import {FoundryRepository} from "./foundry-repository.ts";
import {KaijuPanel} from "./panel.ts";
import {createHoloSuiteRegistration} from "./holosuite.ts";

const {ApplicationV2}=foundry.applications.api;
export class KaijuApplication extends ApplicationV2 {
  static override DEFAULT_OPTIONS={
    id:"kaiju-vinculo-panel",classes:["kaiju-window"],
    window:{title:"Kaiju // Vínculo",icon:"fa-solid fa-dragon",resizable:true},
    position:{width:1120,height:780}
  };
  private panel:KaijuPanel|undefined;
  protected override async _renderHTML():Promise<string> {return '<div class="kaiju-mount" style="height:100%;min-height:0"></div>'}
  protected override _replaceHTML(result:string,content:HTMLElement):void {this.panel?.destroy();this.panel=undefined;content.innerHTML=result}
  protected override async _onRender():Promise<void> {
    this.panel?.destroy();
    const root=this.element.querySelector<HTMLElement>(".kaiju-mount");
    if(root)this.panel=new KaijuPanel(root,new FoundryRepository(),Handlebars.compile(templateSource));
  }
  protected override _onClose():void {this.panel?.destroy();this.panel=undefined}
}
let app:KaijuApplication|undefined;
export function openKaiju():KaijuApplication {
  app??=new KaijuApplication();
  if(app.rendered)app.bringToFront();
  else void app.render({force:true,position:{width:Math.min(1120,window.innerWidth-24),height:Math.min(780,window.innerHeight-24)}});
  return app;
}
const registerHoloSuite=createHoloSuiteRegistration(openKaiju);
function connectHoloSuite(api?:unknown):void {
  const core=game.modules?.get("holosuite-core");
  if(!core?.active)return;
  try {registerHoloSuite(api??core.api??(game as unknown as {holosuite?:unknown}).holosuite)}
  catch(error){console.warn("Kaiju | Não foi possível registrar o aplicativo no HoloSuite.",error)}
}
// Core exposes its API at init and ready. Listening now removes load-order dependence.
const integrationHooks=Hooks as unknown as {on:(hook:"holosuite-core.apiReady",callback:(api:unknown)=>void)=>number};
integrationHooks.on("holosuite-core.apiReady",api=>connectHoloSuite(api));
Hooks.once("init",()=>{
  game.settings?.registerMenu(MODULE_ID,"open",{name:"Matriz de vínculos",label:"Abrir Módulo Kaiju",hint:"Portadores, valores e estágios do vínculo Kaiju.",icon:"fa-solid fa-dragon",type:KaijuApplication,restricted:false});
  game.keybindings?.register(MODULE_ID,"open",{name:"Abrir Módulo Kaiju",editable:[],onDown:()=>{openKaiju();return true},restricted:false});
});
Hooks.once("ready",()=>{
  const module=game.modules?.get(MODULE_ID);
  if(module)module.api=Object.freeze({open:openKaiju,version:"0.1.0"});
  connectHoloSuite();
});
Hooks.on("renderActorDirectory",(_app,html)=>{
  const root=html instanceof HTMLElement?html:html[0];
  if(!(root instanceof HTMLElement)||root.querySelector(".kaiju-directory-button"))return;
  const host=root.querySelector(".header-actions")??root.querySelector(".directory-header");if(!host)return;
  const button=document.createElement("button");button.className="kaiju-directory-button";button.type="button";
  button.innerHTML='<i class="fa-solid fa-dragon" aria-hidden="true"></i> Kaiju';button.addEventListener("click",()=>openKaiju());host.append(button);
});
