import {percent,type AxisKey} from './domain.ts';
/** Saturation is retained through every stage. High stages never fade towards white. */
const families:Record<AxisKey,{deep:string;mid:string;color:string;bright:string}>= {
 vontade:{deep:'#a70e32',mid:'#ed174b',color:'#ff3554',bright:'#ff6339'},
 comunhao:{deep:'#007d83',mid:'#00bbb3',color:'#00ded0',bright:'#24f4b7'},
 humanidade:{deep:'#3034ab',mid:'#4854ec',color:'#6572ff',bright:'#9580ff'}
};
export function axisPalette(key:AxisKey,value:number){
 const t=percent(value)/100,p=families[key];
 const stop=76-24*t;
 const gradient=`linear-gradient(100deg,${p.deep} 0%,${p.mid} 25%,${p.color} ${stop}%,${p.bright} 100%)`;
 return {...p,gradient,wash:`${p.color}14`,surface:`linear-gradient(180deg,${p.color}08,transparent 75%)`,power:t};
}
export function paletteStyle(key:AxisKey,value:number):string{
 const p=axisPalette(key,value);
 return `--axis-color:${p.color};--axis-bright:${p.bright};--axis-deep:${p.deep};--axis-mid:${p.mid};--axis-gradient:${p.gradient};--channel-gradient:${p.surface};--channel-wash:${p.wash};--axis-power:${p.power};--axis-glow:${.12+.3*p.power}`;
}
