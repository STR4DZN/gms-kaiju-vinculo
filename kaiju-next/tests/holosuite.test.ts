import test from "node:test";
import assert from "node:assert/strict";
import {createHoloSuiteRegistration,type HoloSuiteApp} from "../src/holosuite.ts";

test("HoloSuite: integração opcional, registro único e aplicativo abre o painel",()=>{
  let calls=0,opens=0,entry:HoloSuiteApp|undefined;
  const open=()=>{opens++;return "panel"};
  const register=createHoloSuiteRegistration(open);
  for(const absent of [undefined,null,{}, {registerApp:true}])assert.equal(register(absent),false);
  const api={registerApp(app:HoloSuiteApp){calls++;entry=app;return app}};
  assert.equal(register(api),true);assert.equal(register(api),true);assert.equal(calls,1);
  assert.equal(entry?.id,"kaiju-vinculo");assert.equal(entry?.playerVisible,true);
  assert.equal(entry?.premium,false);assert.equal(entry?.icon,"fa-solid fa-dragon");
  assert.equal(entry?.open(),"panel");assert.equal(opens,1);
  let ready=false;
  const later={registerApp(){return ready?{}:null}};
  assert.equal(register(later),false);ready=true;assert.equal(register(later),true);
});
