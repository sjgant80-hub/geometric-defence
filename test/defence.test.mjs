// The defence's kernels, held to the sealed text. Fixtures come from the MNIST TRAINING file only; the test digits are
// read once, by tools/eval.mjs, after seal 2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import D from '../src/defence.mjs';
import R from '../src/run.mjs';
import C from '../vendor/settling-cell/src/cell.mjs';
import M from '../vendor/hybrid-gate/src/mnist.mjs';
import * as K from '../vendor/living-seed/vendor/keys/keys.mjs';
import { utf8 } from '../vendor/settling-cell/vendor/seed-library/sha256.mjs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const claims = read('CLAIMS.md').replace(/\s+/g, ' ');
const raw = (f) => new Uint8Array(gunzipSync(readFileSync(new URL('../data/mnist/' + f, import.meta.url))));
const IMG = raw('train-images-idx3-ubyte.gz'), LAB = raw('train-labels-idx1-ubyte.gz');
const sub = (from, n) => {
  const i = new Uint8Array(16 + n * 784); i.set(IMG.subarray(0, 16)); new DataView(i.buffer).setUint32(4, n); i.set(IMG.subarray(16 + from * 784, 16 + (from + n) * 784), 16);
  const l = new Uint8Array(8 + n); l.set(LAB.subarray(0, 8)); new DataView(l.buffer).setUint32(4, n); l.set(LAB.subarray(8 + from, 8 + from + n), 8);
  return M.parse(i, l);
};
const nodeText = read('vendor/mesh-share/data/cell-after.txt'), f = C.parseCell(nodeText), c = C.cell(f.shape, { R: f.R, n: f.n });
const real = sub(50000, 600), train = { x: Array.from({ length: 54300 }, (_, i) => real.x[i % 600]), y: Array.from({ length: 54300 }, (_, i) => real.y[i % 600]) };
const cfg = { ...D.CFG, per: 6, queries: 20, antibodies: 3 };
const wellOf = (inks, copies) => { const mem = inks.flatMap((ink) => Array.from({ length: copies }, () => C.settle(c, C.encode(ink, 4)).state)); return C.cell({ b: 4, k: mem.length, N: 256, mem, cls: mem.map(() => 0) }, { R: c.R, n: c.n }); };

test('the sealed numbers in the code are the ones CLAIMS.md and AMENDMENT.md state', () => {
  for (const s of ['1st percentile of the fits of 2,000 genuine tune digits (MNIST training rows 50,000–51,999)', 'hill-climbs for 300 queries', 'tune attacks 60,000 + i; held-out attacks 70,000 + i', '300 of each attack family', 'grows 10 antibody patterns', 'rows 52,000–52,199), the antibodies may newly reject at most 1', 'at least 98.0%', 'at least 97.0%', 'at least 99.0% of the time', 'at least 90.0% of held-out-seed mimics'])
    assert.ok(claims.includes(s), 'CLAIMS.md says: ' + s);
  assert.ok(read('AMENDMENT.md').includes('**Zero fit is always non-fit:**'));
  assert.deepEqual(D.CFG, { pctile: 1, per: 300, queries: 300, tuneSeed: 60000, heldSeed: 70000, antibodies: 10, maxNewRejects: 1 });
  assert.deepEqual(R.ROWS, { tune: [50000, 52000], gate: [52000, 52200], harmful: [54000, 54300] });
  assert.ok(Object.isFrozen(D.CFG) && Object.isFrozen(R.ROWS));
});

test('the crypto floor: roster and signature on the raw bytes first, then the parse', async () => {
  const A = await D.keyOf('node-A'), Cn = await D.keyOf('node-C'), roster = [A.pub];
  assert.equal((await D.keyOf('node-A')).pub, A.pub);
  const ink = real.x[0], m = await D.message(A, ink);
  assert.deepEqual(Array.from(m.bytes), ink);
  assert.equal(await K.verify(A.pub, m.sig, m.bytes), true);
  assert.deepEqual(await D.admit(m, roster), { ok: true, reason: 'admitted', ink });
  const bent = m.bytes.slice(); bent[3] ^= 1;
  assert.equal((await D.admit({ ...m, bytes: bent }, roster)).reason, 'bad-signature');
  assert.equal((await D.admit(await D.message(Cn, ink), roster)).reason, 'unknown-key');
  assert.equal((await D.admit({ ...m, sig: (await D.message(A, real.x[1])).sig }, roster)).reason, 'bad-signature');
  const big = new Array(64).fill(0); big[5] = 17;
  assert.equal((await D.admit(await D.message(A, big), roster)).reason, 'malformed', 'a byte over 16 is refused at the parse');
  assert.equal((await D.admit(await D.message(A, ink.slice(0, 63)), roster)).reason, 'malformed');
  const edge = new Array(64).fill(16);
  assert.equal((await D.admit(await D.message(A, edge), roster)).reason, 'admitted', '16 is allowed');
});

test('θ, and the geometric layer\'s three verdicts', () => {
  assert.equal(D.theta(c, real.x.slice(0, 200)), 0, 'zero-fit genuine digits make the 1st percentile 0');
  const fits = real.x.slice(0, 200).map((x) => C.settle(c, C.encode(x, 4)).fit).sort((a, b) => a - b);
  assert.equal(D.theta(c, real.x.slice(0, 200), 50), fits[100]);
  assert.equal(D.theta(c, real.x.slice(0, 200), 99.5), fits[199]);
  const g = real.x[0], fit = C.settle(c, C.encode(g, 4)).fit;
  assert.ok(fit > 0);
  assert.deepEqual(D.judge(c, null, 0, g), { verdict: 'pass', fit, abFit: 0 });
  assert.equal(D.judge(c, null, fit, g).verdict, 'pass', 'exactly θ passes');
  assert.equal(D.judge(c, null, fit + 1, g).verdict, 'non-fit');
  assert.equal(D.judge(c, null, 0, new Array(64).fill(16)).verdict, 'non-fit', 'zero fit is always non-fit (amendment 1)');
  assert.equal(D.judge(c, null, 0, new Array(64).fill(16)).fit, 0);
  const strong = wellOf([g], 3), weak = wellOf([real.x[1]], 1);
  const v = D.judge(c, strong, 0, g);
  assert.equal(v.verdict, 'antibody', 'an antibody well holding more fit claims the input');
  assert.ok(v.abFit >= v.fit && v.abFit > 0);
  assert.equal(D.judge(c, weak, 0, g).verdict, 'pass');
  const same = D.judge(c, c, 0, g);
  assert.deepEqual([same.verdict, same.abFit === same.fit], ['antibody', true], 'an antibody well holding exactly as much fit claims the input');
  assert.equal(D.judge(c, null, 0, g).abFit, 0);
});

test('the attack families, seeded exactly', async () => {
  const g = real.x[0];
  assert.deepEqual(D.scrambled(g, 9), C.scrambled(g, 9));
  assert.deepEqual(D.noise(5).slice(0, 8), [11, 13, 3, 10, 1, 10, 12, 7]);
  assert.ok(D.noise(5).every((v) => v >= 0 && v <= 16) && D.noise(5).length === 64);
  assert.deepEqual(D.inverted([0, 16, 7]), [16, 0, 9]);
  const m = D.mimic(c, 5, 30), start = C.settle(c, C.encode(D.noise(5), 4)).fit;
  assert.ok(C.settle(c, C.encode(m, 4)).fit >= start, 'a mimic never loses fit');
  assert.deepEqual(D.mimic(c, 5, 30), m, 'deterministic');
  assert.deepEqual(D.mimic(c, 5, 0), D.noise(5), 'zero queries leaves the noise');
  const wide = C.cell(f.shape, { R: 200, n: 2 });
  const w0 = C.settle(wide, C.encode(D.noise(7), 4)).fit, w1 = D.mimic(wide, 7, 40), wf = C.settle(wide, C.encode(w1, 4)).fit;
  assert.ok(w0 > 0 && wf === w0, 'on a wide-reach cell noise has fit, and the settled fit is flat inside a basin: no one-pixel change raised it');
  let x = D.noise(7), best = w0; const r = (await import('../vendor/settling-cell/vendor/seed-library/seedlib.mjs')).rng(8);
  for (let q = 0; q !== 40; q++) { const p = Math.floor(r() * 64), v = Math.floor(r() * 17), old = x[p]; x[p] = v; const ff = C.settle(wide, C.encode(x, 4)).fit; if (ff > best) best = ff; else x[p] = old; }
  assert.deepEqual(w1, x, 'exactly the sealed climb: rng seed + 1, one pixel per query, keep only a strict rise');
  const inkSum = (ink) => ink.reduce((s2, v2) => s2 + v2, 0), climbed = D.mimic(c, 7, 50, inkSum);
  let y = D.noise(7), yb = inkSum(y); const r2 = (await import('../vendor/settling-cell/vendor/seed-library/seedlib.mjs')).rng(8);
  for (let q = 0; q !== 50; q++) { const p = Math.floor(r2() * 64), v = Math.floor(r2() * 17), old = y[p]; y[p] = v; const ff = inkSum(y); if (ff > yb) yb = ff; else y[p] = old; }
  assert.deepEqual(climbed, y, 'with a fit that does climb: the same 50 queries, the same kept changes');
  assert.ok(inkSum(climbed) > inkSum(D.noise(7)), 'and it climbed');
  assert.ok(climbed.filter((v, p) => v !== D.noise(7)[p]).length > 3);
});

test('antibodies: grown by k-modes, read under the node\'s energy, received in the sealed order', async () => {
  const text = D.antibodiesOf(real.x.slice(0, 30), 3, c.R, c.n), ab = D.abCellOf(text, c);
  assert.ok(text.startsWith('settling-cell.cell.v1 R=76 n=7\nsettling-cell.shape.v1 b=4 k=3 N=256 M=3\n'));
  assert.deepEqual([ab.R, ab.n, ab.M], [c.R, c.n, 3]);
  assert.equal(D.abCellOf('nope', c), null);
  assert.equal(D.abCellOf(C.cellText({ b: 1, k: 1, N: 64, mem: [new Uint8Array(64)], cls: [0] }, 8, 2), c), null, 'a cell of another size is refused');
  const A = await D.keyOf('node-A'), roster = [A.pub], gate = real.x.slice(100, 140);
  const sign = async (t) => { const bytes = utf8(t); return { bytes, sig: await K.sign(A, bytes), pub: A.pub }; };
  const ok = await D.receiveAntibodies(c, 0, await sign(text), roster, gate);
  assert.deepEqual([ok.adopted, ok.reason, ok.newRejects], [true, 'adopted', 0]);
  assert.ok(ok.ab);
  const harm = C.cellText({ b: 4, k: 40, N: 256, mem: gate.flatMap((x) => [C.settle(c, C.encode(x, 4)).state, C.settle(c, C.encode(x, 4)).state, C.settle(c, C.encode(x, 4)).state]), cls: new Array(120).fill(0) }, c.R, c.n);
  const h = await D.receiveAntibodies(c, 0, await sign(harm), roster, gate);
  assert.equal(h.reason, 'harms-genuine');
  assert.ok(h.newRejects > 1);
  assert.equal(h.adopted, false);
  const one = C.cellText({ b: 4, k: 3, N: 256, mem: [0, 0, 0].map(() => C.settle(c, C.encode(gate[0], 4)).state), cls: [0, 0, 0] }, c.R, c.n);
  const o = await D.receiveAntibodies(c, 0, await sign(one), roster, gate);
  assert.deepEqual([o.adopted, o.newRejects], [true, 1], 'exactly one new reject is allowed');
  const m = await sign(text), bent = m.bytes.slice(); bent[40] ^= 1;
  assert.equal((await D.receiveAntibodies(c, 0, { ...m, bytes: bent }, roster, gate)).reason, 'bad-signature');
  assert.equal((await D.receiveAntibodies(c, 0, m, [], gate)).reason, 'unknown-key');
  assert.equal((await D.receiveAntibodies(c, 0, await sign('junk'), roster, gate)).reason, 'not-a-cell');
});

test('prepare and evaluate, number for number on a training-file fixture, and every verdict', async () => {
  const p = await R.prepare({ train, nodeText }, cfg);
  assert.equal(p.th, '0');
  assert.equal(p.abHash, '7a0c8e690f008511d7a1230aa1a6259754319aec3abc32d53b023b5f966729e1');
  assert.equal(p.mimicFitsPassTheta, 0);
  assert.deepEqual(p.receive, { honest: { adopted: true, reason: 'adopted', newRejects: 0 }, forged: { adopted: false, reason: 'bad-signature', newRejects: 0 }, harmful: { adopted: true, reason: 'adopted', newRejects: 0 } });
  assert.equal(await R.prepare({ train, nodeText: 'nope' }, cfg), null);
  const r = await R.evaluate({ test: sub(56000, 40), nodeText, prep: p }, cfg);
  assert.deepEqual(r.genuine, { passPlain: 39, passWithAb: 39 });
  assert.deepEqual(r.floor, { T1: { refused: 6, reasons: ['bad-signature'] }, T2: { refused: 6, reasons: ['unknown-key'] }, T3: { refused: 6, reasons: ['bad-signature'] } });
  assert.deepEqual(r.attacks, { A1: { nonFit: 4, rejectedWithAb: 4, rejectedPlain: 4 }, A2: { nonFit: 6, rejectedWithAb: 6, rejectedPlain: 6 }, A3: { nonFit: 6, rejectedWithAb: 6, rejectedPlain: 6 }, A4: { nonFit: 6, rejectedWithAb: 6, rejectedPlain: 6 } });
  assert.equal(r.hash, '5b595d085d2f2d6847ca8480d66949ef82d52ca726c96ae9a8eafbb2d9d7eb04');
  assert.equal(await R.evaluate({ test: { x: [], y: [] }, nodeText, prep: p }, cfg), null);
  const v = R.verdicts(r, p);
  assert.deepEqual(v.map((x) => [x.id, x.pass]), [['D1', true], ['D2', false], ['D3', false], ['D4', true], ['D5', false]]);
  assert.deepEqual(v[1].measured, [0.975, 0.975]);
  const base = { ...r, digits: 100, per: 100, genuine: { passPlain: 98, passWithAb: 97 }, attacks: { A1: { nonFit: 99, rejectedWithAb: 99 }, A2: { nonFit: 99, rejectedWithAb: 99 }, A3: { nonFit: 99, rejectedWithAb: 99 }, A4: { nonFit: 0, rejectedWithAb: 90 } },
    floor: { T1: { refused: 100, reasons: ['bad-signature'] }, T2: { refused: 100, reasons: ['unknown-key'] }, T3: { refused: 100, reasons: ['bad-signature'] } } };
  const good = { ...p, receive: { ...p.receive, harmful: { adopted: false, reason: 'harms-genuine', newRejects: 5 } } };
  const pass = (rr, pp = good) => Object.fromEntries(R.verdicts(rr, pp).map((x) => [x.id, x.pass]));
  assert.deepEqual(pass(base), { D1: true, D2: true, D3: true, D4: true, D5: true }, 'every bar met exactly at its edge');
  assert.equal(pass({ ...base, genuine: { passPlain: 97, passWithAb: 97 } }).D2, false);
  assert.equal(pass({ ...base, genuine: { passPlain: 98, passWithAb: 96 } }).D2, false);
  for (const k of ['A1', 'A2', 'A3']) assert.equal(pass({ ...base, attacks: { ...base.attacks, [k]: { nonFit: 98, rejectedWithAb: 99 } } }).D3, false, k);
  assert.equal(pass({ ...base, attacks: { ...base.attacks, A4: { nonFit: 0, rejectedWithAb: 89 } } }).D4, false);
  assert.equal(pass({ ...base, adopted: false }).D4, false, 'no antibodies adopted, no inoculation');
  assert.equal(pass({ ...base, floor: { ...base.floor, T2: { refused: 99, reasons: ['admitted', 'unknown-key'] } } }).D1, false);
  assert.equal(pass({ ...base, floor: { ...base.floor, T1: { refused: 100, reasons: ['unknown-key'] } } }).D1, false, 'T1 must stop at the signature');
  assert.equal(pass({ ...base, floor: { ...base.floor, T3: { refused: 100, reasons: ['malformed'] } } }).D1, false);
  assert.equal(pass({ ...base, floor: { ...base.floor, T2: { refused: 100, reasons: ['bad-signature'] } } }).D1, false);
  assert.equal(pass(base, p).D5, false, 'a harmful share that was adopted fails D5');
  assert.equal(pass(base, { ...good, receive: { ...good.receive, forged: { adopted: false, reason: 'not-a-cell', newRejects: 0 } } }).D5, false);
  assert.equal(pass(base, { ...good, receive: { ...good.receive, honest: { adopted: false, reason: 'harms-genuine', newRejects: 2 } } }).D5, false);
  assert.deepEqual(R.verdicts(base, good).map((x) => x.bar), ['all, at the key or signature', 'at least 0.98, and at least 0.97', 'each at least 0.99', 'at least 0.9', 'adopted, bad-signature, harms-genuine']);
  assert.deepEqual(R.verdicts(base, good)[4].measured, ['adopted', 'bad-signature', 'harms-genuine (5 new rejects)']);
  assert.deepEqual(R.verdicts(base, good)[0].measured, ['T1 100/100 bad-signature', 'T2 100/100 unknown-key', 'T3 100/100 bad-signature']);
});
