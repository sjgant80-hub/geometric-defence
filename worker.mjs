// worker.mjs — the held-out side, off the page's thread: src/run.mjs's evaluate on the frozen defence, in this tab.
import M from './vendor/hybrid-gate/src/mnist.mjs';
import R from './src/run.mjs';
const get = async (p, gz) => { const r = await fetch(new URL(p, import.meta.url)); if (!r.ok) throw new Error(p + ' answered ' + r.status); return gz ? new Uint8Array(await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()) : r.text(); };
self.onmessage = async (m) => {
  const q = m.data || {};
  try {
    const [img, lab, nodeText, abText, prep] = await Promise.all([get('./data/mnist/t10k-images-idx3-ubyte.gz', 1), get('./data/mnist/t10k-labels-idx1-ubyte.gz', 1), get('./vendor/mesh-share/data/cell-after.txt'), get('./data/antibodies.txt'), get('./data/prep.json')]);
    const t0 = performance.now(), record = await R.evaluate({ test: M.parse(img, lab), nodeText, prep: { ...JSON.parse(prep), abText } });
    self.postMessage({ id: q.id, ok: !!record, record, ms: Math.round(performance.now() - t0), why: record ? '' : 'the record did not compute' });
  } catch (e) { self.postMessage({ id: q.id, ok: false, why: String((e && e.message) || e).slice(0, 200) }); }
};
