# Intent — calling a tainted variable `cleanPath` turns the rule off

> Stage 1 artifact. Opened after demonstrating the suppression on a shipped
> security rule.

**Status:** shipped · **Opened:** 2026-09-03 · **Shipped:** 2026-09-03 · **Owner:** @ofri-peretz

---

## What is wanted

A rule stops reporting because it sees EVIDENCE that the risk was handled — an
escaping call, a validator, an allowlist — never because a binding was given a
reassuring name.

## Why now

`lint:name-inference` registers 55 sites where a rule decides from an
identifier's spelling. **26 of them decide to SUPPRESS**, and that direction is
not symmetrical with the other 30: a name that causes a report produces a false
positive somebody will notice and complain about. A name that causes silence
produces a false negative nobody will ever see.

Demonstrated on `node-security/no-arbitrary-file-access`, shipped and enabled
by default. The taint is identical in all four — `req.query.f` straight into
`fs.readFileSync` — and only the variable name changes:

```
const userPath      = req.query.f  ->  1 finding
const cleanPath     = req.query.f  ->  0
const safePath      = req.query.f  ->  0
const validatedPath = req.query.f  ->  0
```

The rule withholds on `/^(safe|sanitized|validated|clean)/i`. Nothing was
sanitized. The registry already records this entry as "costs recall"; what it
does not record is that the cost is a **CWE-22 path traversal reported as
clean**, and that any developer reaching for a tidy variable name triggers it
by accident.

This is the rename litmus the project already applies to detection — _rename
every binding to `foo`/`bar`; does the rule still work?_ — applied to
suppression, where it has never been run.

## Constraints

- **Some name-based suppression is legitimate** and must survive: a parameter
  called `sanitizedHtml` arriving from another function has no visible
  initializer, and refusing to trust anything would flood the noise floor.
  The distinction is whether the code CONTRADICTS the name.
- **The registry stays.** It is the record of where this decision is made; the
  change is to what the entries do, not to whether they are listed.
- **Report-direction entries are out of scope here.** They are the other 30 and
  a different trade — a wrong report is visible.
- **Precision must not fall.** These rules were calibrated against a corpus
  with a zero false-positive budget per CWE, and a suppression removed without
  care will breach it.

## Success criteria

- **Now:** 26 suppress-direction sites · at least one demonstrably silences a
  real CWE-22 finding on a default-on rule.
- **Wanted:** a name may not overrule visible evidence. Where the initializer
  is itself a taint source, the name is ignored.
- **Breach:** any rule where renaming a binding — with no other change — turns
  a finding off.
- **Proven by:** the four-way litmus above returning 1 for every spelling, and
  the corpus false-positive budget unchanged.
