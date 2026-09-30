import test from "node:test";
import assert from "node:assert/strict";
import {FoundryRepository} from "../src/foundry-repository.ts";
import {createCarrier,type Carrier} from "../src/domain.ts";

test("adaptador Foundry: consulta, permissão e atualização apenas dos campos editados",async()=>{
  const user={isGM:true};
  class JournalMock {
    id:string;name:string;ownership={default:0};flags:{"kaiju-vinculo":{carrier:Carrier}};lastUpdate:Record<string,unknown>={};
    constructor(carrier:Carrier){this.id=carrier.id;this.name=carrier.name;this.flags={"kaiju-vinculo":{carrier:structuredClone(carrier)}};this.ownership.default=carrier.shared?2:0}
    testUserPermission(){return user.isGM||this.ownership.default>=2}
    canUserModify(){return user.isGM}
    getFlag(){return this.flags["kaiju-vinculo"].carrier}
    async update(changes:Record<string,unknown>){
      this.lastUpdate=changes;
      for(const [path,value]of Object.entries(changes)){
        const parts=path.split(".");let target=this as unknown as Record<string,unknown>;
        for(const part of parts.slice(0,-1))target=target[part] as Record<string,unknown>;
        target[parts.at(-1)!]=value;
      }
      return this;
    }
  }
  const privateRecord=new JournalMock(createCarrier("private","Ren"));
  const publicRecord=new JournalMock({...createCarrier("public","Mika"),shared:true});
  const docs=[privateRecord,publicRecord];
  Object.assign(globalThis,{
    game:{user,journal:{[Symbol.iterator]:()=>docs[Symbol.iterator](),get:(id:string)=>docs.find(doc=>doc.id===id)}},
    CONST:{DOCUMENT_OWNERSHIP_LEVELS:{NONE:0,OBSERVER:2}},
    foundry:{utils:{randomID:()=>"created"}},
    JournalEntry:{create:async(source:{flags:{"kaiju-vinculo":{carrier:Carrier}}})=>{const doc=new JournalMock(source.flags["kaiju-vinculo"].carrier);docs.push(doc);return doc}},
    Hooks:{on:()=>1,off:()=>{}}
  });
  const repo=new FoundryRepository();assert.equal(repo.list().length,2);
  const baseline=repo.list().find(c=>c.id==="public")!;
  const saved=await repo.save("public",{values:{vontade:40}},baseline);
  assert.equal(saved.values.vontade,40);
  assert.deepEqual(Object.keys(publicRecord.lastUpdate).sort(),["flags.kaiju-vinculo.carrier.updatedAt","flags.kaiju-vinculo.carrier.values.vontade"]);
  const withPortrait=await repo.save("public",{portrait:"worlds/mesa/mika.webp"},saved);
  assert.equal(withPortrait.portrait,"worlds/mesa/mika.webp");
  assert.deepEqual(Object.keys(publicRecord.lastUpdate).sort(),["flags.kaiju-vinculo.carrier.portrait","flags.kaiju-vinculo.carrier.updatedAt"]);
  await repo.save("public",{shared:false},withPortrait);assert.equal(publicRecord.ownership.default,0);
  const created=await repo.create("Aoi");assert.equal(created.shared,false);assert.equal(created.id,"created");
  publicRecord.ownership.default=2;
  user.isGM=false;
  assert.deepEqual(repo.list().map(c=>c.id),["public"]);
  await assert.rejects(()=>repo.save("public",{values:{vontade:100}},baseline),/Somente o mestre/);
  await assert.rejects(()=>repo.create("Proibido"),/Somente o mestre/);
});
