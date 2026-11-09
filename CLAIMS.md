# geometric-defence · sealed claims (seal 1, before any code of this repository)

Rung 5 of the geometric substrate ladder: **an attack is a shape that won't settle, rejected by non-fit, on top of
the kept crypto floor; antibodies inoculate the mesh.** Every bar is fixed here. A claim that misses its bar is kept and
published as failed.

## Built on the rungs below, byte for byte

- Rung 1's cell kernel (sjgant80-hub/settling-cell `src/cell.mjs`, sha256
  590c8307b06148dbfa7c2e4a247336441e150d8235d62783c45efb53190d9101) with the seed-library rng and SHA-256.
- Rung 3's MNIST conversion (sjgant80-hub/hybrid-gate `src/mnist.mjs`, sha256
  d2e0d4faa5b3b927a0261e1def5620df317fa3925ab32fb0cb3d80a1605b3616).
- Rung 4's node B after its exchange, the defended node (sjgant80-hub/mesh-share `data/cell-after.txt`, sha256
  1cd61bfbf39377e39e4ed80135da2032d1d0b0028badd68d51858c5238ab5758).
- The estate's Ed25519 keys (sjgant80-hub/living-seed `vendor/keys/keys.mjs` and `canon.mjs`, as pinned in mesh-share).

## The two layers

- **A message** is a digit image as 64 bytes (ink 0..16), an Ed25519 signature over exactly those bytes, and a public key.
- **The crypto floor (kept from Rung 4):** the key must be on the node's roster and the signature must verify over the
  raw bytes **before anything is parsed**. Then every byte must be 0..16.
- **The geometric layer:** the node settles the image. Its **fit** is the settled energy's depth (−E). An image whose
  fit is below **θ** does not fit anything the node knows and is **rejected (non-fit)**. θ is the 1st percentile of the
  fits of 2,000 genuine tune digits (MNIST training rows 50,000–51,999).
- **Antibodies:** a second set of stored patterns describing an attack family. An image that passed θ is still
  **rejected (antibody)** when its fit to the antibodies is at least its fit to the node's own patterns, both read at
  the same settled state under the node's energy.

## The attacks (every one validly signed, as if from a stolen key that the crypto floor cannot stop)

- **A1 scrambled:** a genuine digit's 64 values shuffled (the same ink, the wrong shape).
- **A2 noise:** 64 uniform values 0..16.
- **A3 inverted:** 16 − each value of a genuine digit.
- **A4 mimic (adaptive):** starts from A2 noise and hill-climbs for 300 queries: each query sets one random pixel to a
  random value and keeps the change only if the node's settled fit rises. An attacker who can query the defence.
- **Tampering, for the floor:** (T1) one byte changed under the original signature; (T2) signed by a key not on the
  roster; (T3) a signature from the right key over different bytes.
- Seeds: tune attacks 60,000 + i; held-out attacks 70,000 + i. 300 of each attack family per side; 300 of each
  tampering kind on the held-out side.

## Inoculation over the mesh

- **Node A** sees 300 tune-seed mimics, grows 10 antibody patterns from them (Rung 1's deterministic k-modes), signs
  the antibody set, and shares it.
- **Node B** (the defended node, which has never seen a mimic) receives it in the sealed order: roster and signature
  over the raw bytes first, then parse, then **B's own gate**: on 200 of B's own genuine tune digits (MNIST training
  rows 52,000–52,199), the antibodies may newly reject at most 1. Only then does B adopt.
- A forged antibody share (one byte changed) and a **harmful** one (antibodies grown from B-class genuine digits,
  validly signed by A) must both be refused.

## The claims (held-out: the 10,000 MNIST test digits, and held-out-seed attacks)

The MNIST test digits were read before, by Rungs 3 and 4, for different claims. Nothing in this repository has read them.

- **D1 · the floor.** Every T1, T2 and T3 message is refused before parsing; none reaches the cell.
- **D2 · genuine digits pass.** Without antibodies, at least 98.0% of test digits pass both layers; with B's adopted
  antibodies, at least 97.0%.
- **D3 · blind attacks don't settle.** A1, A2 and A3 are each rejected by non-fit (θ) at least 99.0% of the time.
- **D4 · inoculation works.** With A's antibodies adopted, B rejects at least 90.0% of held-out-seed mimics (A4).
- **D5 · inoculation is earned.** B adopts A's honest antibody share only after its own gate; the forged share and the
  harmful share are both refused.
- **D6 · deterministic.** The whole record hashes the same twice, on GitHub's runner and in a browser tab.
- **D7 · the page.** No measured number is typed into `index.html`.
- **D8 · the data.** The MNIST files and every vendored file are byte-identical to the pins.
- **G · the gate on the code.** witness v0.6 on this repository's kernels: CLEAN, nothing baselined. CI green.

Also measured and reported, with no bar: the share of mimics that θ alone rejects. That number is the defence's honest
weak point without antibodies.

## What Rung 5 is not

Not a fabric of many nodes under loss (Rung 6), not on a chip (Rung 7). It does not defend against a stolen key's
genuine-looking digits, physical tampering, or supply-chain firmware.
