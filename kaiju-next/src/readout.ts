import {paletteStyle} from "./palette.ts";
import {AXES, AXIS_KEYS, ROMAN, THRESHOLDS, stageAt, type Values, type AxisKey} from "./domain.ts";
const visual:Record<AxisKey,{shape:string;outline:string}>={
  vontade:{shape:"polygon(50% 0%,90% 20%,100% 68%,50% 100%,0% 68%,10% 20%)",outline:"M32 2 56 14 62 44 32 62 2 44 8 14Z"},
  comunhao:{shape:"circle(50% at 50% 50%)",outline:"M32 2A30 30 0 1 1 31.9 2 M32 9A23 23 0 1 0 32.1 9"},
  humanidade:{shape:"polygon(50% 0%,94% 15%,88% 68%,50% 100%,12% 68%,6% 15%)",outline:"M32 2 58 12 54 43 32 62 10 43 6 12Z M20 25 29 34 44 20"}
};
const taxonomy:Record<AxisKey,string>={vontade:"Pressão predatória",comunhao:"Ressonância simbiótica",humanidade:"Integridade identitária"};
const escapeHTML=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));
function reading({vontade,comunhao,humanidade}:Values):string {
  if(vontade===0 && comunhao===0 && humanidade===0)return "O vínculo ainda permanece silencioso.";
  if(comunhao>=80 && Math.abs(vontade-humanidade)<=20)return "As duas vontades se reconhecem e agem em um equilíbrio quase perfeito.";
  if(vontade>=80 && humanidade>=80)return "Fera e humanidade recusam ceder; o vínculo está sob tensão extrema.";
  if(comunhao>=vontade && comunhao>=humanidade)return "A sincronia estabiliza a fronteira entre a fera e a identidade humana.";
  if(vontade>humanidade)return "A vontade do Kaiju avança sobre a identidade humana.";
  if(humanidade>vontade)return "A identidade humana resiste ao avanço da fera.";
  return "Nenhuma vontade domina; o vínculo permanece instável.";
}
/** Decorative loops are CSS transforms and opacity, paused by the panel visibility observer. */
export function renderReadout(values:Values,isGM=false):string {
  const cards=AXIS_KEYS.map((key,index)=>{
    const axis=AXES[key],value=values[key],stage=stageAt(key,value),v=visual[key];
    const rail=axis.stages.map((entry,i)=>`<span class="${i===stage.index?"is-current":i<stage.index?"is-passed":""}" ${i===stage.index?'aria-current="step"':''} title="${THRESHOLDS[i]}% — ${escapeHTML(entry.label)}"><i class="fa-solid fa-${entry.icon}" aria-hidden="true"></i><small>${ROMAN[i]}</small></span>`).join("");
    const signature=key==="vontade"?"M0 16H36L43 7 49 25 57 10 65 16H115L122 11 130 21 137 16H210L217 8 224 24 233 16H320":key==="comunhao"?"M0 16Q20 3 40 16T80 16T120 16T160 16T200 16T240 16T280 16T320 16":"M0 16H32V8H48V24H64V16H112V8H128V24H144V16H192V8H208V24H224V16H272V8H288V24H304V16H320";
    return `<article class="kaiju-channel" data-kaiju-meter="${key}" data-kaiju-stage="${stage.index}" style="${paletteStyle(key,value)};--icon-shape:${v.shape};--ambient-period:${key==="vontade"?5.8:key==="comunhao"?8.5:11}s">
      <div class="kaiju-channel-top"><span class="kaiju-channel-code">CANAL 0${index+1} <span>/</span> ${taxonomy[key]}</span><span class="kaiju-channel-signature" aria-hidden="true"><span class="kaiju-signal-strip"><svg viewBox="0 0 320 32"><path d="${signature}"/></svg><svg viewBox="0 0 320 32"><path d="${signature}"/></svg></span></span></div>
      <div class="kaiju-channel-heading"><span class="kaiju-icon-instrument"><svg class="kaiju-icon-aura" viewBox="0 0 64 64" aria-hidden="true"><path d="${v.outline}"/></svg><span class="kaiju-channel-icon"><span class="kaiju-icon-core"><i class="fa-solid fa-${stage.icon}" aria-hidden="true"></i></span></span></span><div><h2>${axis.title}</h2><p>${axis.description}</p></div><div class="kaiju-channel-value"><strong data-kaiju-percent>${value}</strong><span>%</span></div></div>
      <div class="kaiju-channel-progress" role="meter" aria-label="${axis.title}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><span data-meter-fill="${key}" style="width:${value}%;transform:scaleX(1)"><span class="kaiju-meter-reveal" aria-hidden="true"></span></span><span class="kaiju-meter-route" style="width:calc(${value}% - ${value/100*4}px)" aria-hidden="true"><i class="kaiju-meter-current"></i></span><div aria-hidden="true"><b></b><b></b><b></b><b></b></div></div>
      <div class="kaiju-channel-caption"><span>ESTÁGIO <b>${stage.roman}</b> <span class="kaiju-channel-divider">/ 6</span></span><strong><span class="kaiju-stage-beacon" aria-hidden="true"></span>${stage.label}</strong></div>
      <div class="kaiju-channel-bottom"><div class="kaiju-channel-rail" aria-label="Progressão dos seis estágios">${rail}</div><div class="kaiju-channel-actions"><button type="button" data-tab="stages" data-axis-focus="${key}" aria-label="Ver estágios de ${axis.title}">Estágios <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>${isGM?`<button type="button" data-tab="edit" data-axis-focus="${key}" aria-label="Ajustar ${axis.title}">Ajustar <i class="fa-solid fa-sliders" aria-hidden="true"></i></button>`:""}</div></div>
    </article>`;
  }).join("");
  return `<section class="kaiju-vinculo-card" aria-label="Leitura dos três eixos"><div class="kaiju-channels">${cards}</div><aside class="kaiju-diagnosis"><span><i class="fa-solid fa-microscope" aria-hidden="true"></i> LEITURA DO VÍNCULO</span><p>${reading(values)}</p></aside></section>`;
}
