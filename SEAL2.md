# Seal 2 · the defence frozen, before the test digits are read

Committed after seal 1 (`CLAIMS.md`, d5e1bfe) and amendment 1 (`AMENDMENT.md`, 4084eea). Everything below came from
MNIST training digits only. **No code in this repository has read the MNIST test file.** The next commit runs
`tools/eval.mjs` once, which refuses to run unless this file names the three hashes marked below.

## What is frozen

- **The defended node:** `vendor/mesh-share/data/cell-after.txt`, sha256 **1cd61bfbf39377e39e4ed80135da2032d1d0b0028badd68d51858c5238ab5758** (Rung 4's node B).
- **θ = 0**, with amendment 1: zero fit is always non-fit.
- **A's antibodies:** `data/antibodies.txt`, sha256 **31e829f90a9a040368742698176bc3fb712a4202060d9003c7cc1a008f1d1294**, 10 patterns grown from 300 tune-seed mimics.
  Of those 300 mimics, only 3 had any fit after 300 queries: the settled fit is flat inside each well, so the climb gets no gradient.
- **The tune-side record:** `data/prep.json`, sha256 **a62b3e03fbeabd878f9a629f82b9ef0281a4c700bf51ef123826dfb29f7c1b98**. B's verdicts on the three antibody shares:
  honest **adopted** (0 genuine gate digits newly rejected); forged **bad-signature**; and the "harmful" share, grown from genuine
  digits, **adopted** (0 newly rejected). That last one means D5 will fail as sealed: B's gate found no harm, and let it in.

## The code, frozen here

| file | sha256 | mutation gate (witness v0.6) |
|---|---|---|
| `src/defence.mjs` | 28baa6c110822e827c1264b2f469bafdb69787ce86b80c8cd3807d4fa388e9a6 | 17 of 17 caught, 0 baselined |
| `src/run.mjs` | b58a070bebd2f2bad67d0df1a27a54213ece61ca56e6f235e54ac11c5c49f59b | 28 of 28 caught, 0 baselined |

The tune side re-derives byte for byte (`node tools/prepare.mjs --check`).
