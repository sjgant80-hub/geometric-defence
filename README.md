# Geometric defence

Live: **https://sjgant80-hub.github.io/geometric-defence/**

Rung 5 of the geometric ladder: **an attack is a shape that won't settle.** A signature floor on the raw bytes, then a
settling fit-check, against four validly signed attack families, with antibodies shared over the signed mesh.

## The result (the 10,000 MNIST test digits and held-out attacks, read once): 2 of 5 measured claims held

| | claim | measured |
|---|---|---|
| ✓ | D1 every tampered message refused before parsing | 900 of 900 |
| ✗ | D2 genuine digits pass (≥ 98%) | 97.71% |
| ✗ | D3 blind attacks rejected ≥ 99% each | noise 99.3%, inverted 100%, but scrambled only 36.0% |
| ✓ | D4 adaptive mimics rejected ≥ 90% | 98.7%, by zero fit alone: the antibodies added nothing |
| ✗ | D5 the harmful antibody share refused | it harmed nothing, so B's gate adopted it |

The lessons: the settled fit is flat inside a well, so a hill-climbing attacker has no gradient; but a scrambled digit
that settles into a real digit's well is, at the settled state, indistinguishable from one.

## Re-derive it

```bash
node --test test/defence.test.mjs test/page.test.mjs
node tools/prepare.mjs --check
node tools/eval.mjs --check
```

[`CLAIMS.md`](CLAIMS.md) (seal 1) · [`AMENDMENT.md`](AMENDMENT.md) · [`SEAL2.md`](SEAL2.md) · `data/record.json`.
MNIST, CC BY-SA 3.0. Powered by the Konomi architecture, created by Thomas Frumkin. MIT licence; credits in [`NOTICE`](NOTICE).
