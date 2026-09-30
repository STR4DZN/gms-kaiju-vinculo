import {renderReadout} from "../src/readout.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import Handlebars from "handlebars";
import {AXES,AXIS_KEYS,applyPatch,createCarrier,diffCarrier,percent,stageAt,validateCarrier} from "../src/domain.ts";

test("todos os limiares preservam as faixas do original, especialmente 99 e 100",()=>{
  for(const key of AXIS_KEYS)for(const [value,index] of [[0,0],[19,0],[20,1],[39,1],[40,2],[59,2],[60,3],[79,3],[80,4],[99,4],[100,5]])assert.equal(stageAt(key!,value!).index,index);
});
test("dados inválidos são recusados em tempo de execução",()=>{
  for(const invalid of [-1,101,.5,NaN,Infinity,null,"40",undefined])assert.throws(()=>percent(invalid));
  const carrier=createCarrier("test","Mika");
  for(const mutation of [{schemaVersion:999},{seed:-1},{name:" "},{shared:"all"},{updatedAt:"bad"},{values:{...carrier.values,comunhao:101}}])assert.throws(()=>validateCarrier({...carrier,...mutation}));
});
test("a semente e os outros eixos persistem ao editar um eixo",()=>{
  const base=createCarrier("test","Mika"),draft=structuredClone(base);draft.values.vontade=60;
  const next=applyPatch(base,diffCarrier(base,draft),base);
  assert.deepEqual(next.values,{vontade:60,comunhao:0,humanidade:0});assert.equal(next.seed,base.seed);assert.equal(next.id,base.id);
});
test("edições em campos diferentes são mescladas sem sobrescrever o registro inteiro",()=>{
  const base=createCarrier("test","Mika"),remote=applyPatch(base,{values:{comunhao:80},notes:"Mudança remota"},base);
  const merged=applyPatch(remote,{values:{vontade:20}},base);
  assert.equal(merged.values.comunhao,80);assert.equal(merged.values.vontade,20);assert.equal(merged.notes,"Mudança remota");
});
test("uma alteração remota no mesmo campo provoca conflito",()=>{
  const base=createCarrier("test","Mika"),remote=applyPatch(base,{values:{vontade:80}},base);
  assert.throws(()=>applyPatch(remote,{values:{vontade:20}},base),/mudou em outra janela/);
  const renamed=applyPatch(base,{name:"Ren"},base);assert.throws(()=>applyPatch(renamed,{name:"Aoi"},base));
});
test("nome e anotações não são interpolados como HTML ativo",()=>{
  const template=Handlebars.compile(readFileSync(new URL("../templates/panel.hbs",import.meta.url),"utf8"));
  const attack='<img src=x onerror="alert(1)">';
  const markup=template({carrier:{name:attack,notes:attack},notes:true,instance:"test",tabs:[]});
  assert.equal(markup.includes("<img"),false);assert.ok(markup.includes("&lt;img"));
});
test("jogador recebe valores e texto, sem nenhum controle de edição ou criação",()=>{
  const template=Handlebars.compile(readFileSync(new URL("../templates/panel.hbs",import.meta.url),"utf8"));
  const carrier=createCarrier("test","Mika");
  const axes=AXIS_KEYS.map(key=>({...AXES[key],key,value:48,stage:stageAt(key,48),markers:[]}));
  const context={carrier,axes,readout:renderReadout(carrier.values),overview:true,instance:"test",tabs:[],creating:true};
  const player=template({...context,isGM:false});
  assert.equal(player.includes("<canvas"),false);assert.equal(player.includes('data-command="pause"'),false);
  for(const forbidden of ['data-percent=','data-range=','data-field=','data-command="save"','data-command="revert"','data-command="new"','kaiju-create-form'])assert.equal(player.includes(forbidden),false,forbidden);
  assert.equal((player.match(/role="meter"/g)??[]).length,3);
  assert.equal((player.match(/data-kaiju-percent/g)??[]).length,3);
  const notes=template({...context,isGM:false,overview:false,notes:true});
  assert.equal(notes.includes('<textarea'),false);assert.equal(notes.includes('data-field='),false);
  assert.ok(notes.includes('kaiju-record-details'));
  const gm=template({...context,isGM:true,creating:false,edit:true});
  for(const allowed of ['data-percent=','data-range=','data-command="save"','data-command="new"'])assert.ok(gm.includes(allowed),allowed);
});
test("cada estágio usa um ícone existente do Font Awesome Free",()=>{
  for(const axis of Object.values(AXES))for(const stage of axis.stages)assert.ok(existsSync(new URL(`../node_modules/@fortawesome/fontawesome-free/svgs/solid/${stage.icon}.svg`,import.meta.url)),stage.icon);
});
