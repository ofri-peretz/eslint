# ILB-Remediation — remediation coverage (declared vs implemented)

> Measurement D#16/D#18 of the security-benchmark leadership plan.
> A security linter's job is half done at detection; this bench measures the other
> half — can the tool help you FIX what it found — and whether remediation claims
> in rule metadata are real.

## What it measures

Per package (10 Interlace security plugins + 5 pinned free ESLint-native competitors):

| Field | Meaning |
|---|---|
| `fixableDeclared` / `fixableImplemented` | rules whose meta claims `fixable` / whose source actually passes a `fix` to `context.report()` |
| `suggestionsDeclared` / `suggestionsImplemented` | same split for `hasSuggestions` / `suggest:` |
| `deadFixableDeclarations`, `deadSuggestionDeclarations` | declared-but-never-emitting rules, **by name, on both sides** |
| `undeclaredSuggestionImpls` | inverse defect: emits suggestions without declaring (runtime-error risk) |

**Why the split exists:** `meta.fixable` with no `fix()` means `eslint --fix` silently
does nothing. Headline counts built on declarations alone are not comparable; this
bench makes the gap explicit — including for our own rules.

## Method (v1.0, source-level)

- Competitors are `require()`d at pinned versions (exact runtime meta) and their
  shipped rule sources are pattern-scanned for implementations.
- Interlace plugins are pattern-scanned in `src/rules/` with identical patterns.
- Patterns are in `run.mjs` (top of file). Known limitation: source-level detection
  can't prove a fixer is *reachable* on every code path. Runtime round-trip
  verification for Interlace fixers is `scripts/ilb-autofix-bench.ts` (cross-ref).
- Competitor set + versions: `package.json` here (mirrors
  `eslint-security-leadership/conditions/competitors.json`). Bumping either =
  `benchVersion` bump.

## Run

```bash
cd benchmarks/suites/ilb-remediation && npm install   # once — pinned competitors
node benchmarks/suites/ilb-remediation/run.mjs --print
```

Output: `benchmarks/results/ilb-remediation/<date>.json` + a row appended to
`benchmark-results/history.ndjson`. Envelope conforms to
`benchmarks/lib/result-schema.json` (`bench: "ILB-Remediation"`).

## Fairness notes

- Both sides are scanned with the same patterns; dead declarations are named
  publicly on both sides (ours included — listed per-package in every result
  file under `deadFixableDeclarations` / `deadSuggestionDeclarations`). The
  target state is zero on our side: declared == implemented for every plugin.
- SonarJS is excluded from v1.0: its security-rule subset is not mechanically
  separable from its 269 quality rules; including its whole-plugin remediation
  numbers would compare unlike scopes. Revisit in v1.1 with a defensible subset
  definition.
- Standalone SAST tools (CodeQL, Semgrep OSS) are out of scope here: this bench
  compares ESLint-native remediation (fix/suggest API). Their remediation stories
  (none in free tiers) are covered by the H-family landscape table.
