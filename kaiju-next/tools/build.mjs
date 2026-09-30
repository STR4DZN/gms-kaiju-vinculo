import {build} from "esbuild";
import {readFile,writeFile,rm,mkdir,cp} from "node:fs/promises";
import {resolve,dirname} from "node:path";
await rm("dist",{recursive:true,force:true});
await mkdir("dist/scripts",{recursive:true});
const rawPlugin={
  name:"raw-template",setup(builder){
    builder.onResolve({filter:/\.hbs\?raw$/},args=>({path:resolve(args.resolveDir,args.path.replace(/\?raw$/,"")),namespace:"raw"}));
    builder.onLoad({filter:/.*/,namespace:"raw"},async args=>({contents:await readFile(args.path,"utf8"),loader:"text",resolveDir:dirname(args.path)}));
  }
};
await build({entryPoints:["src/main.ts"],outfile:"dist/scripts/main.js",bundle:true,format:"esm",target:"es2022",minify:false,plugins:[rawPlugin]});
await cp("module.json","dist/module.json");
await cp("styles/kaiju.css","dist/styles/kaiju.css",{recursive:true});
await cp("README.md","dist/README.md");
await cp("THIRD_PARTY.md","dist/THIRD_PARTY.md");
await cp("VALIDACAO.md","dist/VALIDACAO.md");
await mkdir("preview",{recursive:true});
await mkdir("LICENSES",{recursive:true});
await cp("node_modules/handlebars/LICENSE","LICENSES/Handlebars.txt");
await cp("node_modules/@fortawesome/fontawesome-free/LICENSE.txt","LICENSES/FontAwesome.txt");
await cp("LICENSES","dist/LICENSES",{recursive:true});
const offline=await build({entryPoints:["src/preview.ts"],outfile:"preview/app.js",bundle:true,write:false,format:"esm",target:"es2022",minify:true,plugins:[rawPlugin],loader:{".woff2":"dataurl",".woff":"dataurl",".ttf":"dataurl"}});
const js=offline.outputFiles.find(file=>file.path.endsWith(".js")).text;
const css=offline.outputFiles.find(file=>file.path.endsWith(".css")).text;
const html=await readFile("index.html","utf8");
await writeFile("preview/Modulo_Kaiju_Previa.html",html.replace("</head>",`<style>${css}</style></head>`).replace('<script type="module" src="/src/preview.ts"></script>',`<script type="module">${js.replaceAll("</script","<\\/script")}</script>`));
console.log("Módulo gerado em dist/.");
console.log("Prévia independente gerada em preview/Modulo_Kaiju_Previa.html.");
