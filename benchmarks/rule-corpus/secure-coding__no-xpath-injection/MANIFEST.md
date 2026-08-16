# Rule corpus — `secure-coding/no-xpath-injection` (CWE-643)

**The question this corpus exists to answer:** `select` and `evaluate` are two
of the most reused verbs in the JavaScript ecosystem. Can a rule that owns them
as sink names tell an XPath evaluator from an NgRx store, a Knex query builder
and a feature-flag SDK?

This rule is named in the repo's own CLAUDE.md as a case study in name
inference — it once reported `export const QueryValidateSchema =
QueryInputSchema` as CWE-643 at CVSS 9.8. That specific defect is fixed
(`safe/06` locks it). This corpus asks whether the same class survives
elsewhere. It did, in the one place the earlier fix did not reach.

Fixtures 09–12 in each directory are the ADVERSARIAL wave, written after the
rule already scored 100% on 01–08.

## What it found

| # | Fixture | Defect | Resolution |
|---|---|---|---|
| 1 | `safe/04` | `store.pipe(select(selectUserProfile))` — NgRx — reported CWE-643 at CVSS 9.8 in a file containing no XML. The rule had already special-cased the MEMBER form `x.select(...)` to require an XPath-looking receiver, but a BARE `select(...)` had no gate at all, and `selectUserProfile` satisfied the taint check because it contains `user`. | Fixed — a bare-identifier sink now requires the identifier to resolve to an XPath package |
| 2 | `safe/05` | `evaluate(userContext)` — any feature-flag SDK — same shape, same CVSS 9.8. | Fixed by the same gate |
| 3 | `vulnerable/12`, `07` | `xpath.select1` — the xpath package's OTHER documented entry point — was not in the sink list. This did not merely miss the call: because a value whose every use is a non-sink is treated as PROVEN SAFE, the missing sink actively **suppressed** the concatenation finding on `vulnerable/07`, the textbook XML-login auth bypass. A gap in the sink list turning into a suppression is worse than a gap. | Fixed — `select1` added to the default sink list |
| 4 | `safe/10` | `return '//' + host + '/assets/' + asset` — a CDN href builder — reported. The rule already strips `://` so scheme-ful URLs were handled; the scheme-less protocol-relative form was not. | Fixed — the descendant axis now requires a node test immediately after `//`, which is what XPath's grammar requires anyway |

## The crash hypothesis: DISPROVEN

`reachesXpathSink()` recurses with no visited-set and no depth bound, and was
suspected of stack-overflowing on a cyclic binding chain. It does not, and
cannot: **the recursion is upward through `node.parent`**, which is a finite
acyclic chain terminating at `Program`. The two branches that resolve bindings
(`VariableDeclarator` inside `reachesXpathSink`, and `declarationReachesSink`)
do not recurse at all.

`vulnerable/11` (a self-referential `let head = tail; let tail = head` chain in
the same file as a live sink) and `safe/11` (the same chain with no sink, as the
positive control) are kept as the regression fixtures for this. Both terminate;
the vulnerable one reports; neither crashes.

## Documented, not fixed

- **A LOCAL no-op wearing a trusted name** — `function escapeXPath(v) { return
  v; }` — suppresses the finding. Judged NOT a defect: unlike `escape` or
  `sanitize`, `escapeXPath` names an XPath-specific contract, so a user who
  writes it and does not honour it has mislabelled their own code.
- **libxmljs2's `doc.get(...)` / `doc.find(...)`** are its XPath API but are not
  in the sink list, and must not be added by name — `map.get` and `array.find`
  are everywhere. `vulnerable/02` is still detected, via the concatenation path
  rather than the sink path.
- **`isUntrustedXpathInput` still substring-matches** the taint side
  (`varName.includes('user' | 'query' | 'search' | …)`). It is a REGISTERED
  entry in `scripts/lint-name-inference.ts`. The sink gate added here removes
  the two worst consequences of it; the taint arm itself is untouched.

## Verdict

Not vacuous. The remaining name inference is on the taint side and is registered
debt, not new debt.
