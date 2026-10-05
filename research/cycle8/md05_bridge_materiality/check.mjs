// Explicit research validation; no default/catalog registration or network access.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {hash} from './runtime.mjs';
const root='research/cycle8/md05_bridge_materiality';
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'force-md05-reproduce-'));
const run=args=>{const r=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:4*1024*1024});assert.equal(r.status,0,r.stdout+'\n'+r.stderr);};
for(const name of ['capture.mjs','runtime.mjs','analyze.mjs','check.mjs']) run(['--check',root+'/'+name]);
for(const n of [1,2]){run([root+'/analyze.mjs',path.join(scratch,'run'+n+'.json')]);console.log('Frozen production replay and no-bridge ablation run '+n+': PASS');}
const committed=fs.readFileSync(root+'/results/bridge_materiality.json','utf8').replace(/\r\n/g,'\n');
for(const n of [1,2]){assert.equal(fs.readFileSync(path.join(scratch,'run'+n+'.json'),'utf8'),committed,'JSON bytes differ');assert.equal(fs.readFileSync(path.join(scratch,'run'+n+'.csv'),'utf8'),fs.readFileSync(root+'/results/bridge_materiality.csv','utf8').replace(/\r\n/g,'\n'),'CSV bytes differ');}
const p=JSON.parse(fs.readFileSync(root+'/inputs/provenance.json','utf8'));
assert.equal(hash(fs.readFileSync(root+'/inputs/snapshot.json','utf8').replace(/\r\n/g,'\n')),p.normalizedInputSHA256);
assert.equal(hash(committed),p.resultSHA256);
console.log(JSON.stringify({twoRunByteIdentity:true,committedResultParity:true,syntaxFiles:4,inputSHA256:p.normalizedInputSHA256,resultSHA256:p.resultSHA256,scratch}));
