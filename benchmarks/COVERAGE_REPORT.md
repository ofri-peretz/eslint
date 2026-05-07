# ILB Coverage & Inter-Rater Report

> Generated: 2026-05-03 · Methodology: [`benchmarks/ILB_NAMING.md`](./ILB_NAMING.md)
>
> Closes the OWASP-Benchmark-style trust gap by reporting three orthogonal validation signals that do not depend on labels alone.

## 1. Inter-rater agreement (the OWASP-style trust signal)

For each fixture, we count how many tools' verdicts match the fixture's label.

### ILB-Juliet (synthetic CWE corpus)

- Tools rated: **6** — `interlace`, `eslint-plugin-security`, `security-node`, `sonarjs`, `microsoft-sdl`, `no-unsanitized`
- Fixtures rated: **26**
- Fixtures where **≥ 3 tools agree** with the label: **15 (57.7%)**
- Fixtures where **all tools agree** with the label: **9 (34.6%)**

#### Cohen's κ — Interlace vs each competitor (Juliet)

```
< 0.2  slight    · 0.2–0.4 fair · 0.4–0.6 moderate ·
0.6–0.8 substantial · 0.8–1.0 almost perfect · 1 perfect
```

| Competitor | κ | Interpretation |
|---|---|---|
| no-unsanitized | 0.154 | slight |
| sonarjs | 0.077 | slight |
| microsoft-sdl | 0.077 | slight |
| eslint-plugin-security | 0 | slight |
| security-node | 0 | slight |

### ILB-Arena (function-level fixtures)

- Tools rated: **18**
- Fixtures rated: **77**
- Fixtures where **≥ 3 tools agree**: **67 (87%)**
- Fixtures where **all tools agree**: **0 (0%)**

#### Cohen's κ — Interlace vs each competitor (Arena)

| Competitor | κ | Interpretation |
|---|---|---|
| sonarjs | 0.21 | fair |
| microsoft-sdl | 0.07 | slight |
| security-node | 0.065 | slight |
| no-secrets | 0.048 | slight |
| no-unsanitized | 0.022 | slight |
| eslint-plugin-security | 0 | slight |
| react | 0 | slight |
| jsx-a11y | 0 | slight |
| import | 0 | slight |
| promise | 0 | slight |
| jest | 0 | slight |
| vue | 0 | slight |
| angular | 0 | slight |
| regexp | -0.028 | worse than chance |
| eslint-plugin-n | -0.03 | worse than chance |
| jsdoc | -0.052 | worse than chance |
| unicorn | -0.072 | worse than chance |

## 2. Over-fit detector — fixtures only Interlace catches

If Interlace is the **only** tool to catch a vulnerable fixture, that's
either a real coverage advantage (good) or a fixture written to match our
rule (bad). These deserve human triage.

### ILB-Juliet — vulnerable fixtures only Interlace caught

- CWE-022 / path-join-user.js
- CWE-022 / readfile-concat.js
- CWE-089 / dynamic-column.js
- CWE-089 / string-concat.js
- CWE-089 / template-literal.js
- CWE-918 / axios-user-url.js
- CWE-918 / fetch-user-url.js

### ILB-Arena — vulnerable fixtures only Interlace caught

_(none)_

## 3. Coverage breadth — corpus depth per CWE

A CWE with fewer than 2 vulnerable + 2 safe fixtures is too thin for
its F1 to be meaningful (CI is too wide).

| CWE | Vulnerable | Safe | Status |
|---|---|---|---|
| CWE-022 | 2 | 2 | ✓ |
| CWE-078 | 2 | 2 | ✓ |
| CWE-079 | 2 | 2 | ✓ |
| CWE-089 | 3 | 3 | ✓ |
| CWE-798 | 2 | 2 | ✓ |
| CWE-918 | 2 | 2 | ✓ |

✅ Every CWE meets the ≥2 fixture threshold.

## How to read this

- **High Cohen's κ with sonarjs / microsoft-sdl** = our verdicts agree with the most credible commercial tools.
- **High % of "≥3 tools agree" fixtures** = the corpus has clear ground truth, not edge cases that even tools disagree on.
- **Empty over-fit list** = our TPs are consistently caught by other plugins too — we're not testing fictional patterns.
- **No coverage gaps** = every CWE has enough fixtures to draw conclusions from.

If any of these degrade over time, regenerate this report and triage the new entries.
