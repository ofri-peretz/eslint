# What a rule is allowed to claim about severity

> **Decision, 2026-08-22.** A rule states the **weakness class** it detects and
> **how much a developer should care**. It does not state a CVSS score.
>
> Status: accepted, migration in progress. Supersedes the implicit convention
> that every security rule carries a `cvss` number.

---

## The problem this decision closes

Three independent inconsistencies, all measured on the built plugins:

| | |
|---|---:|
| Messages rendering both a CVSS score and a severity label | 432 |
| …where the label disagrees with the band the score defines | **165 (38.2%)** |
| Messages where `meta.docs.cvss` and the message's own CVSS both exist | 362 |
| …where those two numbers disagree | **92 (25.4%)** |

A single rule could therefore carry three mutually inconsistent severity
statements. `react-a11y/alt-text` did:

```
♿ CWE-252 OWASP:A10-Mishandling CVSS:5.3 | Image missing alt text | CRITICAL
                                  ▲                                  ▲
                                  │                                  │
                          MEDIUM band                     labelled CRITICAL
```

…while `meta.docs.cvss` on the same rule said **9.5**.

The instinct is to treat this as 165 data-entry errors. It is not. The numbers
disagree because **one of them was never knowable**, and a field nobody can
compute will always drift from the fields they can.

---

## Why a lint rule cannot have a CVSS score

Three reasons, in increasing order of how much they settle the question.

### 1. CVSS scores a vulnerability, not a weakness class

CWE is a taxonomy of weakness *types*. CVSS Base metrics describe a *specific
vulnerability in a specific product*. There is no CVSS score for "SQL
injection"; there is a CVSS score for a particular SQL injection in a particular
release of a particular application.

So `CWE_MAPPING`'s `cvss` field is a category error at the root. It holds a
plausible number for a *typical* instance of the class, formatted so it reads
as a measurement of *this* finding.

### 2. A rule cannot compute the metrics that dominate the score

The Base score is driven by Attack Vector, Attack Complexity, Privileges
Required, User Interaction and Scope. Every one of those is a property of the
**deployment**, not of the syntax:

| metric | what it needs to know | what the rule sees |
|---|---|---|
| Attack Vector | is this reachable from the network? | a call expression |
| Privileges Required | who can reach the handler? | a function body |
| Scope | does this cross a security boundary? | one file |

The same templated `db.query()` call is a critical remote vulnerability in an
Express route and a non-issue in a build script that reads its own repo. Our
rules are explicitly single-file and intraprocedural — that limitation is
already written down in [`ANALYSIS-LIMITS.md`](../ANALYSIS-LIMITS.md) as L1 and
L3. A score that depends on cross-boundary reachability is exactly the thing
those limits say we cannot see.

### 3. The label is defined by the score, so rendering both is never right

CVSS v3.1 defines its qualitative rating (None / Low / Medium / High /
Critical) as a **function of the base score**. The two are not independent
opinions to be reconciled.

That makes the pairing a dilemma with no good branch:

- when they agree, the label is redundant — it adds no information the number
  did not already carry;
- when they disagree, it is not a judgment call, it is a spec violation.

Today 38.2% land on the second branch. There is no third branch where rendering
both is informative.

---

## The decision

**A rule states two things, and both are things it can actually know.**

### 1. `cwe` — the weakness class

This is precisely what a pattern matcher identifies: *this shape belongs to this
class of weakness*. It is class-to-class, so it is well-formed. Keep it, and
keep the `owasp` mapping alongside it for the same reason — OWASP Top 10
categories are weakness classes too, so CWE → OWASP is a legitimate
class-to-class mapping.

For rules whose subject is not security, the field for the standard that *does*
govern them. Accessibility rules carry `wcag` and no CWE — see
[#610](https://github.com/ofri-peretz/eslint/pull/610), where all 37 rules in
`eslint-plugin-react-a11y` had claimed CWE-252, "Unchecked Return Value".

### 2. `severity` — how much a developer should care

Our own scale, defined below, and the **single** source of severity. Not derived
from a score, not accompanied by one.

| level | meaning | what a developer does |
|---|---|---|
| `CRITICAL` | the rule proved a dangerous value reaches a dangerous sink | stop and fix |
| `HIGH` | exploitable in the common deployment for this API | fix before release |
| `MEDIUM` | needs a precondition the rule cannot verify (L1/L3) | fix when you touch it |
| `LOW` | hygiene, maintainability, style | fix opportunistically |

**Severity belongs to the finding, not to the class.** Two rules citing the same
CWE may legitimately differ: one that proves the taint path earns `CRITICAL`,
one that flags a risky-looking shape without proving reachability does not.
This is the property a per-CWE score can never express, and it is why the label
is the field worth keeping.

### 3. `cvss` — removed

Not rendered in messages, and removed from `meta.docs` and `CWE_MAPPING`.

### What replaces it, for anyone who wants a number

- **`confidence`** (`high` / `medium` / `low`) already exists in the meta schema
  and is the honest per-rule number: it describes *our precision*, which the
  ILB-Confidence bench measures, rather than an attacker's difficulty, which we
  cannot. Currently set on 56 of 566 rules — raising that is the follow-on work.
- **A numeric severity for dashboards is a deployment-time concern.** SARIF's
  `security-severity` is the right place for it, derived from our label by the
  formatter, where the consumer's context is at least closer to hand. Our SARIF
  formatter does not emit `security-severity` today, so nothing downstream
  breaks by removing `cvss` — verified.

---

## How this compares to the field

Roughly where the mature tools sit, as background rather than as authority:

- **Semgrep** rules carry a severity plus metadata for `cwe`, `owasp`,
  `confidence`, `likelihood` and `impact` — no CVSS score.
- **CodeQL** carries `problem.severity` and `precision`; the numeric
  `security-severity` is a *tag consumed by GitHub code scanning* to bucket
  alerts, not a claim the query makes about a deployment.
- **SonarQube** moved away from a single severity number toward impact
  severity plus clean-code attributes.

The common shape is: **state the class, state your confidence, do not publish a
number you cannot compute.** That is the practice this decision adopts.

---

## Migration

Scope: 566 rules, of which 340 declare a CWE, 317 a `meta.docs.cvss`, and 307
render `CVSS:` in a message.

| phase | change | status |
|---|---|---|
| **0** | `npm run lint:severity-consistency` ratchets the 165 contradictions: a new one fails the build, and so does a registry entry whose rule no longer contradicts | **done** ([#611](https://github.com/ofri-peretz/eslint/pull/611)) |
| **1** | stop rendering `CVSS:` in the message. Closes all 165 at once and asserts no new numbers | next |
| **2** | audit `severity` against the scale above, rule by rule, now that it is the only claim | after 1 |
| **3** | remove `cvss` from `meta.docs` and `CWE_MAPPING`; the whole-run formatter and docs site read it today, so this is a minor-version change with a deprecation note | after 2 |
| **4** | raise `confidence` coverage from 56/566, calibrated against the ILB-Confidence bench | ongoing |

Phase 1 is deliberately the *removal* of a claim rather than a restatement of
165 numbers. Removing a field we cannot justify needs no per-rule adjudication;
restating it would mean inventing 165 new values with the same problem.

---

## The general principle

> **Do not publish a number you cannot compute.**

An unfounded claim is not neutral. It drifts from the claims that *are*
founded — which is exactly how the 38.2% and the 25.4% arose — and when a
maintainer notices one wrong severity, they stop trusting the ones that were
right. The README's own FP/FN section makes the same argument about findings:
an ignored tool has zero recall regardless of what it detects. Metadata is
subject to the same rule.

See also: [`META_HYGIENE.md`](./META_HYGIENE.md),
[`QUALITY_STANDARDS.md`](./QUALITY_STANDARDS.md),
[`ANALYSIS-LIMITS.md`](../ANALYSIS-LIMITS.md), and
`scripts/lint-severity-consistency.ts`.
