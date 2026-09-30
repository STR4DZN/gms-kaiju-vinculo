import {applyPatch,createCarrier,randomId,validateCarrier,type Carrier,type CarrierPatch,type Repository} from "./domain.ts";
const KEY="kaiju-preview-v1-schema1";
const EVENT="kaiju-preview-updated";
export class LocalRepository implements Repository {
  constructor(readonly isGM:boolean) {
    if(!localStorage.getItem(KEY)) {
      const samples=[
        {...createCarrier("k03-mika","Mika Shiro"),designation:"Piloto / Unidade 03",shared:true,values:{vontade:48,comunhao:62,humanidade:75},notes:"Primeiro contato registrado. Os três eixos podem ser ajustados independentemente."},
        {...createCarrier("k03-ren","Ren Akagi"),designation:"Piloto / Unidade 07"},
        {...createCarrier("k03-aoi","Aoi Kuroda"),designation:"Piloto / Unidade 11",shared:true,values:{vontade:100,comunhao:100,humanidade:100}}
      ];
      localStorage.setItem(KEY,JSON.stringify(samples));
    }
  }
  private all():Carrier[] {
    const parsed:unknown=JSON.parse(localStorage.getItem(KEY)??"[]");
    if(!Array.isArray(parsed))throw new Error("Os dados da prévia estão em formato inválido.");
    return parsed.map(validateCarrier);
  }
  list():Carrier[] {return this.all().filter(carrier=>this.isGM||carrier.shared)}
  async create(name:string):Promise<Carrier> {
    this.requireGM();const records=this.all(),carrier=createCarrier(randomId(),name);
    localStorage.setItem(KEY,JSON.stringify([...records,carrier]));window.dispatchEvent(new Event(EVENT));return carrier;
  }
  async save(id:string,patch:CarrierPatch,baseline:Carrier):Promise<Carrier> {
    this.requireGM();const records=this.all(),index=records.findIndex(carrier=>carrier.id===id);
    if(index<0)throw new Error("Portador não encontrado.");
    const next=applyPatch(records[index]!,patch,baseline);records[index]=next;
    localStorage.setItem(KEY,JSON.stringify(records));window.dispatchEvent(new Event(EVENT));return next;
  }
  subscribe(listener:()=>void):()=>void {
    const abort=new AbortController();window.addEventListener(EVENT,listener,{signal:abort.signal});
    window.addEventListener("storage",event=>{if(event.key===KEY)listener()},{signal:abort.signal});
    return ()=>abort.abort();
  }
  private requireGM():void {if(!this.isGM)throw new Error("A perspectiva do jogador permite apenas consulta.")}
}
