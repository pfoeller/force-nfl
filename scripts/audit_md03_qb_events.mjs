// Deterministic labeled-episode replay, cropped and full-season; local JSON only. Never fetches data.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {evaluateSample} from './lib/md03_qb_events.js';
const file=process.argv[2] || fileURLToPath(new URL('./fixtures/md03_qb_episode_sample.json',import.meta.url));
console.log(JSON.stringify(evaluateSample(JSON.parse(fs.readFileSync(file,'utf8'))),null,2));
