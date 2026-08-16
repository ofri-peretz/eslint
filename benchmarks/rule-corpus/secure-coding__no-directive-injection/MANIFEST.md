# Rule corpus — `secure-coding/no-directive-injection` (CWE-96)

**The question this corpus exists to answer:** CWE-96 is static code injection —
attacker-controlled text reaching a place that PARSES it (a template compiler,
`innerHTML`, `dangerouslySetInnerHTML`, a directive registration). Every fixture
here is written from that sink, in the idiom of the library that owns it, and
never from the rule's tests.

The answer, before any change: the rule reported on what values were **called**
and missed the vulnerability itself. Both directions were measured, and the two
were the same defect seen from either side.

- `Handlebars.compile(userInput)` — reported.
- `Handlebars.compile(req.body.template)` — **silent**. Every template sink
  required a bare `Identifier` whose name contained one of the option words, so
  the member expression that IS the vulnerability was never considered.
- `chart.innerHTML = renderMetadata(series)` — **reported**, because the
  innerHTML site searched the printed source of the expression for `data`, and
  `Metadata` contains it.

Baseline over the first wave (8 vulnerable / 6 safe): **TP 4 / FP 1 / FN 4 —
precision 80.0%, recall 50.0%, F1 61.5%**.

## Layout

`vulnerable/` — must be reported at least once. `safe/` — must produce nothing.
Fixtures 01–08 are the first wave, written from the vulnerability; 09–10 are the
adversarial wave, written to break the rule after it reached 100%.

## What the corpus proved

| # | Fixture | Defect | Outcome |
|---|---|---|---|
| 1 | `vulnerable/01-handlebars-compile.js`, `03-lodash-template.js` | The template sinks only accepted a bare Identifier, so the canonical `Handlebars.compile(req.body.template)` and `_.template(req.query.tpl)` were silent | **Fixed** — a single structural `isUserInputExpression` used at every report site: member chains, template literals, concatenations, conditionals, and one binding hop resolved through the scope manager |
| 2 | `safe/10-chart-legend.js` | `innerHTML` and `dangerouslySetInnerHTML` matched the option words against `sourceCode.getText(expression)`. `renderMetadata(series)` and `buildLegend(seriesMetadata)` were CWE-96 findings | **Fixed** — the same predicate, read off the AST; whole names only, and a CallExpression is not attributable |
| 3 | `safe/11-user-prefixed-names.jsx` | `isUserInput` also returned true for `varName.startsWith('user')`, which is every `userAgent`, `username` and `userPreferences` in every React codebase | **Fixed** — removed with the substring test |
| 4 | `vulnerable/07-ts-cast.ts` | `req.query.tpl as string` was invisible, and Express's query type forces that cast at nearly every read | **Fixed** — `unwrapTypeSyntax` |
| 5 | `vulnerable/02-binding-hop.js`, `09-innocuous-names.js` | Taint did not survive a `const` hop unless the new binding was also NAMED like user input | **Fixed** — resolved through `scope.variables` and the write references, so two hops with bland names still resolve, and a binding whose every write is a literal (`safe/08-let-with-literal-writes.js`) does not |
| 6 | `vulnerable/11-parameter-root.js` | A function parameter as the tainted root was caught only when it was SPELLED `userInputTemplate`; rename it to `templateSource` and detection died. A rendering service whose HTTP layer lives in another module is the ordinary shape | **Fixed** — the scope manager's definition kind decides. Confined to the compiler sinks, where `compile` has exactly one safe usage; NOT applied to `innerHTML`, where a parameter is the normal shape of a DOM helper whose caller sanitized |
| 7 | `vulnerable/08-template-literal-innerhtml.js` | `el.innerHTML = ` `` `<p>${req.body.name}</p>` `` produced TWO reports for one line — the assignment visitor and the TemplateLiteral visitor both fired | **Fixed** — the TemplateLiteral visitor stands down when the owning payload is itself attributable, and keeps the case the owning visitors cannot see (`el.innerHTML = wrap(`…`)`) |

Every fix is locked by a regression block at the end of
`packages/eslint-plugin-secure-coding/src/rules/no-directive-injection/no-directive-injection.test.ts`,
all verified failing against the rule as it stood before.

## What is still decided by a name, and why it was left

`findUnsafeSanitizerConfig` requires the receiver's name to contain `purify`
before it will look at a DOMPurify config. It is the site already registered in
`scripts/lint-name-inference.ts` for this rule, direction `suppress`, with the
observation that `notPurifiedYet` qualifies as sanitised. Left in place: the
registry is the agreed record for it, and `scripts/` is out of scope here.

## Deliberate recall gaps

- `Handlebars.compile(loadTemplate(tenantId))` and
  `el.innerHTML = sanitize(req.body.html)` are both quiet. A call's return value
  has provenance the rule cannot see from one site — the same reasoning
  `no-sql-injection` documents, where an escaper and a builder are
  indistinguishable at the call. It is also what keeps the DOMPurify fixtures
  from being reported as the vulnerability they remediate.
- A function parameter as the tainted root is not reported. `vulnerable/09`
  passes `req` itself, which is why it resolves.

## Judgement on the rule

It was close to vacuous for its own headline weakness: the CWE-96 sink written
the way Handlebars, lodash and EJS document it was silent, and what did fire was
mostly a naming convention. It is not vacuous now — it reports the compiler
sinks through a member chain, a cast, a ternary and two binding hops, and it is
quiet on the constant-template remediation, on `textContent`, on React's default
escaping and on a correctly configured sanitizer.
