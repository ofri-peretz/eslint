# Rule corpus — `secure-coding/no-unsafe-regex-construction` (CWE-400)

**The question this corpus exists to answer:** this rule deliberately narrowed
itself so it would not be a strict superset of `detect-non-literal-regexp` — it
reports only what it can ATTRIBUTE to a named source. Does that narrowing still
cover the shapes real handlers are written in, or did it narrow past them?

The answer on the first measurement was: it narrowed past the single most
common one. `new RegExp(req.query.pattern)` reported; `const filter =
req.query.filter; new RegExp(filter)` did not, and nobody writes the first form.

Fixtures 09–12 in each directory are the ADVERSARIAL wave, written after the
rule already scored 100% on 01–08.

## What it found

| # | Fixture | Defect | Resolution |
|---|---|---|---|
| 1 | `vulnerable/02` | One binding hop killed detection. The provenance is fully attributable — a single write, from `req.query.filter` — so this was not a deliberate abstention, it was a miss on the dominant shape. | Fixed — scope-analysis resolution of the identifier's writes |
| 2 | `vulnerable/11` | The conditional-override idiom (`let p = DEFAULT; if (req.query.p) p = req.query.p`) still missed after the first fix, because a multi-write binding was skipped wholesale. | Fixed — every write examined; one tainted write taints |
| 3 | `safe/07` | `new RegExp(RegExp.escape(x))` reported. `'RegExp.escape'` was on the trusted-function list but the list is compared against an Identifier callee's `.name`, and no identifier is spelled with a dot — **the entry was unreachable for the entire life of the rule.** It is the ES2025 built-in and the exact remediation the rule's own suggestion open-codes. | Fixed — recognised structurally |
| 4 | `safe/10` | `const esc = require('escape-string-regexp'); new RegExp(esc(x))` reported. Correctly escaped code, flagged because the author picked a short local name. | Fixed — `ESCAPER_PACKAGES` via `resolveModuleBinding` |
| 5 | `vulnerable/09` | `escape` and `sanitize` were DEFAULT-trusted escapers. Neither escapes a regex metacharacter — the global `escape()` is percent-encoding, under which `.` `*` `+` `(` `[` `\|` all survive — so the rule was blessing a live ReDoS. And because both names are generic, any local `function sanitize(v) { return v.trim(); }` switched the rule off. | Fixed — both removed from the defaults; still configurable |
| 6 | `vulnerable/10` | `const Pattern = RegExp; new Pattern(req.query.q)` was not a RegExp construction. | Fixed — alias resolved through scope, with the shadowing case (`safe/11`) kept quiet |
| 7 | `safe/12` | **The most important one.** `const request = Object.freeze({ query: { pattern: '^GET /v1/' } }); new RegExp(request.query.pattern)` reported — three literals declared in the same file, flagged because the binding is *spelled* `request`. | Fixed — the name still selects the candidate, the BINDING decides: a real request arrives as a handler parameter or as a free variable, never as a local declaration with an initialiser |

## Documented, not fixed

- **Destructured request parameters.** `router.get('/x', ({ query }, res) =>
  new RegExp(query.pattern))` is missed. Fixing it needs the rule to know the
  enclosing function is a request handler, which is exactly the inference this
  rule was rebuilt to avoid. Genuinely ambiguous; left alone.
- **`new RegExp(fs.readFileSync(p, 'utf8').trim())`** is missed — a reader
  method's result loses its provenance through a following string method. The
  `await response.text()` form (`vulnerable/06`) is detected.

## Verdict

Not vacuous. After these fixes the taint side resolves bindings rather than
reading spellings, which is what makes the rule's claim — "reports what it can
attribute" — true rather than aspirational.
