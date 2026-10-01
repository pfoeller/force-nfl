import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(ROOT, 'scripts/test_catalog.json');
const extensions = /^(test_.*\.(?:js|mjs|cjs|py))$/;

function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], {encoding:'utf8', maxBuffer:32*1024*1024, windowsHide:true});
  if (result.status !== 0) throw new Error(result.stderr || 'Git worktree inspection failed');
  return result.stdout;
}
export function workspaceFiles(root) {
  return [...new Set(git(root, ['ls-files','-z','--cached','--others','--exclude-standard']).split('\0').filter(Boolean))].sort();
}
export function worktreeSnapshot(root) {
  const status = git(root, ['status','--porcelain=v1','-z','--untracked-files=all']);
  const hashes = workspaceFiles(root).map(name => {
    const target = path.join(root, name);
    return [name, fs.existsSync(target) ? createHash('sha256').update(fs.readFileSync(target)).digest('hex') : null];
  });
  return JSON.stringify({status, hashes});
}
export function copyFiles(root, destination, files) {
  for (const name of files) {
    const source = path.resolve(root, name);
    const target = path.resolve(destination, name);
    if (!source.startsWith(root + path.sep) || !target.startsWith(destination + path.sep)) throw new Error('Workspace copy path escaped root');
    if (!fs.existsSync(source)) continue; // tracked deletion
    if (fs.lstatSync(source).isSymbolicLink()) throw new Error(`Test workspace symlink requires explicit review: ${name}`);
    fs.mkdirSync(path.dirname(target), {recursive:true});
    fs.copyFileSync(source, target);
  }
}
export function resolvePython(env = process.env) {
  const candidates = [env.FORCE_TEST_PYTHON, env.PYTHON];
  if (process.platform === 'win32') {
    const bundled=path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
    if (fs.existsSync(bundled)) candidates.push(bundled);
  }
  candidates.push('python3','python');
  for (const command of candidates.filter(Boolean)) {
    const result = spawnSync(command, ['-B','-c','import sys; assert sys.version_info >= (3, 10); print(sys.executable)'], {encoding:'utf8', timeout:5000, windowsHide:true});
    if (result.status === 0) return result.stdout.trim();
  }
  throw new Error('Python 3.10+ required; set FORCE_TEST_PYTHON to its executable path');
}
export function testEnvironment(scratch, python) {
  const library = path.join(scratch, 'scripts/lib');
  return {...process.env,
    FORCE_TEST_PYTHON:python,
    PYTHONDONTWRITEBYTECODE:'1', PYTHONUTF8:'1', PYTHONIOENCODING:'utf-8',
    PYTHONPATH:library + (process.env.PYTHONPATH ? path.delimiter + process.env.PYTHONPATH : ''),
    NODE_OPTIONS:`--require=${JSON.stringify(path.join(library, 'test_safety.cjs'))} ${process.env.NODE_OPTIONS || ''}`.trim(),
  };
}
export function runOne(entry, scratch, env, python) {
  const executable = entry.file.endsWith('.py') ? python : process.execPath;
  const args = entry.file.endsWith('.py') ? ['-B', 'scripts/' + entry.file] : ['scripts/' + entry.file];
  return spawnSync(executable, args, {cwd:scratch, env, encoding:'utf8', timeout:entry.timeoutMs || 20000,
    maxBuffer:8*1024*1024, windowsHide:true});
}
export function selectTests(catalog, suite = 'safe', files = [], allowSpecial = false) {
  if (!['safe','release','qb','snapshot','server','model','all'].includes(suite)) throw new Error(`Unknown suite: ${suite}`);
  const known = new Map(catalog.tests.map(entry => [entry.file, entry]));
  for (const file of files) if (!known.has(file)) throw new Error(`Unknown test: ${file}`);
  const selected = catalog.tests.filter(entry => files.length ? files.includes(entry.file) : suite === 'all' || entry.suites.includes(suite));
  const special = selected.filter(entry => entry.special?.length);
  if (special.length && !allowSpecial) throw new Error(`Explicit --allow-special required: ${special.map(entry=>entry.file).join(', ')}`);
  if (!selected.length) throw new Error('No tests selected');
  return selected;
}
export function validateCatalog(catalog, root = ROOT) {
  const actual = fs.readdirSync(path.join(root, 'scripts')).filter(name => extensions.test(name)).sort();
  const known = catalog.tests.map(entry => entry.file).sort();
  if (JSON.stringify(actual) !== JSON.stringify(known)) throw new Error('Test catalog is incomplete or duplicated; classify new/renamed tests before running');
}

export function main(argv = process.argv.slice(2)) {
  let suite='safe', list=false, inventory=false, allowSpecial=false;
  const files=[];
  for (let i=0;i<argv.length;i++) {
    const arg=argv[i];
    if (arg==='--suite') suite=argv[++i];
    else if (arg==='--test') files.push(argv[++i]);
    else if (arg==='--list') list=true;
    else if (arg==='--inventory') inventory=true;
    else if (arg==='--allow-special') allowSpecial=true;
    else if (arg==='--help') {
      console.log('node scripts/run_tests.mjs [--suite safe|release|qb|snapshot|server|model|all] [--test filename] [--list] [--inventory] [--allow-special]');
      return 0;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
  validateCatalog(catalog);
  if (inventory) {
    console.log(JSON.stringify({baseline:catalog.baseline, counts:{
      total:catalog.tests.length,
      safe:catalog.tests.filter(entry=>entry.suites.includes('safe')).length,
      excluded:catalog.tests.filter(entry=>!entry.suites.includes('safe')).length,
    }, tests:catalog.tests},null,2));
    return 0;
  }
  // Listing all exclusions must not require authorization to execute them.
  const selected=selectTests(catalog,suite,files,list || allowSpecial);
  if (list) {
    for (const entry of selected) console.log(`${entry.file}\t${entry.suites.join(',') || 'excluded'}\t${entry.reason || ''}${entry.special?.length ? ' ['+entry.special.join(', ')+']' : ''}`);
    return 0;
  }
  const before=worktreeSnapshot(ROOT);
  const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'force-tests-'));
  const label=files.length ? 'selected' : suite;
  let passed=0, failed=0;
  try {
    copyFiles(ROOT,scratch,workspaceFiles(ROOT));
    const needsPython=selected.some(entry=>entry.file.endsWith('.py') || entry.python);
    const python=needsPython ? resolvePython() : process.env.FORCE_TEST_PYTHON;
    const env=testEnvironment(scratch,python);
    console.log(`Running ${selected.length} ${label} tests in an isolated workspace; external network disabled`);
    for (const entry of selected) {
      const result=runOne(entry,scratch,env,python);
      if (result.status===0) { passed++; console.log(`PASS ${entry.file}`); }
      else {
        failed++;console.error(`FAIL ${entry.file}${result.error ? ': '+result.error.message : ''}`);
        console.error((result.stderr || result.stdout || `Exit ${result.status}`).trim());
      }
    }
  } finally {
    // Check the resolved deletion target before recursively removing our temp copy.
    if (path.dirname(scratch)!==path.resolve(os.tmpdir()) || !path.basename(scratch).startsWith('force-tests-')) throw new Error('Unexpected cleanup target');
    fs.rmSync(scratch,{recursive:true,force:true});
    if (worktreeSnapshot(ROOT)!==before) throw new Error('Real worktree changed during test execution; no automatic restore attempted');
    console.log('Worktree status and file hashes unchanged');
  }
  console.log(`${passed} passed, ${failed} failed`);
  return failed ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try { process.exitCode=main(); }
  catch (error) { console.error(error.message);process.exitCode=1; }
}
