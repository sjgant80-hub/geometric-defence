// src/run.mjs — Rung 5's two halves. prepare(): from training digits only, θ, node A's antibodies from tune-seed mimics,
// and node B's verdict on the honest, forged and harmful antibody shares. evaluate(): the held-out side, read once after
// seal 2 — genuine test digits, the floor's tampering, and the four held-out-seed attack families, every message signed
// and admitted before the cell sees it. Every claim is judged on whole counts. Pure and browser-safe.
import C from '../vendor/settling-cell/src/cell.mjs';
import * as K from '../vendor/living-seed/vendor/keys/keys.mjs';
import { sha256Hex, utf8 } from '../vendor/settling-cell/vendor/seed-library/sha256.mjs';
import { round6 } from '../vendor/settling-cell/vendor/seed-library/seedlib.mjs';
import D from './defence.mjs';

export const ROWS = Object.freeze({ tune: [50000, 52000], gate: [52000, 52200], harmful: [54000, 54300] });
const nodeOf = (text) => { const f = C.parseCell(text); return f && C.cell(f.shape, { R: f.R, n: f.n }); };
const signText = async (key, text) => { const bytes = utf8(text); return { bytes, sig: await K.sign(key, bytes), pub: key.pub }; };

/** prepare({ train, nodeText }) → θ, A's antibody text, and B's verdict on each antibody share (training digits only). */
export async function prepare({ train, nodeText }, cfg = D.CFG) {
  const c = nodeOf(nodeText);
  if (!c) return null;
  const th = D.theta(c, train.x.slice(...ROWS.tune));
  const mimics = Array.from({ length: cfg.per }, (_, i) => D.mimic(c, cfg.tuneSeed + i, cfg.queries));
  const abText = D.antibodiesOf(mimics, cfg.antibodies, c.R, c.n), harmfulText = D.antibodiesOf(train.x.slice(...ROWS.harmful), cfg.antibodies, c.R, c.n);
  const A = await D.keyOf('node-A'), roster = [A.pub], gate = train.x.slice(...ROWS.gate);
  const honest = await signText(A, abText), bent = honest.bytes.slice(); bent[40] ^= 1;
  const strip = ({ ab, ...v }) => v;
  return { th: String(th), abText, abHash: sha256Hex(abText), mimicFitsPassTheta: mimics.filter((m) => D.judge(c, null, th, m).verdict === 'pass').length,
    receive: { honest: strip(await D.receiveAntibodies(c, th, honest, roster, gate, cfg)), forged: strip(await D.receiveAntibodies(c, th, { ...honest, bytes: bent }, roster, gate, cfg)),
      harmful: strip(await D.receiveAntibodies(c, th, await signText(A, harmfulText), roster, gate, cfg)) } };
}

const count = (v, k) => v.filter((x) => x === k).length;
/** evaluate({ test, nodeText, prep }) → the held-out record. */
export async function evaluate({ test, nodeText, prep }, cfg = D.CFG) {
  const c = nodeOf(nodeText), th = Number(prep.th), ab = prep.receive.honest.adopted ? D.abCellOf(prep.abText, c) : null;
  if (!c || !test.x.length) return null;
  const A = await D.keyOf('node-A'), Cn = await D.keyOf('node-C'), roster = [A.pub], lines = [];
  const through = async (ink, tag, i) => {
    const m = await D.admit(await D.message(A, ink), roster);
    const a = D.judge(c, null, th, m.ink), b = D.judge(c, ab, th, m.ink);
    lines.push(tag + ' ' + i + ' ' + a.verdict + ' ' + b.verdict + ' ' + a.fit);
    return [a.verdict, b.verdict];
  };
  const genuine = [];
  for (let i = 0; i !== test.x.length; i++) genuine.push(await through(test.x[i], 'genuine', i));
  const floor = { T1: [], T2: [], T3: [] };
  for (let i = 0; i !== cfg.per; i++) {
    const good = await D.message(A, test.x[i]), bent = good.bytes.slice(); bent[i % 64] ^= 1;
    floor.T1.push((await D.admit({ ...good, bytes: bent }, roster)).reason);
    floor.T2.push((await D.admit(await D.message(Cn, test.x[i]), roster)).reason);
    floor.T3.push((await D.admit({ ...good, sig: (await D.message(A, test.x[i + cfg.per])).sig }, roster)).reason);
  }
  const fam = { A1: [], A2: [], A3: [], A4: [] };
  for (let i = 0; i !== cfg.per; i++) {
    fam.A1.push(await through(D.scrambled(test.x[i], cfg.heldSeed + i), 'A1', i));
    fam.A2.push(await through(D.noise(cfg.heldSeed + i), 'A2', i));
    fam.A3.push(await through(D.inverted(test.x[cfg.per + i]), 'A3', i));
    fam.A4.push(await through(D.mimic(c, cfg.heldSeed + i, cfg.queries), 'A4', i));
  }
  const pass = (v, j) => v.filter((x) => x[j] === 'pass').length;
  return {
    th: prep.th, abHash: prep.abHash, adopted: prep.receive.honest.adopted, per: cfg.per, digits: test.x.length,
    genuine: { passPlain: pass(genuine, 0), passWithAb: pass(genuine, 1) },
    floor: Object.fromEntries(Object.entries(floor).map(([k, v]) => [k, { refused: v.filter((x) => x !== 'admitted').length, reasons: [...new Set(v)].sort() }])),
    attacks: Object.fromEntries(Object.entries(fam).map(([k, v]) => [k, { nonFit: count(v.map((x) => x[0]), 'non-fit'), rejectedWithAb: v.length - pass(v, 1), rejectedPlain: v.length - pass(v, 0) }])),
    hash: sha256Hex(lines.join('\n') + '\n'),
  };
}

/** verdicts(r, prep) → each sealed claim beside its bar, on whole counts. */
export function verdicts(r, prep) {
  const n = r.digits, per = r.per, a = r.attacks, fl = r.floor, rc = prep.receive;
  const share = (x, d) => round6(x / d);
  const floorOk = ['T1', 'T2', 'T3'].every((k) => fl[k].refused === per);
  return [
    { id: 'D1', what: 'every tampered message refused before parsing', measured: ['T1', 'T2', 'T3'].map((k) => k + ' ' + fl[k].refused + '/' + per + ' ' + fl[k].reasons.join('+')), bar: 'all, at the key or signature', pass: floorOk && fl.T1.reasons.every((x) => x === 'bad-signature') && fl.T2.reasons.every((x) => x === 'unknown-key') && fl.T3.reasons.every((x) => x === 'bad-signature') },
    { id: 'D2', what: 'genuine test digits passing both layers: without antibodies, and with B\'s adopted antibodies', measured: [share(r.genuine.passPlain, n), share(r.genuine.passWithAb, n)], bar: 'at least 0.98, and at least 0.97', pass: 50 * r.genuine.passPlain >= 49 * n && 100 * r.genuine.passWithAb >= 97 * n },
    { id: 'D3', what: 'blind attacks rejected by non-fit: scrambled, noise, inverted', measured: ['A1', 'A2', 'A3'].map((k) => share(a[k].nonFit, per)), bar: 'each at least 0.99', pass: ['A1', 'A2', 'A3'].every((k) => 100 * a[k].nonFit >= 99 * per) },
    { id: 'D4', what: 'held-out mimics rejected with A\'s antibodies adopted', measured: share(a.A4.rejectedWithAb, per), bar: 'at least 0.9', pass: r.adopted && 10 * a.A4.rejectedWithAb >= 9 * per },
    { id: 'D5', what: 'the honest antibody share adopted after B\'s gate; the forged and the harmful shares refused', measured: [rc.honest.reason, rc.forged.reason, rc.harmful.reason + ' (' + rc.harmful.newRejects + ' new rejects)'], bar: 'adopted, bad-signature, harms-genuine', pass: rc.honest.adopted && rc.forged.reason === 'bad-signature' && !rc.forged.adopted && rc.harmful.reason === 'harms-genuine' && !rc.harmful.adopted },
  ];
}

export default { ROWS, prepare, evaluate, verdicts };
