---
"eslint-plugin-node-security": minor
---

`no-self-signed-certs` is now part of the `recommended` preset.

`rejectUnauthorized: false` accepts any certificate, including a MITM's
self-signed one, and is the most-cited Node TLS mistake there is. The rule
already detected it correctly — it simply was not in any preset, so nobody
running `recommended` had it enabled. ILB-CWE-Corpus scored CWE-295 as a miss
for that reason alone.

Measured over the 13-repo wild corpus (~1,900 files of real Express and NestJS
code) before promoting: **0 findings**. Pure recall, no false-positive cost.
Ecosystem corpus score moves TP 51 → 52, FN 18 → 17, FP unchanged at 11.
