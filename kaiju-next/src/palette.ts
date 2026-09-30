import {percent, type AxisKey} from "./domain.ts";

// Curated analogous anchors: percentage changes the gradient itself, not only its width.
const families:Record<AxisKey,{low:string[];high:string[]}>= {
  vontade:{low:["#651c25","#b9333c","#e95750","#ff9279"],high:["#9d2920","#ef583b","#ff8656","#ffd09a"]},
  comunhao:{low:["#0e3b48","#147e88","#29baa8","#85dcc9"],high:["#10534f","#16af9f","#45e0bb","#c2ffe0"]},
  humanidade:{low:["#1c304e","#315f98","#6399d5","#9dc6ef"],high:["#204887","#328ce0","#78caff","#d8f5ff"]}
};
function mix(a:string,b:string,t:number):string {
  return "#"+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,"0")).join("");
}
export function axisPalette(key:AxisKey,value:number) {
  const t=percent(value)/100,{low,high}=families[key];
  const [deep,mid,color,bright]=low.map((c,i)=>mix(c,high[i]!,t)) as [string,string,string,string];
  const stop=+(68-30*t).toFixed(2),crest=+(91-17*t).toFixed(2);
  const gradient=`linear-gradient(105deg,${deep} 0%,${mid} ${+(stop*.48).toFixed(2)}%,${color} ${stop}%,${bright} ${crest}%,${color} 100%)`;
  const alpha=Math.round(65+45*t).toString(16).padStart(2,"0");
  return {deep,mid,color,bright,gradient,wash:`${color}${alpha}`,surface:`linear-gradient(112deg,${deep}b8 0%,${mid}${alpha} ${+(20+35*t).toFixed(2)}%,${color}1c 78%,#07121d 100%)`};
}
export function paletteStyle(key:AxisKey,value:number):string {
  const p=axisPalette(key,value);
  return `--axis-color:${p.color};--axis-bright:${p.bright};--axis-deep:${p.deep};--axis-mid:${p.mid};--axis-gradient:${p.gradient};--channel-gradient:${p.surface};--channel-wash:${p.wash}`;
}
