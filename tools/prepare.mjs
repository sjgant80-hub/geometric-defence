#!/usr/bin/env node
// tools/prepare.mjs — the tune side, from training digits only: θ, node A's antibodies, and B's verdict on each antibody
// share. Writes data/prep.json and data/antibodies.txt. `--check` re-derives both byte for byte (CI).
import { readFileSync, writeFileSync } from 'node:fs';
import { train } from './data.mjs';
import R from '../src/run.mjs';
const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const t0 = Date.now(), p = await R.prepare({ train: train(), nodeText: read('vendor/mesh-share/data/cell-after.txt') });
const { abText, ...rest } = p, out = JSON.stringify(rest, null, 1) + '\n';
if (process.argv.includes('--check')) { const same = read('data/prep.json') === out && read('data/antibodies.txt') === abText; console.log(same ? 'PREP REPRODUCED · θ ' + p.th : 'PREP DIFFERS'); process.exit(same ? 0 : 1); }
writeFileSync(new URL('data/prep.json', ROOT), out); writeFileSync(new URL('data/antibodies.txt', ROOT), abText);
console.log('prepare in ' + Math.round((Date.now() - t0) / 1000) + ' s · θ ' + p.th + ' · tune mimics passing θ ' + p.mimicFitsPassTheta + '/300 · antibodies ' + p.abHash.slice(0, 16) + ' · honest ' + p.receive.honest.reason + ' (' + p.receive.honest.newRejects + ' new rejects), forged ' + p.receive.forged.reason + ', harmful ' + p.receive.harmful.reason + ' (' + p.receive.harmful.newRejects + ')');
