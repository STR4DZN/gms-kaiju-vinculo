const {chromium}=require('playwright');const path=require('node:path');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.KAIJU_QA_BROWSER,args:['--no-sandbox','--no-zygote','--disable-gpu','--disable-software-rasterizer','--use-gl=disabled']});
 const p=await b.newPage({viewport:{width:1360,height:1000}});await p.goto('file://'+path.resolve('preview/Modulo_Kaiju_Previa.html'));await p.waitForSelector('.kaiju-channel');
 await p.selectOption('#preview-motion','off');
 const rows=[];
 for(const value of [0,25,50,75,100]){
  await p.getByRole('tab',{name:'Controles',exact:true}).click();for(const key of ['vontade','comunhao','humanidade'])await p.locator(`[data-percent="${key}"]`).fill(String(value));
  await p.getByRole('tab',{name:'Vínculo',exact:true}).click();
  rows.push({value,html:await p.locator('.kaiju-channels').innerHTML()});
 }
 await p.evaluate(rows=>{
  const root=document.querySelector('.kaiju-preview-shell')||document.body;
  const host=document.createElement('main');host.className='kaiju-app';host.style.cssText='display:block;width:1260px;margin:auto;padding:30px;height:auto;overflow:visible';
  host.innerHTML='<h1 style="font:24px sans-serif;margin-bottom:24px">Evolução dos degradês · 0 a 100%</h1><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px">'+rows.map(r=>'<section style="min-width:0"><h2 style="font:20px monospace;color:#e5f4f4;margin:0 0 12px">'+r.value+'%</h2>'+r.html+'</section>').join('')+'</div>';
  for(const e of host.querySelectorAll('.kaiju-channel-heading p,.kaiju-channel-bottom,.kaiju-channel-top,.kaiju-channel-caption'))e.remove();
  for(const e of host.querySelectorAll('.kaiju-channel'))e.style.cssText+=';margin-bottom:12px;padding:14px 10px;';
  for(const e of host.querySelectorAll('.kaiju-channel-heading'))e.style.cssText='flex-wrap:wrap;gap:8px';
  for(const e of host.querySelectorAll('.kaiju-channel-heading h2'))e.style.cssText='font-size:13px';
  for(const e of host.querySelectorAll('.kaiju-channel-value'))e.style.marginLeft='auto';
  for(const e of host.querySelectorAll('.kaiju-channel-value strong'))e.style.fontSize='22px';
  for(const e of host.querySelectorAll('.kaiju-icon-instrument'))e.style.display='none';
  root.replaceChildren(host);document.body.dataset.motion='off';
 },rows);
 await p.locator('.kaiju-app').screenshot({path:'qa/Kaiju_HUD_v5_Degrades.png'});await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
