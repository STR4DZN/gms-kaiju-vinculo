const {chromium}=require('playwright');
const path=require('node:path');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.KAIJU_QA_BROWSER,args:['--no-sandbox','--no-zygote','--disable-gpu','--disable-software-rasterizer','--use-gl=disabled']});
 const page=await browser.newPage({viewport:{width:1360,height:1000}});
 await page.goto('file://'+path.resolve('preview/Modulo_Kaiju_Previa.html'));await page.waitForSelector('.kaiju-scan-pass');await page.waitForTimeout(600);
 // Seek the real CSS timelines deterministically; frames remain actual browser renders.
 fs.mkdirSync('qa/motion-frames',{recursive:true});
 for(let frame=0;frame<144;frame++){
  await page.evaluate(time=>{for(const a of document.getAnimations()){if(a.effect.getTiming().iterations===Infinity){a.pause();a.currentTime=time}}},frame*6400/144);
  await page.screenshot({path:`qa/motion-frames/${String(frame).padStart(4,'0')}.png`});
 }
 for(const [name,t] of [['Aquisicao',650],['Varredura',2450],['Confirmacao',5250]]){
  await page.evaluate(time=>{for(const a of document.getAnimations()){if(a.effect.getTiming().iterations===Infinity){a.pause();a.currentTime=time}}},t);
  await page.screenshot({path:`qa/Kaiju_HUD_v5_${name}.png`});
 }
 console.log('144 frames; 3 fases capturadas');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
