// The page and the files, held to their sealed claims: D7 (no measured number typed into the page), D8 (the data and every
// vendored file are the pinned bytes), seal 2 naming what the held-out side was read with, the credits, the failures told.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const sha = (p) => createHash('sha256').update(readFileSync(new URL(p, ROOT))).digest('hex');
const html = read('index.html'), app = read('app.mjs'), claims = read('CLAIMS.md');

test('D8: the data and every vendored file are the pinned bytes', () => {
  for (const p of ['vendor/settling-cell/src/cell.mjs', 'vendor/hybrid-gate/src/mnist.mjs', 'vendor/mesh-share/data/cell-after.txt']) assert.ok(claims.includes(sha(p)), p);
  const pinned = new Map();
  for (const s of JSON.parse(read('vendor/SOURCES.json')).sources) for (const f of s.files) pinned.set(f.path, f.sha256);
  const files = [];
  (function walk(d) { for (const n of readdirSync(new URL(d, ROOT))) { const p = d + '/' + n; if (statSync(new URL(p, ROOT)).isDirectory()) walk(p); else files.push(p); } })('vendor');
  for (const f of files.filter((x) => x !== 'vendor/SOURCES.json')) { assert.ok(pinned.has(f), f + ' is not pinned'); assert.equal(sha(f), pinned.get(f), f + ' changed'); }
  assert.equal(sha('data/mnist/t10k-images-idx3-ubyte.gz'), '8d422c7b0a1c1c79245a5bcf07fe86e33eeafee792b84584aec276f5a2dbc4e6');
});
test('seal 2 names the node, the antibodies and the tune record', () => {
  const seal = read('SEAL2.md');
  for (const f of ['vendor/mesh-share/data/cell-after.txt', 'data/antibodies.txt', 'data/prep.json']) assert.ok(seal.includes(sha(f)), f);
  assert.equal(JSON.parse(read('data/record.json')).record.abHash, sha('data/antibodies.txt'));
});
test('D7: no measured number is typed into the page', () => {
  const r = JSON.parse(read('data/record.json')).record, forms = new Set();
  for (const v of [r.genuine.passPlain / r.digits, ...Object.values(r.attacks).map((x) => x.nonFit / r.per)]) if (v > 0 && v < 1) forms.add((v * 100).toFixed(1) + '%');
  for (const n of [r.genuine.passPlain, ...Object.values(r.attacks).flatMap((x) => [x.nonFit])]) if (n > 9) forms.add(n + ' of'), forms.add(n.toLocaleString('en-GB') + ' of');
  forms.add(r.hash.slice(0, 12));
  const visible = html.replace(/<style>[\s\S]*?<\/style>/, '');
  for (const s of forms) assert.equal(visible.includes(s), false, 'the page has "' + s + '" typed in; it must come from the record');
  assert.match(app, /pct\(r\.genuine\.passPlain \/ r\.digits\)/);
});
test('the failures are told, the page explains itself, talks only to itself, and carries its credits', () => {
  assert.match(app, /pass \? 'HELD' : 'FAILED'/);
  assert.match(app, /Failed and kept: /);
  assert.match(app, /Each failure is kept on the record and on this page\./);
  assert.match(html, /A claim that misses its bar is kept and shown as failed\./);
  for (const id of ['result', 'families', 'rerun', 'what', 'start', 'how', 'blueprint', 'adoption', 'paper', 'business']) assert.match(html, new RegExp('<section id="' + id + '"'), id);
  assert.match(html, /connect-src 'self'/);
  assert.match(html, /Powered by the Konomi architecture, created by Thomas Frumkin/);
  assert.match(html, /Y\. LeCun, C\. Cortes and C\. J\. C\. Burges, CC BY-SA 3\.0/);
  assert.equal(/£\s?\d|\$\s?\d|per seat|\/mo\b/i.test(html), false, 'no price of ours on the page');
});
