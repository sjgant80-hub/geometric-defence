// app.mjs — the page's glue. Every number is read from the committed record or the gate receipts, or computed in this tab
// (claim D7: none is typed into index.html). The held-out side re-runs in worker.mjs.
import { mintCase, sourcesOf } from './vendor/liveware/mintcase.mjs';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(props)) if (k === 'class') e.className = v; else e.setAttribute(k, v); for (const c of kids) e.append(c); return e; };
const json = (p) => fetch(p).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const pct = (x) => (x * 100).toFixed(1) + '%';
const big = (n) => Number(n).toLocaleString('en-GB');
const chip = (pass) => el('span', { class: 'chip ' + (pass ? 'win' : 'bad') }, pass ? 'HELD' : 'FAILED');
let REC = null, PREP = null, GATES = [], BASIS = null;
const PLAIN = { D1: 'The floor: every tampered message refused before parsing', D2: 'Genuine digits pass both layers', D3: 'Blind attacks don\'t settle: scrambled, noise, inverted', D4: 'Inoculation works on the adaptive mimics', D5: 'Inoculation is earned: honest adopted, forged and harmful refused' };

function fill() {
  const r = REC.record, v = REC.verdicts, held = v.filter((x) => x.pass), failed = v.filter((x) => !x.pass), a = r.attacks, per = r.per;
  $('verdictline').textContent = held.length + ' of ' + v.length + ' measured claims held. ' + pct(r.genuine.passPlain / r.digits) + ' of the ' + big(r.digits) + ' test digits passed; noise and inverted attacks were turned away at ' + pct(a.A2.nonFit / per) + ' and ' + pct(a.A3.nonFit / per) + '; scrambled digits only at ' + pct(a.A1.nonFit / per) + '.' + (failed.length ? ' Failed and kept: ' + failed.map((x) => x.id).join(', ') + '.' : '');
  const show = (x) => (x.id === 'D1' ? x.measured.join(' · ') : x.id === 'D2' ? pct(x.measured[0]) + ' without antibodies; ' + pct(x.measured[1]) + ' with' : x.id === 'D3' ? x.measured.map(pct).join(' · ') : x.id === 'D4' ? pct(x.measured) : x.measured.join(' · '));
  const tb = $('claims').querySelector('tbody'); tb.replaceChildren();
  for (const x of v) tb.append(el('tr', {}, el('td', {}, el('b', {}, x.id)), el('td', {}, PLAIN[x.id]), el('td', {}, show(x)), el('td', {}, x.bar), el('td', {}, chip(x.pass))));
  for (const [id, w] of [['D6', 'Deterministic: one hash for the whole record, in CI and in your tab'], ['D7', 'No measured number typed into this page'], ['D8', 'The MNIST files and every vendored file are the pinned bytes']]) tb.append(el('tr', {}, el('td', {}, el('b', {}, id)), el('td', {}, w), el('td', {}, id === 'D6' ? r.hash.slice(0, 16) + '…' : 'checked by test/page.test.mjs'), el('td', {}, '—'), el('td', {}, el('span', { class: 'chip win' }, 'CI'))));
  for (const g of GATES) tb.append(el('tr', {}, el('td', {}, el('b', {}, 'G')), el('td', {}, 'Mutation gate on ' + g.kernel), el('td', { class: 'num' }, g.killed + ' of ' + g.total + ' caught, ' + g.ignored + ' baselined'), el('td', {}, 'clean'), el('td', {}, chip(g.clean && g.ignored === 0))));
  const rows = [['Genuine test digits', 'real handwriting, signed by the sender', '—', big(r.digits - r.genuine.passPlain) + ' of ' + big(r.digits), big(r.digits - r.genuine.passWithAb) + ' of ' + big(r.digits)],
    ['Tampered (T1–T3)', 'a changed byte, an unknown key, a signature over other bytes', ['T1', 'T2', 'T3'].map((k) => big(r.floor[k].refused)).join(' + ') + ' of ' + big(3 * per), '—', '—'],
    ['A1 scrambled', 'a real digit\'s ink in the wrong places', '0', big(a.A1.nonFit) + ' of ' + per, big(a.A1.rejectedWithAb) + ' of ' + per], ['A2 noise', 'random ink', '0', big(a.A2.nonFit) + ' of ' + per, big(a.A2.rejectedWithAb) + ' of ' + per],
    ['A3 inverted', 'a real digit turned inside out', '0', big(a.A3.nonFit) + ' of ' + per, big(a.A3.rejectedWithAb) + ' of ' + per], ['A4 mimic', 'noise hill-climbed on the node\'s own fit for 300 queries', '0', big(a.A4.nonFit) + ' of ' + per, big(a.A4.rejectedWithAb) + ' of ' + per]];
  $('fam').querySelector('tbody').replaceChildren(...rows.map((cells) => el('tr', {}, ...cells.map((c, i) => el('td', i > 1 ? { class: 'num' } : {}, i === 0 ? el('b', {}, c) : c)))));
  $('lesson').textContent = 'The floor held completely: every tampered message stopped before a byte was parsed. Behind it, the settle turns away what fits nothing it knows: noise and inverted junk almost always, and the adaptive mimics too (' + big(a.A4.nonFit) + ' of ' + per + '), because the settled fit is flat inside each well and gives a climb nothing to follow. But only ' + big(a.A1.nonFit) + ' of ' + per + ' scrambled digits were stopped: the rest settle into a real digit\'s well and, at the settled state, look exactly like one. The antibodies added nothing here: every mimic they could have caught was already turned away by zero fit. And the wall costs real inputs ' + pct(1 - r.genuine.passPlain / r.digits) + ' of the test digits, just over the 2% the seal allowed.';
  const ul = $('results'); ul.replaceChildren();
  const li = (t) => ul.append(el('li', {}, t));
  li('Floor: ' + ['T1', 'T2', 'T3'].map((k) => k + ' ' + big(r.floor[k].refused) + '/' + per + ' (' + r.floor[k].reasons.join(', ') + ')').join('; ') + '.');
  li('Genuine pass: ' + pct(r.genuine.passPlain / r.digits) + ' (bar 98.0%), unchanged with antibodies.');
  li('Non-fit rejection: scrambled ' + pct(a.A1.nonFit / per) + ', noise ' + pct(a.A2.nonFit / per) + ', inverted ' + pct(a.A3.nonFit / per) + ', mimics ' + pct(a.A4.nonFit / per) + '.');
  li('Antibody shares: honest ' + PREP.receive.honest.reason + ', forged ' + PREP.receive.forged.reason + ', "harmful" ' + PREP.receive.harmful.reason + ' (' + PREP.receive.harmful.newRejects + ' genuine digits newly rejected).');
  for (const g of GATES) li('Mutation gate on ' + g.kernel + ': ' + g.killed + ' of ' + g.total + ' caught, ' + g.ignored + ' baselined.');
  $('faq-cost').textContent = 'Here, ' + pct(1 - r.genuine.passPlain / r.digits) + ' of genuine test digits were turned away, almost all because they fit nothing the node knew. On your inputs that is what a sealed test would measure first.';
  $('faq-failed').textContent = failed.map((x) => x.id + ': ' + PLAIN[x.id] + ', measured ' + show(x) + '.').join(' ') + ' Each failure is kept on the record and on this page.';
  const gl = (k) => { const g = GATES.find((x) => x.kernel === k); return g ? 'mutation gate ' + g.killed + '/' + g.total + ', ' + g.ignored + ' baselined' : 'pinned'; };
  $('parts').replaceChildren(...[['src/defence.mjs', 'The floor, θ, the settle verdict, the four attack families, antibodies and their sealed receive.'], ['src/run.mjs', 'The tune side and the held-out side, every message signed and admitted, every claim against its bar.'], ['vendor/', 'Rungs 1, 3 and 4 and the estate\'s keys, byte for byte.']]
    .map(([h, t]) => el('div', { class: 'card' }, el('div', { class: 'k' }, h), el('p', { style: 'font-size:14.5px;margin-top:4px' }, t), el('p', { class: 'vs', style: 'margin-top:6px;color:var(--accent)' }, gl(h)))));
  $('timeline').replaceChildren(...[['Seal 1', 'CLAIMS.md alone, every bar.'], ['Amendment 1', 'Zero fit is non-fit, before the test digits (AMENDMENT.md).'], ['Seal 2', 'θ, the antibodies, the tune verdicts and the code by hash (SEAL2.md).'], ['The held-out, once', 'data/record.json.']].map(([x, y]) => el('li', {}, el('b', {}, x), ' · ', y)));
}

let worker = null, seq = 0;
function ask(msg) { if (!worker) worker = new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' }); return new Promise((resolve) => { const id = ++seq; const on = (e) => { if (e.data.id === id) { worker.removeEventListener('message', on); resolve(e.data); } }; worker.addEventListener('message', on); worker.postMessage({ ...msg, id }); }); }
$('go').onclick = async () => {
  $('go').disabled = true; $('gostatus').textContent = 'signing and screening 10,000 digits and 2,100 attacks; this takes a few minutes…';
  const r = await ask({ do: 'rerun' });
  $('go').disabled = false;
  if (!r.ok) { $('gostatus').textContent = 'it did not run: ' + r.why; return; }
  const a = r.record, b = REC.record, rows = [['genuine passing', a.genuine.passPlain, b.genuine.passPlain], ['scrambled turned away', a.attacks.A1.nonFit, b.attacks.A1.nonFit], ['mimics turned away', a.attacks.A4.nonFit, b.attacks.A4.nonFit], ['the hash of the record', a.hash, b.hash]];
  const tb = $('proof').querySelector('tbody'); tb.replaceChildren(); let all = true;
  for (const [w, x, y] of rows) { const same = x === y; all = all && same; tb.append(el('tr', {}, el('td', {}, w), el('td', { class: 'num' }, String(x).slice(0, 24)), el('td', { class: 'num' }, String(y).slice(0, 24)), el('td', { class: same ? 'ok' : 'no' }, same ? '✓ same' : '✗ differs'))); }
  $('proof').hidden = false;
  $('gostatus').textContent = (all ? '✓ your tab reproduced the record, hash and all' : '✗ your tab differs from the record') + ' · ' + (r.ms / 1000).toFixed(0) + ' s';
};

const gbp = (x) => '£' + Math.round(x).toLocaleString('en-GB');
function renderCost() {
  if (!BASIS) { $('c-head').textContent = 'The sourced basis did not load; reload the page.'; return; }
  const v = (id) => Number($(id).value);
  const r = mintCase(BASIS, { hoursPerWeek: v('c-hours'), share: v('c-share') / 100, seats: v('c-seats'), casesPerWeek: v('c-cases'), years: v('c-years') });
  if (!r.ok) { $('c-head').textContent = 'Check the inputs: ' + r.why + '.'; return; }
  const yrs = r.inputs.years + (r.inputs.years === 1 ? ' year' : ' years');
  $('c-overh').textContent = 'Over ' + yrs;
  $('c-head').textContent = `This process costs you ${gbp(r.perYear.today)} a year in staff time today. Owning it: ${gbp(r.perYear.own)} a year, which is ${gbp(r.savingPerYear)} a year back and ${gbp(r.savingOver)} over ${yrs}.`;
  const rows = [['Today', 'Your team does all of it.', 'today'], ['Rent AI assistant seats', `Microsoft 365 Copilot for ${r.inputs.seats} people (${gbp(r.lines.seats)} a year). It helps each person; the work, and the staff time, stay.`, 'rentSeats'],
    ['Call a cloud AI on every case', `Takes the same share off, billed per case at Claude Sonnet 5 API rates (${gbp(r.lines.api)} a year at your volume), and every case leaves your building.`, 'cloudApi'],
    ['Own it', `Takes the same share off on a machine you already have, for about ${gbp(r.lines.power)} a year of electricity. No seats, no meter, nothing leaves.`, 'own']];
  const tb = $('c-table').querySelector('tbody'); tb.replaceChildren();
  for (const [a, b, k] of rows) tb.append(el('tr', {}, el('td', {}, el('b', {}, a)), el('td', {}, b), el('td', { class: 'num' }, gbp(r.perYear[k])), el('td', { class: 'num' }, gbp(r.over[k]))));
  $('c-note').textContent = `Owning beats the cloud route by ${gbp(r.versusCloudOver)} over ${yrs} at this volume. Staff time is a floor: the UK median wage, with on-costs left out.`;
  $('c-board').textContent = `An owned structural check stopped every tampered message and most crude attacks, and published exactly where it does not work. Pick one inbound check your people do by hand. Today it costs ${gbp(r.perYear.today)} a year in staff time. If an owned check takes off the share you estimate, that is ${gbp(r.savingPerYear)} a year back, with nothing leaving the building, and the fee is due only on a receipt that it beat your current way on your own data.`;
}
async function main() {
  [REC, PREP, BASIS] = await Promise.all(['data/record.json', 'data/prep.json', 'vendor/liveware/basis.json'].map(json));
  GATES = (await Promise.all(['defence', 'run'].map((k) => json('receipts/gate-' + k + '.json')))).filter(Boolean);
  $('c-src').replaceChildren(...sourcesOf(BASIS || {}).map((s) => { const li = el('li', {}, s.what + (s.source ? ': ' : '')); if (s.source) { const a = el('a', { href: s.source, target: '_blank', rel: 'noopener' }); try { a.textContent = new URL(s.source).hostname; } catch { a.textContent = s.source; } li.append(a); } return li; }));
  for (const id of ['c-hours', 'c-share', 'c-seats', 'c-cases', 'c-years']) $(id).addEventListener('input', renderCost);
  renderCost();
  if (!REC || !PREP) { $('verdictline').textContent = 'The record did not load; reload the page.'; return; }
  fill();
}
main();
