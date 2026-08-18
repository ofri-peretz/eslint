# `SEAL.json` — what a rule is sealed to, and where it is still open

**Sealed is a terminal state.** A sealed rule is state of the art on every axis
of the doctrine and is not reopened — with two documented escapes, which is what
makes the claim survivable:

1. **It is stamped with the versions it was sealed against.** JS/TS grow new
   syntax; a rule sealed against ES2022 has never seen a node type that ES2027
   introduces. The stamp says what the claim covers instead of pretending it
   covers everything forever.
2. **It enumerates its known gaps.** A gap that is written down, bounded and
   argued is a different object from one nobody has found. Recording one does
   not disqualify a seal; hiding one does.

One `SEAL.json` per rule, beside the corpus that backs it. Every claim in it
carries the command that produced the number, so a reader can re-run it and a
gate can check the file has not gone stale.

## Shape

```jsonc
{
  "rule": "<plugin>/<rule>",
  "status": "sealed" | "open",          // "open" is the honest default
  "sealedOn": "YYYY-MM-DD",             // null while open
  "sealedTo": {
    "ecmaVersion": 2022,                // the parser setting the corpus runs at
    "typescript": "6.0.3",
    "eslint": "10.8.1",
    "plugin": "eslint-plugin-x@4.3.0",
    "node": "24"
  },
  "axes": {                             // one entry per axis of the doctrine
    "<axis>": {
      "state": "met" | "unmet" | "n/a",
      "evidence": "the number, in one line",
      "command": "how to reproduce it"
    }
  },
  "knownGaps": [
    {
      "id": "short-slug",
      "kind": "false-negative" | "false-positive" | "partition" | "scope" | "performance",
      "limit": "L1",            // an ID from ANALYSIS-LIMITS.md, or null while it is open work
      "summary": "one line",
      "why": "why it is acceptable to ship with this, or what blocks the fix",
      "reopenWhen": "the condition that turns this back into work"
    }
  ]
}
```

## Gaps cite a limit, or they are backlog

Every gap carries a `limit` from [`ANALYSIS-LIMITS.md`](../../ANALYSIS-LIMITS.md)
— the registry of the things single-file AST analysis cannot do, named as the
program-analysis literature names them: intraprocedural scope, type-unaware
analysis, flow- and path-insensitivity, absent points-to analysis, unmodeled
library semantics, configuration invisibility, reflection opacity,
undecidability, corpus incompleteness, measurement resolution.

`limit: null` is legitimate and means one thing: **this is open work, not a
boundary of the method.** `lint:seal` therefore refuses `status: "sealed"` while
any gap is unclassified. A rule is finished when every residual gap cites a
limit — not when it is perfect, but when the boundary is written down.

```bash
npm run limits              # which limits we hit, where, how often
npm run limits -- L1        # every gap citing it — "was I here before?"
npm run limits -- --open    # the gaps citing nothing: the real backlog
```

That is what makes the knowledge accumulate. A session that ends with a new gap
classified has moved the rule forward even if it changed no code, because the
next session does not re-derive the same conclusion.

## The axes

A seal claims all nine. `n/a` is allowed and must be justified in `evidence`
(a rule with no competitor cannot win a duel against one).

| Axis | Met when |
| :--- | :--- |
| `corpus` | fixtures written from the VULNERABILITY and from real idiom, never from the rule's own tests |
| `duel` | scored against the corpus, and against every competitor that ships a comparable rule |
| `adversarial` | a second wave written to BREAK the tuned rule found nothing new |
| `realSource` | measured on code we did not write, every finding labelled with a reason |
| `partition` | every sink shape probed with the whole CWE family enabled — exactly one report, from the right rule |
| `behaviour` | 11/11 on `scripts/rule-seal-probe.mts` |
| `coverage` | 100%, from istanbul JSON rather than the summary line |
| `throughput` | timed at 500 / 2000 / 8000 lines; linear is fine, quadratic is a defect |
| `recorded` | present in `benchmarks/RULE-SCORES.md` AND `BENCHMARK-RESULTS.md` (§D5) |

## `CASES.json` — the other half

`SEAL.json` records the STATE of a rule. `CASES.json`, beside it, records the
DECISIONS: every shape the rule takes a position on, identified by a structural
signature rather than by file and line, so the same decision recurring in a
fifteenth repository is recognised as the decision it already is.

```jsonc
{
  "rule": "<plugin>/<rule>",
  "cases": [
    {
      "id": "<messageId>-<signature>",
      "signature": "9af4510d2997",   // sha256 of messageId | shape | loop context
      "verdict": "enforce" | "exempt" | "unreviewed",
      "shape": "Call(Mem(Id.createUnzip);)",
      "why": "why this verdict, in prose a reviewer can disagree with",
      "examples": [ { "repo": "...", "file": "...", "line": 551, "source": "..." } ]
    }
  ]
}
```

A run then splits four ways, and only two need a human:

| bucket | meaning |
| :--- | :--- |
| confirmed | known `enforce` — the rule is doing its job |
| backlog | known `unreviewed` — filed, not yet adjudicated |
| **REGRESSION** | known `exempt` reported again — we already decided, and the rule changed its mind. Blocks. |
| **NEW** | no case has this signature — the actual news |

```bash
npm run cases -- <plugin>/<rule>            # classify against the ledger
npm run cases -- <plugin>/<rule> --update   # file NEW as unreviewed
```

**This finds false positives and regressions, not false negatives.** Nothing in
a list of findings tells you what was missed. FN evidence comes from the corpus
`vulnerable/` fixtures (the duel fails when one goes quiet), from the adversarial
wave, and from diffing a competitor over the same files. The two halves together
cover both directions; either alone does not.

**Exempt cases accumulate forward.** A signature can only be captured from a
finding that actually happened, so the shapes fixed before this ledger existed
are not in it — they live in the rule's LOCK comments and its test suite
instead. From here on, the sequence is: a shape reports, it is filed
`unreviewed`, a human rules `exempt`, the fix lands, and the entry stays as the
tripwire that catches the rule changing its mind.

## The gate

```bash
npm run lint:seal          # every SEAL.json: schema, stamp drift, status honesty
```

It refuses a `status: "sealed"` whose axes are not all `met`/`n/a`, and it
refuses a stamp that no longer matches the installed toolchain — which is how a
seal announces that the language moved rather than quietly rotting.
