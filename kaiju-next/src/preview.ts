import demoPortrait from "../assets/mika-pilot.png";
import Handlebars from "handlebars";
import templateSource from "../templates/panel.hbs?raw";
import "@fortawesome/fontawesome-free/css/fontawesome.min.css";
import "@fortawesome/fontawesome-free/css/solid.min.css";
import "../styles/kaiju.css";
import "../styles/preview.css";
import {KaijuPanel} from "./panel.ts";
import {LocalRepository} from "./local-repository.ts";

const root=document.querySelector<HTMLElement>("#app")!;
const template=Handlebars.compile(templateSource);
let motionMode:"auto"|"calm"|"off"="auto";
let panel=new KaijuPanel(root,new LocalRepository(true),template,{localImages:true,resolvePortrait:path=>path==="demo/mika.png"?demoPortrait:path});
document.querySelector<HTMLSelectElement>("#preview-role")!.addEventListener("change",event=>{
  panel.destroy();panel=new KaijuPanel(root,new LocalRepository((event.target as HTMLSelectElement).value==="gm"),template,{localImages:true,resolvePortrait:path=>path==="demo/mika.png"?demoPortrait:path});panel.setMotion(motionMode);
});
window.addEventListener("pagehide",()=>panel.destroy());
document.querySelector<HTMLSelectElement>("#preview-size")!.addEventListener("change",event=>{
  document.querySelector<HTMLElement>(".preview-shell")!.dataset.size=(event.target as HTMLSelectElement).value;
});

document.querySelector<HTMLSelectElement>("#preview-motion")!.addEventListener("change",event=>{
  const value=(event.target as HTMLSelectElement).value;motionMode=value==="off"?"off":value==="calm"?"calm":"auto";panel.setMotion(motionMode);
});
document.querySelector<HTMLButtonElement>("#preview-reset")!.addEventListener("click",()=>{
  panel.destroy();LocalRepository.reset();
  const gm=document.querySelector<HTMLSelectElement>("#preview-role")!.value==="gm";
  panel=new KaijuPanel(root,new LocalRepository(gm),template,{localImages:true,resolvePortrait:path=>path==="demo/mika.png"?demoPortrait:path});panel.setMotion(motionMode);
});
