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
// Resolved through the package graph, never through `process.cwd()`. The documented
// command (benchmarks/suites/ilb-competitor-parity/run.mjs, header) runs this script
// FROM the suite directory, where a relative `node_modules/eslint-plugin-security`
// does not exist — the extractor threw ENOENT before capturing a single case.
// `require.resolve` also survives npm hoisting the dependency to the workspace root,
// which is where it actually lives here.
const dir=path.join(path.dirname(require.resolve('eslint-plugin-security/package.json')),'test/rules');
for(const f of fs.readdirSync(dir)){
  try{ realRequire(path.resolve(dir,f)); }catch(e){ console.error('SKIP',f,e.message.slice(0,80)); }
}
// RAW CAPTURE ONLY, and deliberately not the corpus path. The committed corpus
// (../corpus/competitor-parity/eslint-plugin-security.json) wraps these same cases in
// a hand-maintained header — provenance, licence, notice, counts — that this script
// does not produce. Piping this output straight over the corpus would drop that header
// and silently restate every published parity denominator. Diff, then port by hand.
const out=path.join(__dirname,'../corpus/competitor-parity/their-cases.raw.json');
fs.writeFileSync(out,JSON.stringify(cases,null,1));
console.log(`wrote ${out}`);
const inv=cases.filter(c=>c.kind==='invalid').length, val=cases.filter(c=>c.kind==='valid').length;
console.log(`captured ${cases.length} cases: ${inv} invalid (must-detect), ${val} valid (must-not-flag)`);
const byRule={}; cases.forEach(c=>{byRule[c.rule]??={valid:0,invalid:0}; byRule[c.rule][c.kind]++;});
for(const [r,v] of Object.entries(byRule)) console.log(`  ${r}: ${v.invalid} invalid / ${v.valid} valid`);
