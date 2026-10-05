// Explicit offline research checks; no production catalog registration or network access.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {hash} from './runtime.mjs';
import {assertPathHygiene,sanitizeManifest} from './persistence_inventory.mjs';
import {normalize,saveSnapshot,validateCompatibility} from './prospective_capture.mjs';
const root='research/cycle8/md05_bridge_materiality';
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'force-md05-key-group-check-'));
const run=args=>{const r=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:4*1024*1024});assert.equal(r.status,0,r.stdout+'\n'+r.stderr);};
for(const name of ['key_group_ablation.mjs','persistence_inventory.mjs','prospective_capture.mjs','check_key_group.mjs'])run(['--check',root+'/'+name]);
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const immutable=['inputs/provenance.json','inputs/snapshot.json','results/bridge_materiality.json','results/bridge_materiality.csv','analyze.mjs','capture.mjs','check.mjs','runtime.mjs'];
for(const p of immutable){const prior=spawnSync('git',['-c',`safe.directory=${process.cwd().split(path.sep).join('/')}`,'show',`d16c5d79f77585935af8ebfc4a82e4d1188e1683:${root}/${p}`],{encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(prior.status,0,prior.stderr);assert.equal(read(root+'/'+p),prior.stdout.replace(/\r\n/g,'\n'),'accepted artifact changed: '+p);}
const manifest=JSON.parse(read(root+'/inputs/persistence_candidates.json'));
assertPathHygiene(manifest);assertPathHygiene(JSON.parse(read(root+'/results/persistence_inventory.json')));
assert.deepEqual(sanitizeManifest(manifest),manifest,'logical-path normalization must be idempotent');
assertPathHygiene({source:'https://example.invalid/research'});
assert.deepEqual(sanitizeManifest({...manifest,source:'https://example.invalid/research'}),{...manifest,source:'https://example.invalid/research'},'public URL must not be mistaken for a drive path');
const sep=String.fromCharCode(92),drive='X'+':'+sep;
const forbidden=[drive+['Users','person','private.json'].join(sep),drive+['Projects','repo','x.json'].join(sep),
  drive+['Users','person','.'+'codex','worktrees','copy','x.json'].join(sep),
  drive+['Users','person','App'+'Data','Local','Temp','x.json'].join(sep),
  '/'+['Users','person','x.json'].join('/'),'/'+['home','person','x.json'].join('/'),
  '/'+['tmp','research','x.json'].join('/'),sep+sep+['server','share','x.json'].join(sep)];
for(const raw of forbidden){assert.throws(()=>assertPathHygiene({nested:[{path:raw}]}),/machine path/);}
// Two distinct roots with the same filename must stay distinct; repeat copies stay repeat copies.
const sourceRoots=[drive+'one',drive+'two'];
const fixture={roots:sourceRoots,matchingFiles:[sourceRoots[0]+sep+'same.json',sourceRoots[1]+sep+'same.json'],
  candidates:[{sha256:'SYNTHETIC',paths:[sourceRoots[0]+sep+'same.json',sourceRoots[0]+sep+'same.json']} ]};
const sanitized=sanitizeManifest(fixture);
assert.equal(new Set(sanitized.matchingFiles).size,2);assert.equal(sanitized.candidates[0].paths[0],sanitized.candidates[0].paths[1]);
assert.deepEqual(sanitizeManifest(sanitized),sanitized);assertPathHygiene(sanitized);
console.log('Path hygiene: PASS; eight forbidden-path controls, collision/copy preservation and idempotence');
for(const n of [1,2]){
run([root+'/key_group_ablation.mjs',path.join(scratch,'ablation'+n+'.json')]);
run([root+'/persistence_inventory.mjs',path.join(scratch,'inventory'+n+'.json')]);
for(const [saved,actual] of [['key_group_ablation.json','ablation'+n+'.json'],['key_group_ablation.csv','ablation'+n+'.csv'],['persistence_inventory.json','inventory'+n+'.json']])assert.equal(read(root+'/results/'+saved),read(path.join(scratch,actual)),'new deterministic result differs');
console.log('Research run '+n+': PASS; JSON/CSV/inventory byte identity');
}
const snapshot=JSON.parse(read(root+'/inputs/snapshot.json'));
const lite={...snapshot,referenceLite:{ratings:snapshot.reference.ratings,analyticWins:snapshot.reference.analyticWins,games:snapshot.reference.games.map(g=>({gameKey:g.gameKey,forecast:g.forecast}))}};
validateCompatibility(lite);
assert.throws(()=>normalize('{}',{sha256:'bad'},{}),/raw capture hash/);
const meta={sha256:hash('{}'),bytes:2,capturedAt:snapshot.capture.capturedAt,url:'https://forceratings.com/api/bootstrap',status:200};
assert.throws(()=>normalize('{}',meta,{}),/generation/);
assert.throws(()=>saveSnapshot(lite,path.join(scratch,'accepted')),/accepted generation/);
const synthetic={...lite,generation:'SYNTHETIC-write-control-not-a-capture'};
const dest=path.join(scratch,'synthetic-write-control');saveSnapshot(synthetic,dest);
assert.throws(()=>saveSnapshot(synthetic,dest),/refuse overwrite/);
// Optional local positive normalization check uses already-captured raw bytes; never recaptures.
let privateNormalization=false;
if(process.argv[2]){
const dir=process.argv[2],parse=p=>JSON.parse(read(path.join(dir,p)).replace(/^\uFEFF/,''));
const normalized=normalize(fs.readFileSync(path.join(dir,'bootstrap.json'),'utf8'),parse('capture_meta.json'),parse('public_source_hashes.json'));
assert.deepEqual(normalized.core,snapshot.core);assert.deepEqual(normalized.ratings,snapshot.ratings);
assert.deepEqual(normalized.profiles,snapshot.profiles);assert.deepEqual(normalized.games,snapshot.games);
assert.deepEqual(normalized.referenceLite,lite.referenceLite);
const wrong={...parse('public_source_hashes.json')};wrong[Object.keys(wrong)[0]]='bad';
assert.throws(()=>normalize(fs.readFileSync(path.join(dir,'bootstrap.json'),'utf8'),parse('capture_meta.json'),wrong),/deployed script/);
privateNormalization=true;
}
console.log(JSON.stringify({syntaxFiles:4,pathHygiene:true,acceptedArtifactsUnchanged:8,newResultsByteIdentical:true,prospectiveCompatibility:true,overwriteControls:true,privateNormalization,scratch,resultSHA256:hash(read(root+'/results/key_group_ablation.json')),inventorySHA256:hash(read(root+'/results/persistence_inventory.json'))}));
