import fs from 'node:fs';
import path from 'node:path';
import {hash,git} from '../packet.mjs';
export {hash,git};
export const SHA=/^[a-f0-9]{40}$/;
export const HASH=/^[a-f0-9]{64}$/;
export const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/;
export const isId=v=>typeof v==='string'&&ID.test(v);
export const compare=(a,b)=>a<b?-1:a>b?1:0;
export const json=v=>JSON.stringify(v,null,2)+'\n';
export function fail(condition,message){if(!condition)throw new Error(message);}
export function exact(v,keys){return v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join('|')===[...keys].sort().join('|');}
export function iso(v){fail(typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(v)&&Number.isFinite(Date.parse(v)),'INVALID_UTC_TIMESTAMP');const out=new Date(v).toISOString();fail(out===v.replace(/Z$/,v.includes('.')?'Z':'.000Z'),'INVALID_UTC_CALENDAR_DATE');return out;}
export function relative(v){fail(typeof v==='string'&&v.length>0&&!/[\\:\x00-\x1f]/.test(v)&&!v.startsWith('/')&&v.split('/').every(x=>x&&x!=='.'&&x!=='..'),'INVALID_RELATIVE_PATH');return v;}
// No links or junctions anywhere on the existing path. Never follow redirected output roots.
export function guarded(root,name,{directory=false,create=false}={}){
 relative(name);const real=fs.realpathSync.native(root);let dest=real;
 for(const part of name.split('/')){dest=path.join(dest,part);if(fs.existsSync(dest))fail(!fs.lstatSync(dest).isSymbolicLink(),'SYMLINK_OUTPUT_REFUSED');}
 if(create){const dir=directory?dest:path.dirname(dest);fs.mkdirSync(dir,{recursive:true});}
 const parent=fs.realpathSync.native(directory&&fs.existsSync(dest)?dest:path.dirname(dest));
 fail(parent===real||(!path.relative(real,parent).startsWith('..')&&!path.isAbsolute(path.relative(real,parent))),'OUTPUT_ESCAPES_ROOT');return dest;
}
export function readJSON(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
export function writeNew(file,value){fs.writeFileSync(file,typeof value==='string'?value:json(value),{encoding:'utf8',flag:'wx'});}
export function atomic(file,value){const tmp=file+'.tmp-'+process.pid;try{writeNew(tmp,value);fs.renameSync(tmp,file);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}}
export function withLock(file,fn,io=fs){let fd;try{fd=io.openSync(file,'wx');}catch(e){if(e.code==='EEXIST')throw Error('OWNER_ACTION_REQUIRED: run lock exists; inspect interrupted request, never auto-retry.');throw Error('LOCK_OPEN_FAILED: '+(e.code??'UNKNOWN'));}try{io.writeSync(fd,JSON.stringify({pid:process.pid,time:new Date().toISOString()}));}catch(e){try{io.closeSync(fd);}finally{io.unlinkSync(file);}throw Error('LOCK_INITIALIZATION_FAILED: '+(e.code??'UNKNOWN'));}return Promise.resolve().then(fn).finally(()=>{try{io.closeSync(fd);}finally{io.unlinkSync(file);}});}
export function safeMessage(v){return typeof v==='string'&&v.trim().length>0&&v.length<=10000;}