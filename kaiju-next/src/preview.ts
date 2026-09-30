import Handlebars from "handlebars";
import templateSource from "../templates/panel.hbs?raw";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../styles/kaiju.css";
import "../styles/preview.css";
import {KaijuPanel} from "./panel.ts";
import {LocalRepository} from "./local-repository.ts";

const root=document.querySelector<HTMLElement>("#app")!;
const template=Handlebars.compile(templateSource);
let panel=new KaijuPanel(root,new LocalRepository(true),template);
document.querySelector<HTMLSelectElement>("#preview-role")!.addEventListener("change",event=>{
  panel.destroy();panel=new KaijuPanel(root,new LocalRepository((event.target as HTMLSelectElement).value==="gm"),template);
});
window.addEventListener("pagehide",()=>panel.destroy());
document.querySelector<HTMLSelectElement>("#preview-size")!.addEventListener("change",event=>{
  document.querySelector<HTMLElement>(".preview-shell")!.dataset.size=(event.target as HTMLSelectElement).value;
});
