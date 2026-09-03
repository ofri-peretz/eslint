# Rule corpus — `secure-coding/no-format-string-injection` (CWE-134)

**The question this corpus exists to answer:** CWE-134 is "the FORMAT STRING is
attacker-controlled" — not "a value substituted into a constant format string is
attacker-controlled". The two look almost identical at a call site and are
opposites in meaning: the second one is the remediation. The rule had already
been corrected once on that point. Does it now find the real thing, and can it
tell the difference without reading identifier spellings?

It could not. Both halves failed, in the same direction each time: the verdict
was decided by what things were **called** rather than where the value came from.

## Layout

`vulnerable/` — must be reported at least once. `safe/` — must produce nothing.
Fixtures 01–06 and 01–06 are the first wave (written from the vulnerability);
07 onward are the adversarial wave, written to break a rule that had just scored
100%.

## What the corpus proved

| # | Fixture | Defect | Outcome |
|---|---|---|---|
| 1 | `safe/04-payment-logging.js` | `isUserInput` substring-matched the default `userInputVariables` list, which contains `data`, `params`, `request`, `input`. Measured: `console.error(paymentData, orderId)`, `console.info(validationParams, requestId)` and `util.format(metadata, id)` were all reported as attacker-controlled format strings | **Fixed** — exact membership on whole names; a dotted path is asked the same question one SEGMENT at a time, so `request.body.layout` still resolves |
| 2 | `vulnerable/04-ts-cast.ts` | `req.query.pattern as string` was invisible. Express's query type (`string \| string[] \| ParsedQs`) forces that cast at nearly every read, so the typed half of the ecosystem went unreported | **Fixed** — `unwrapTypeSyntax` before the check |
| 3 | `vulnerable/07-destructured-util-format.js` | The sink was the spelling `util.format`. `const { format } = require('node:util')` — the form Node's own documentation uses — made it vanish | **Fixed** — `isModuleBinding(callee, scope, 'util', ['format'])`; an aliased import counts, a local helper called `format` does not |
| 4 | `vulnerable/08-ternary-fallback.ts` | `flag ? DEFAULT : req.query.fmt` and `req.query.fmt ?? DEFAULT` were both quiet, so the finding could be deleted by the commit that adds a default | **Fixed** — both branches of a conditional / logical expression are checked |
| 5 | `vulnerable/09-destructured-query.js` | The declarator visitor returned immediately unless the id was a plain Identifier, so `const { fmt } = req.query` — the idiomatic Express read — carried the taint nowhere | **Fixed** — every name a pattern binds is taken from the scope manager |
| 6 | `vulnerable/10-reassigned-let.js` | A re-assignment is not a declaration. A `let` declared with a safe constant stayed trusted no matter what was written into it afterwards | **Fixed** — an `AssignmentExpression` writing user input marks the binding; `safe/09-constant-let.js` pins the other direction, where every write is a literal |

Every fix is locked by a regression block at the end of
`packages/eslint-plugin-secure-coding/src/rules/no-format-string-injection/no-format-string-injection.test.ts`.
All of them were verified failing against the rule as it stood before.

## What is still decided by a name, and why it was left

`hasSpecifiersInFormat` reads `varName.includes('format' | 'template' |
'pattern')` to guess that an identifier holds a format string. It is the site
already registered in `scripts/lint-name-inference.ts` for this rule, direction
`report`. It was left alone deliberately: removing the name test without a
replacement makes the whole `missingFormatValidation` path either dead (if the
gate is dropped) or a flood (if it is replaced by "any non-constant first
argument"), since `console.log(label, payload)` is one of the most common lines
in JavaScript. It needs a specifier analysis this rule does not have, not a
one-line substitution.

Its practical reach shrank anyway: the two suite fixtures that used to arrive at
`missingFormatValidation` through that name now arrive at
`userControlledFormatString` through the taint, which is both the more accurate
message and the one that does not offer the `.replace(/%/g, '%%')` suggestion.

## Deliberate recall gaps

- `util.format(String(req.query.fmt), t)` and `util.format(sanitize(req.query.fmt), t)`
  are both quiet. A call's return value has provenance the rule cannot see from
  one site — the same reasoning `no-sql-injection` documents for its own call
  exclusion, where an escaper and a builder are indistinguishable at the call.
- A function parameter as the tainted root (`function render(pattern, actor)`)
  is not reported. Nothing in the file establishes where `pattern` came from.

## Judgement on the rule

Not vacuous, and materially better than it was: it now fires on the canonical
CWE-134 shape written the way Node, Express and sprintf-js write it — including
through a cast, a destructure, a re-assignment, a fallback and a destructured
import — and it stays quiet on the mitigation, on single-argument `console.log`,
on a catalogue lookup and on Winston. The remaining name-driven branch is
documented above rather than hidden.
