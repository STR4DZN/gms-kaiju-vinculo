// Optional browser regression: Foundry v13 imports manifest CSS into modules.
// Requires Playwright and a Chromium executable (KAIJU_QA_BROWSER).
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'..');
const source='https://raw.githubusercontent.com/Thuurvdv/HoloSuite/holosuite-core-v1.0.11/holosuite-core/styles/holosuite-core.css';
(async()=>{
 const manifest=JSON.parse(await fs.readFile(path.join(root,'dist/module.json'),'utf8'));
 const core=process.env.KAIJU_HOLO_CORE_CSS
  ? await fs.readFile(process.env.KAIJU_HOLO_CORE_CSS,'utf8')
  : await fetch(source).then(r=>{if(!r.ok)throw Error(`Core CSS: ${r.status}`);return r.text()});
 const server=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/core.css'){res.setHeader('Content-Type','text/css');return res.end(core)}
  if(pathname.startsWith('/modules/kaiju-vinculo/')){
   const relative=pathname.slice('/modules/kaiju-vinculo/'.length);
   if(!/^(styles\/[\w.-]+\.css|assets\/icons\/[\w.-]+\.svg)$/.test(relative)){res.statusCode=404;return res.end()}
   try{res.setHeader('Content-Type',relative.endsWith('.css')?'text/css':'image/svg+xml');return res.end(await fs.readFile(path.join(root,'dist',relative)))}catch{res.statusCode=404;return res.end()}
  }
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head></head><body></body></html>');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.KAIJU_QA_BROWSER,args:['--no-sandbox','--no-zygote','--disable-gpu','--disable-software-rasterizer','--use-gl=disabled']});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const checks=[];
  for(const device of ['base','space-police'])for(const coreFirst of [true,false])for(const legacy of [true,false]){
   await page.goto(`http://127.0.0.1:${server.address().port}/`);
   const imports=manifest.styles.map(entry=>{
    const src=typeof entry==='string'?entry:entry.src;
    const layer=legacy || typeof entry==='string'?'modules':entry.layer;
    return `@import url("modules/kaiju-vinculo/${src}")${layer===null?'':` layer(${layer})`};`;
   }).join('\n');
   const moduleStyle=`<style>@layer modules;\n${imports}</style>`;
   const coreStyle='<link rel="stylesheet" href="core.css">';
   await page.setContent(`<html><head>${coreFirst?coreStyle+moduleStyle:moduleStyle+coreStyle}</head><body data-holosuite-device-style="${device}"><div class="holosuite-phone"><button class="holosuite-app-tile" data-holosuite-app="kaiju-vinculo"><span class="holosuite-app-icon" data-holosuite-app-icon="kaiju-vinculo"><i class="kaiju-app-glyph"></i></span>Kaiju</button><button class="holosuite-app-tile" data-holosuite-app="example"><span class="holosuite-app-icon" data-holosuite-app-icon="example"><i class="fa-solid fa-file"></i></span>Outro</button></div></body></html>`,{waitUntil:'networkidle'});
   const state=await page.locator('[data-holosuite-app-icon="kaiju-vinculo"]').evaluate(e=>{
    const s=getComputedStyle(e,'::before');return {image:s.backgroundImage,mask:s.maskImage,display:s.display,width:s.width,fallback:getComputedStyle(e.querySelector('i')).display,after:getComputedStyle(e,'::after').display};
   });
   if(legacy){assert.notEqual(state.mask,'none');assert.equal(state.image,'none')}
   else{
    assert.ok(state.image.includes('/modules/kaiju-vinculo/assets/icons/kaiju-app.svg'));
    assert.equal(state.mask,'none');assert.equal(state.display,'block');assert.equal(state.width,'38px');assert.equal(state.fallback,'none');assert.equal(state.after,'none');
    assert.ok(await page.evaluate(()=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image.naturalWidth>0);image.onerror=()=>resolve(false);image.src='modules/kaiju-vinculo/assets/icons/kaiju-app.svg'})));
    await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('[data-holosuite-app-icon="kaiju-vinculo"]').evaluate(e=>e.getAnimations({subtree:true}).length),0);
   }
   const other=await page.locator('[data-holosuite-app-icon="example"]').evaluate(e=>{const s=getComputedStyle(e,'::before');return {image:s.backgroundImage,mask:s.maskImage}});
   checks.push({device,coreFirst,legacy,state,other});
  }
  for(let i=0;i<checks.length;i+=2)assert.deepEqual(checks[i].other,checks[i+1].other);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({core:'1.0.11',version:manifest.version,cases:checks.length,legacyBugReproduced:4,fixedCases:4,otherAppsUnchanged:true,assetLoaded:true},null,2));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
