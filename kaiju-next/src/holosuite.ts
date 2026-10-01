import {MODULE_ID} from "./domain.ts";

/** Matches HoloSuite Core's public registerApp contract; no hard dependency. */
export interface HoloSuiteApp {
  id:string;title:string;icon:string;description:string;premium:boolean;
  playerVisible:boolean;open:()=>unknown;
}
interface HoloSuiteAPI {registerApp:(app:HoloSuiteApp)=>unknown}
export function createHoloSuiteRegistration(open:()=>unknown):(api:unknown)=>boolean {
  const registered=new WeakSet<object>();
  const app:HoloSuiteApp={id:MODULE_ID,title:"Kaiju",icon:"kaiju-app-glyph",
    description:"Portadores, valores e estágios do vínculo Kaiju.",
    premium:false,playerVisible:true,open};
  return (api:unknown):boolean=>{
    if(!api || typeof api!=="object" || typeof (api as Partial<HoloSuiteAPI>).registerApp!=="function")return false;
    if(registered.has(api))return true;
    const result=(api as HoloSuiteAPI).registerApp(app);
    if(result===null || result===false)return false;
    registered.add(api);return true;
  };
}
