const Module=require('module'); const fs=require('fs'); const path=require('path');
const cases=[]; let current=null;
const realRequire=Module.prototype.require;
Module.prototype.require=function(id){
  if(id==='eslint'){
    const real=realRequire.call(this,'eslint');
    return {...real, RuleTester: class { constructor(){} run(name,rule,tests){
      (tests.valid||[]).forEach((c,i)=>cases.push({rule:name,kind:'valid',i,code:typeof c==='string'?c:c.code,filename:(typeof c==='object'&&c.filename)||null}));
      (tests.invalid||[]).forEach((c,i)=>cases.push({rule:name,kind:'invalid',i,code:typeof c==='string'?c:c.code,filename:c.filename||null}));
    }}};
  }
  return realRequire.call(this,id);
};
const dir='node_modules/eslint-plugin-security/test/rules';
for(const f of fs.readdirSync(dir)){
  try{ realRequire(path.resolve(dir,f)); }catch(e){ console.error('SKIP',f,e.message.slice(0,80)); }
}
fs.writeFileSync('their-cases.json',JSON.stringify(cases,null,1));
const inv=cases.filter(c=>c.kind==='invalid').length, val=cases.filter(c=>c.kind==='valid').length;
console.log(`captured ${cases.length} cases: ${inv} invalid (must-detect), ${val} valid (must-not-flag)`);
const byRule={}; cases.forEach(c=>{byRule[c.rule]??={valid:0,invalid:0}; byRule[c.rule][c.kind]++;});
for(const [r,v] of Object.entries(byRule)) console.log(`  ${r}: ${v.invalid} invalid / ${v.valid} valid`);
