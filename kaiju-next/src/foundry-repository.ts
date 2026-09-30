import {MODULE_ID,AXIS_KEYS,applyPatch,createCarrier,validateCarrier,type Carrier,type CarrierPatch,type Repository} from "./domain.ts";

/** One native Document per carrier: no world-wide JSON setting or custom socket. */
export class FoundryRepository implements Repository {
  get isGM(): boolean {return game.user?.isGM??false}
  list(): Carrier[] {
    const records: Carrier[]=[];
    for(const journal of game.journal??[]) {
      if(!game.user || !journal.testUserPermission(game.user,"OBSERVER"))continue;
      const flag=journal.getFlag(MODULE_ID,"carrier");if(!flag)continue;
      try {
        const record=validateCarrier({...flag as object,id:journal.id,name:journal.name});
        record.shared=(journal.ownership.default??0)>=CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
        records.push(record);
      } catch(error) {console.warn("Kaiju | Registro incompatível",journal.id,error)}
    }
    return records.sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
  }
  async create(name:string): Promise<Carrier> {
    this.requireGM();
    const id=foundry.utils.randomID(),record=createCarrier(id,name);
    const journal=await JournalEntry.create({_id:id,name:record.name,ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},flags:{[MODULE_ID]:{carrier:record}}},{keepId:true});
    if(!journal)throw new Error("O Foundry não criou o registro.");
    return {...record,id:journal.id};
  }
  async save(id:string,patch:CarrierPatch,baseline:Carrier): Promise<Carrier> {
    this.requireGM();
    const journal=game.journal?.get(id);
    if(!journal || !game.user || !journal.canUserModify(game.user,"update"))throw new Error("Sem permissão para alterar este vínculo.");
    const current=this.list().find(carrier=>carrier.id===id);if(!current)throw new Error("O registro não está mais disponível.");
    const next=applyPatch(current,patch,baseline);
    const updates: Record<string,unknown>={[`flags.${MODULE_ID}.carrier.updatedAt`]:next.updatedAt};
    for(const key of AXIS_KEYS)if(patch.values?.[key]!==undefined)updates[`flags.${MODULE_ID}.carrier.values.${key}`]=next.values[key];
    for(const key of ["name","designation","notes","shared"] as const)if(patch[key]!==undefined)updates[`flags.${MODULE_ID}.carrier.${key}`]=next[key];
    if(patch.name!==undefined)updates.name=next.name;
    if(patch.shared!==undefined)updates["ownership.default"]=next.shared?CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;
    await journal.update(updates);return this.list().find(carrier=>carrier.id===id)??next;
  }
  subscribe(listener:()=>void):()=>void {
    const hooks=["createJournalEntry","updateJournalEntry","deleteJournalEntry"] as const;
    const ids=hooks.map(hook=>Hooks.on(hook,()=>listener()));
    return ()=>hooks.forEach((hook,i)=>Hooks.off(hook,ids[i]!));
  }
  private requireGM(): void {if(!this.isGM)throw new Error("Somente o mestre pode editar os vínculos nesta versão.")}
}
