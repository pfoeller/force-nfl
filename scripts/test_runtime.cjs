const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
let checks=0;
const ok=(value,label)=>{assert.ok(value,label);checks++;};

(async()=>{
  const runner=await import('./run_tests.mjs');
  const root=path.resolve(__dirname,'..');
  ok(JSON.parse(fs.readFileSync(path.join(root,'package.json'))).type==='module','production remains ESM');
  ok(JSON.parse(fs.readFileSync(path.join(__dirname,'package.json'))).type==='commonjs','historical scripts have CommonJS scope');
  ok(JSON.parse(fs.readFileSync(path.join(__dirname,'lib/package.json'))).type==='module','shared helpers retain ESM scope');
  const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'test_catalog.json')));
  runner.validateCatalog(catalog,root);
  ok(runner.selectTests(catalog).every(entry=>entry.suites.includes('safe') && !entry.special?.length),'safe selection is explicit and contains no special tests');
  assert.throws(()=>runner.selectTests(catalog,'safe',['test_v27_metric_transform_smoke.js']),/allow-special/);checks++;
  assert.throws(()=>runner.selectTests(catalog,'safe',['test_unknown.js']),/Unknown test/);checks++;
  assert.throws(()=>runner.validateCatalog({...catalog,tests:catalog.tests.slice(1)},root),/incomplete/);checks++;
  for(const name of ['test_v12_ui.js','test_v149_bootstrap_snapshot.mjs']) {
    const result=spawnSync(process.execPath,[path.join(__dirname,name)],{cwd:root,encoding:'utf8',timeout:5000});
    ok(result.status===0,'natural Node execution: '+name);
  }
  const guarded=spawnSync(process.execPath,['--require',path.join(__dirname,'lib/test_safety.cjs'),'-e',
    "const assert=require('node:assert/strict');const http=require('node:http');const net=require('node:net');"+
    "assert.throws(()=>http.get('https://example.com'),/disabled/);"+
    "assert.throws(()=>net.connect(443,'example.com'),/disabled/);"+
    "assert.throws(()=>new net.Socket().connect(443,'8.8.8.8'),/disabled/);"+
    "assert.throws(()=>net.createServer().listen(0,'0.0.0.0'),/disabled/);"+
    "fetch('https://example.com').then(()=>process.exit(1),e=>assert.match(e.message,/disabled/));"
  ],{encoding:'utf8',timeout:5000});
  ok(guarded.status===0,'external HTTP/TCP/fetch and public listeners are denied');
  const python=process.env.FORCE_TEST_PYTHON || runner.resolvePython();
  const pythonGuard=spawnSync(python,['-B','-c',
    "import socket,sys\nfor action in (lambda:socket.create_connection(('example.com',443)),lambda:socket.socket().bind(('0.0.0.0',0))):\n try: action();sys.exit(1)\n except RuntimeError: pass\nassert sys.dont_write_bytecode\n"
  ],{env:runner.testEnvironment(root,python),encoding:'utf8',timeout:5000});
  ok(pythonGuard.status===0,'Python subprocess network guard and bytecode policy are inherited');

  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'force-runner-regression-'));
  try {
    const source=path.join(temporary,'source'),scratch=path.join(temporary,'scratch');
    fs.mkdirSync(path.join(source,'scripts'),{recursive:true});fs.mkdirSync(scratch);
    fs.writeFileSync(path.join(source,'benchmark.json'),'original');
    fs.writeFileSync(path.join(source,'scripts/test_dirty.cjs'),"require('node:fs').writeFileSync(require('node:path').join(__dirname,'../benchmark.json'),'test output')");
    fs.writeFileSync(path.join(source,'scripts/test_failure.cjs'),"throw new Error('intentional failure')");
    fs.writeFileSync(path.join(source,'scripts/test_timeout.cjs'),"setInterval(()=>{},1000)");
    runner.copyFiles(source,scratch,['benchmark.json','scripts/test_dirty.cjs','scripts/test_failure.cjs','scripts/test_timeout.cjs']);
    const env={...process.env};
    const dirty=runner.runOne({file:'test_dirty.cjs'},scratch,env,python);
    ok(dirty.status===0 && fs.readFileSync(path.join(scratch,'benchmark.json'),'utf8')==='test output','artifact writer executes in copied workspace');
    ok(fs.readFileSync(path.join(source,'benchmark.json'),'utf8')==='original','isolation preserves source artifact without restoration');
    ok(runner.runOne({file:'test_failure.cjs'},scratch,env,python).status!==0,'test failure is propagated');
    ok(runner.runOne({file:'test_timeout.cjs',timeoutMs:100},scratch,env,python).error?.code==='ETIMEDOUT','hanging child gets a bounded timeout');
  } finally {
    if(path.dirname(temporary)!==path.resolve(os.tmpdir()) || !path.basename(temporary).startsWith('force-runner-regression-'))throw new Error('Unexpected temp target');
    fs.rmSync(temporary,{recursive:true,force:true});
  }
  console.log(`PASS: test execution architecture (${checks} checks)`);
})().catch(error=>{console.error(error);process.exitCode=1;});
