# Why the false positives survived every gate

Measured 2026-08-22, after ~30 findings from 22 real repositories were read in source.
Roughly 29 of the 30 were false positives. This repository has three measurement
layers and **all three are closed loops** — none was positioned to be surprised by
code we did not write.

## 1. The CWE corpus scores us against ourselves

`benchmarks/corpus/` is 154 fixtures, authored here, laid out as `vulnerable/` and
`safe/` twins per CWE. On it we score:

| tool | precision | recall | F1 |
| --- | ---: | ---: | ---: |
| Interlace | 100.0 | 100.0 | 100.0 |
| sonarjs | 75.0 | 39.1 | 51.4 |
| eslint-plugin-security | 58.8 | 14.5 | 23.3 |

69 TP, **0 FP**, 0 FN. That is not a benchmark result so much as a tautology: the
fixtures were written to the rules. The 60 "safe" fixtures are the safe version of
the vulnerable one — the near-miss we had already thought of.

Real code produces near-misses nobody thought of, and none of them can be in the
corpus, because writing them requires already knowing about them:

- `Function` imported from `aws-cdk-lib/aws-lambda`
- an X.509 `x5t` thumbprint, which Azure AD *mandates* be SHA-1
- a `/healthz` probe, which is required to be unauthenticated
- an RFC 6749 OAuth body, character-identical to a query string
- `nock('http://…')` in a test
- RFC 7662 introspection, which validates more strongly than `verify()`

Comparing peers against our own corpus also flatters us by construction: they are
scored on fixtures shaped to our rules. That caveat belongs anywhere the table is
published.

## 2. Unit tests only ever contain code that already looks like the target

Every fixture for `jwt-security/require-algorithm-whitelist` names the receiver
`jwt`. No test in that suite could reveal that the rule keys on `.verify(` and fires
on `this.verify(changes, [], facts)` in a repo with no JWT anywhere. The same shape
holds fleet-wide, which is why `benchmarks/fp-gate/` exists.

## 3. The real-code gate exists, works, and was ratcheted to accept the problem

`ILB-Corpus-Truth` is the one honest instrument: 107 repositories pinned by SHA,
107,384 files, and it already found the failure mode — one finding in three was about
an SDK the file never imports (2026-08-10). Four plugins were fixed on that number and
off-SDK fell from ~34% to 10.2%. That worked.

But the baseline was then set **to current behaviour**, and a ceiling is not a budget:

    28 of 151 rules carry a non-zero off-SDK allowance
    642 off-SDK findings are permanently permitted
    224  lambda-security/no-exposed-debug-endpoints
    181  lambda-security/no-error-swallowing
     39  nestjs-security/no-exposed-private-fields
     33  lambda-security/no-missing-authorization-check

The gate is green today and will stay green at exactly this level forever. A ratchet
stops things getting worse; nothing in it ever forces them to get better.

**Caveat that must travel with those numbers:** `offSdk` is an upper bound by
construction — the probe's notion of "the SDK is present" is deliberately independent
of the rule's gate. `fileIsLambda` accepts a union (a handler export, the
`(event, context)` convention, or an AWS import) because 45% of real handlers import
nothing AWS. So a high `offSdk%` is a *lead*, not a verdict. Each one still has to be
read before it is called a false positive — twice this session a confident FP claim
turned out to be a measurement artefact.

## What actually breaks the loop

`benchmarks/fp-gate/` is the only artifact here drawn from a population we did not
author: every case lifted from a real repository, provenance recorded, read by hand
before it was added. Eight cases found what 154 fixtures and ~3,400 unit tests missed.

Two things follow:

1. **Turn the off-SDK ceiling into a decreasing budget with a date on it.** A number
   that can only stay flat is not a gate.
2. **Keep harvesting.** Every finding read in source is either a true positive worth a
   PR or a corpus entry that protects the next release. There is no third outcome,
   and it is the only loop here with an outside input.
