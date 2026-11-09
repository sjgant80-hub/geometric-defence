# Amendment 1 to seal 1, made before the test digits were read

`CLAIMS.md` (seal 1, d5e1bfe) is unchanged and stays the contract. **No bar moved, no claim was reworded, and the MNIST
test file had not been read.**

## What the tune side showed

The sealed θ is the 1st percentile of 2,000 genuine tune fits. Under the defended node (Rung 4's node B), **1.9% of those
genuine digits have a fit of exactly zero**, so the 1st percentile is 0, and "fit below θ" means "fit below zero", which
never happens. The non-fit layer would reject nothing. On tune data:

| input | zero fit | 1st percentile | 5th percentile | median |
|---|---|---|---|---|
| genuine (rows 50,000–51,999) | 1.9% | 0 | 14,645,194,571,776 | 19,263,935,557,031 |
| scrambled | 49.3% | 0 | 0 | 14,645,230,950,792 |
| noise | 99.7% | 0 | 0 | 0 |
| inverted | 100.0% | 0 | 0 | 0 |

## The change

**Zero fit is always non-fit:** an image is rejected as non-fit when its fit is below θ **or is zero**. This is Rung 1's
own definition (zero fit means it fits nothing the cell knows, and gives no answer); the sealed wording missed the case
where ties at zero make the percentile zero. The genuine-pass bars (98.0% and 97.0%) are unchanged, and with 1.9% of
genuine tune digits at zero fit, D2 is now at real risk of failing.

## Seen on the tune side, before the test digits

Half of the scrambled digits fit as well as genuine ones, so D3 for scrambled digits is expected to fail. On 40 tune-seed
mimics, θ alone rejected none, and antibodies grown from 30 of them rejected the other 10 at a 2.8% cost to genuine
tune digits.
