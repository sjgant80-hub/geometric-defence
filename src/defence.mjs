// src/defence.mjs — Rung 5: two layers in front of the settling cell. The crypto floor (kept from Rung 4) checks the
// roster and the Ed25519 signature over the raw bytes before anything is parsed. The geometric layer settles the image:
// below θ it fits nothing the node knows (non-fit); at or above θ it can still be claimed by an antibody well. Antibodies
// are shared over the signed mesh and adopted only after the receiver's own gate. Sealed first: CLAIMS.md (d5e1bfe).
import C from '../vendor/settling-cell/src/cell.mjs';
import * as K from '../vendor/living-seed/vendor/keys/keys.mjs';
import { rng } from '../vendor/settling-cell/vendor/seed-library/seedlib.mjs';
import { sha256Bytes, utf8 } from '../vendor/settling-cell/vendor/seed-library/sha256.mjs';

export const CFG = Object.freeze({ pctile: 1, per: 300, queries: 300, tuneSeed: 60000, heldSeed: 70000, antibodies: 10, maxNewRejects: 1 });

/** keyOf(name) → a seeded Ed25519 identity: SHA-256("geometric-defence/" + name). */
export const keyOf = (name) => K.fromSeed(sha256Bytes(utf8('geometric-defence/' + name)));
/** message(key, ink) → { bytes: the 64 ink values, sig over exactly those bytes, pub }. */
export async function message(key, ink) {
  const bytes = Uint8Array.from(ink);
  return { bytes, sig: await K.sign(key, bytes), pub: key.pub };
}
/** admit(msg, roster) → the crypto floor: { ok, reason, ink }. Roster and signature first, on the raw bytes; then parse. */
export async function admit(msg, roster) {
  if (!roster.includes(msg.pub)) return { ok: false, reason: 'unknown-key' };
  if (!(await K.verify(msg.pub, msg.sig, msg.bytes))) return { ok: false, reason: 'bad-signature' };
  if (msg.bytes.length !== 64 || msg.bytes.some((v) => v > 16)) return { ok: false, reason: 'malformed' };
  return { ok: true, reason: 'admitted', ink: Array.from(msg.bytes) };
}

/** theta(c, inks, pct) → the pct-th percentile of the genuine fits: fits sorted, the value at ⌊pct·n/100⌋. */
export function theta(c, inks, pct = CFG.pctile) {
  const f = inks.map((ink) => C.settle(c, C.encode(ink, 4)).fit).sort((a, b) => a - b);
  return f[Math.floor((pct * f.length) / 100)];
}
/** judge(c, ab, th, ink) → the geometric layer's verdict: 'non-fit' below θ, 'antibody' when the antibodies hold at least
 *  as much fit at the same settled state, else 'pass'. */
export function judge(c, ab, th, ink) {
  const st = C.settle(c, C.encode(ink, 4));
  if (st.fit < th || st.fit === 0) return { verdict: 'non-fit', fit: st.fit, abFit: 0 };   // amendment 1: zero fit is non-fit
  const abFit = ab ? C.energyOf(ab, C.distances(ab, st.state)) : 0;
  return { verdict: ab && abFit >= st.fit ? 'antibody' : 'pass', fit: st.fit, abFit };
}

/** The attack families. */
export const scrambled = (ink, seed) => C.scrambled(ink, seed);
export function noise(seed) { const r = rng(seed); return Array.from({ length: 64 }, () => Math.floor(r() * 17)); }
export const inverted = (ink) => ink.map((v) => 16 - v);
/** mimic(c, seed, queries, fitOf) → the adaptive attack: from noise, keep each one-pixel change that raises the fit the
 *  attacker can query (the node's settled fit unless a test passes another). */
export function mimic(c, seed, queries = CFG.queries, fitOf = (ink) => C.settle(c, C.encode(ink, 4)).fit) {
  const r = rng(seed + 1), ink = noise(seed);
  let best = fitOf(ink);
  for (let q = 0; q !== queries; q++) {
    const p = Math.floor(r() * 64), v = Math.floor(r() * 17), old = ink[p];
    ink[p] = v;
    const f = fitOf(ink);
    if (f > best) best = f; else ink[p] = old;
  }
  return ink;
}

/** antibodiesOf(inks, k, R, n) → the cell text of k antibody patterns grown from the attack inks (Rung 1's k-modes). */
export function antibodiesOf(inks, k, R, n) {
  const mem = C.growClass(inks.map((ink) => C.encode(ink, 4)), k);
  return C.cellText({ b: 4, k, N: 256, mem, cls: mem.map(() => 0) }, R, n);
}
/** abCellOf(text, c) → the antibody cell, read under the node's own reach and power; null if the text is not a cell. */
export function abCellOf(text, c) {
  const f = C.parseCell(text);
  return f && f.shape.N === c.N ? C.cell(f.shape, { R: c.R, n: c.n }) : null;
}
/** receiveAntibodies(c, th, msg, roster, gateInks) → the sealed order: roster and signature on the raw bytes, then
 *  parse, then the node's own gate (at most maxNewRejects of its genuine gate digits newly rejected). */
export async function receiveAntibodies(c, th, msg, roster, gateInks, cfg = CFG) {
  if (!roster.includes(msg.pub)) return { adopted: false, reason: 'unknown-key', newRejects: 0 };
  if (!(await K.verify(msg.pub, msg.sig, msg.bytes))) return { adopted: false, reason: 'bad-signature', newRejects: 0 };
  const ab = abCellOf(new TextDecoder().decode(msg.bytes), c);
  if (!ab) return { adopted: false, reason: 'not-a-cell', newRejects: 0 };
  let newRejects = 0;
  for (const ink of gateInks) if (judge(c, null, th, ink).verdict === 'pass' && judge(c, ab, th, ink).verdict !== 'pass') newRejects++;
  return newRejects <= cfg.maxNewRejects ? { adopted: true, reason: 'adopted', newRejects, ab } : { adopted: false, reason: 'harms-genuine', newRejects };
}

export default { CFG, keyOf, message, admit, theta, judge, scrambled, noise, inverted, mimic, antibodiesOf, abCellOf, receiveAntibodies };
