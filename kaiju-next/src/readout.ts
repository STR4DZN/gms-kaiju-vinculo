import {paletteStyle} from "./palette.ts";
import {stageEmblem} from "./stage-icons.ts";
import {AXES, AXIS_KEYS, ROMAN, THRESHOLDS, stageAt, type Values} from "./domain.ts";
const escapeHTML=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));
/** One instrument per independent axis; glyph geometry is the licensed source icon. */
export function renderReadout(values:Values,_isGM=false):string {
  const cards=AXIS_KEYS.map((key,index)=>{
    const axis=AXES[key],value=values[key],stage=stageAt(key,value);
    const rail=axis.stages.map((entry,i)=>`<button type="button" class="kaiju-stage-step ${i===stage.index?"is-current":i<stage.index?"is-passed":""}" data-tab="stages" data-axis-focus="${key}" ${i===stage.index?'aria-current="step"':''} aria-label="${axis.title}: ${ROMAN[i]}, ${escapeHTML(entry.label)}, ${THRESHOLDS[i]}%" title="${THRESHOLDS[i]}% — ${escapeHTML(entry.label)}" style="--icon-delay:${-(index*1.1+i*.53)}s">${stageEmblem(key,i,true)}<small>${ROMAN[i]}</small></button>`).join("");
    return `<article class="kaiju-channel" data-kaiju-meter="${key}" data-kaiju-stage="${stage.index}" style="${paletteStyle(key,value)};--icon-delay:${-index*1.3}s">
      <div class="kaiju-icon-instrument">${stageEmblem(key,stage.index)}</div>
      <div class="kaiju-channel-heading"><h2>${axis.title}</h2><p>${axis.description}</p></div><div class="kaiju-channel-value"><strong data-kaiju-percent>${value}</strong><span>%</span></div>
      <div class="kaiju-channel-progress" role="meter" aria-label="${axis.title}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><span data-meter-fill="${key}" style="width:${value}%;transform:scaleX(1)"><span class="kaiju-meter-reveal" aria-hidden="true"></span></span></div>
      <div class="kaiju-stage-current"><span>ESTÁGIO <b>${stage.roman}</b></span><strong>${escapeHTML(stage.label)}</strong></div>
      <div class="kaiju-channel-rail" aria-label="Progressão dos seis estágios de ${axis.title}">${rail}</div>
    </article>`;
  }).join("");
  return `<section class="kaiju-vinculo-card" aria-label="Leitura dos três eixos"><div class="kaiju-channels">${cards}</div><div class="kaiju-readout-foot"><span>TRÊS EIXOS INDEPENDENTES</span><span>SEIS ESTÁGIOS DE EVOLUÇÃO</span></div></section>`;
}
