import test from "node:test";
import assert from "node:assert/strict";
import {AXIS_KEYS} from "../src/domain.ts";
import {axisPalette} from "../src/palette.ts";
import {renderReadout} from "../src/readout.ts";
function hue(hex:string):number {
 const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255) as [number,number,number];
 const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
 if(!d)return 0;
 const h=max===r?(g-b)/d:max===g?(b-r)/d+2:(r-g)/d+4;
 return (h*60+360)%360;
}
const distance=(a:number,b:number)=>Math.min(Math.abs(a-b),360-Math.abs(a-b));
test("o próprio degradê evolui continuamente sem trocar a família cromática",()=>{
 for(const key of AXIS_KEYS){
  const initial=axisPalette(key,0);let previous=initial;
  const gradients=new Set<string>();
  for(let value=0;value<=100;value++){
   const p=axisPalette(key,value);gradients.add(p.gradient);
   assert.ok(distance(hue(p.color),hue(initial.color))<=22,`${key}: identidade preservada`);
   for(const c of [p.deep,p.mid,p.bright])assert.ok(distance(hue(c),hue(p.color))<=30,`${key}: tons análogos`);
   assert.ok(distance(hue(p.color),hue(previous.color))<1,`${key}: transição contínua`);
   previous=p;
  }
  assert.equal(gradients.size,101);
  assert.notEqual(initial.surface,previous.surface);
  assert.notEqual(initial.bright,previous.bright);
 }
});
test("o preenchimento conserva os valores e inclui seu degradê dinâmico em 0/25/100",()=>{
 const html=renderReadout({vontade:25,comunhao:0,humanidade:100});
 for(const v of [25,0,100])assert.ok(html.includes(`width:${v}%;transform:scaleX(1)`));
 assert.ok(html.includes('--axis-gradient:'+axisPalette('vontade',25).gradient));
 assert.ok(html.includes('aria-valuenow="100"'));
});
