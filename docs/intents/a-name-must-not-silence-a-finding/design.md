# Design — a name must not silence a finding

## Requirements

1. Where a binding's own initialiser is visibly a user-input read, a
   safe-sounding name must not suppress the finding.
2. A name must still be trusted where the code says nothing — a bare parameter,
   or a value that came through a call.
3. The corpus false-positive budget must not move.
4. The rename litmus must be able to SEE this class of defect. It could not:
   the probe skipped every case that was already silent, so the direction that
   hides true findings was outside its domain by construction.

## Design

### The rule

`isVariableSafe` in `no-arbitrary-file-access` returned `true` for any binding
matching `/^(safe|sanitized|validated|clean)/i`. Nothing else was consulted, so
the same CWE-22 traversal reported or not depending only on spelling:

    const userPath      = req.query.f   ->  reported
    const cleanPath     = req.query.f   ->  SILENT
    const safePath      = req.query.f   ->  SILENT
    const validatedPath = req.query.f   ->  SILENT

The convention now yields to the binding's own initialiser:

    const bound = bindings.get(varName);
    if (bound === undefined) return true;                       // says nothing
    if (bound.type === AST_NODE_TYPES.CallExpression) return true; // laundering
    return !readsUserInput(bound);                              // contradiction

Three states, and the middle one is the reason this is three lines rather than
one. A CALL is where sanitising legitimately happens, so
`const cleanPath = sanitizePath(req.query.f)` must stay silent — the first,
cruder version of this fix keyed on `readsUserInput` alone and reported it,
which is a false positive on the most common shape of a real sanitiser. A
binding with no initialiser says nothing at all, and distrusting it would fire
on most helper functions in any codebase that uses the convention.

Only a DIRECT read is the code contradicting the name.

### The instrument

`name-dependence-probe.mts` measured one direction. It starts from a case that
reports and asks whether a rename silences it, and it skips anything silent at
baseline (`base === 0`). A name that PREVENTS a report lives in the valid table
and reports nothing, so this defect was invisible to the probe that exists to
find exactly this.

A second pass mirrors it: start from the silent cases, rename every binding,
and see which START reporting. Separate loop, separate totals, separate keys in
the artefact — folding them together would produce one number spanning two
defects whose consequences are opposite.

The asymmetry is the point. A name that CAUSES a report is a false positive; a
consumer hits it and complains. A name that PREVENTS one is a false negative on
a rule shipping enabled by default, and nobody ever sees it.

### A renamer that ate the evidence

The mirror pass first reported 17 cases; 5 were the probe's own fault. An
Identifier's `range` covers its type annotation, so overwriting the whole range
deleted the type:

    silent   function s(d: 'asc' | 'desc') { …`?d=${d}` }
    reports  function foo2(foo1)           { …`?d=${foo1}` }

which reads as "renaming the parameter turned the finding on" and is really
"deleting the union type turned the finding on". The edit is now bounded to
`node.name.length`. This also corrected the ORIGINAL direction, whose headline
had been overstated for the same reason: 347 -> 343.

## Verification

The four-way litmus, all reporting, and the two suppressions that must survive:

    tainted   userPath       -> 1        sanitized via a call      -> 0
    tainted   cleanPath      -> 1        parameter, no initialiser -> 0
    tainted   safePath       -> 1
    tainted   validatedPath  -> 1

Pinned as six cases in `no-arbitrary-file-access.test.ts` — the four generated
from one array so a later refactor cannot fix three and leave one, plus FP-6
and FP-7 for the directions that must stay silent.

Proven to fail on the unfixed rule. With the suppression restored, `userPath`
passes and the other three fail, which is the correct signature: `userPath` was
never suppressed, so a lock that failed on all four would be testing something
else. Package green at 2,939 tests, coverage back to 100%.

Corpus budget: `nameDependent` 347 -> 343, entirely the renamer fix; this rule
holds at 2 sites, both bare identifiers with no initialiser (FP-5), which is
requirement 2 working.

## Rejected alternatives

**Delete the naming convention.** It is load-bearing. `fs.readFileSync(safePath)`
with no initialiser in scope is most of the FP-5 block, and reporting those
floods the noise floor of a default-on rule.

**Treat any taint below the initialiser as contradiction.** Measured: it reports
`const cleanPath = sanitizePath(req.query.f)`. Rejected on evidence, not taste.

**Make the vocabulary an option.** Right answer for the rules
`check:name-vocabulary` adjudicates, wrong problem here — the defect is not that
the vocabulary is unreplaceable, it is that a name outranked visible evidence.
An option would make the false negative configurable, not fix it.

**Gate on the new suppression number.** 12 cases across 4 rules, and reading
them says 10 are deliberate allowlists — sha1 for certificate thumbprints
(`x5t` is RFC 7515's own name for it) and public-by-design analytics keys
(PostHog project key, Segment write key, Firebase web key). The other 2 are
`no-fail-open-auth` recognising Express and Promise shape by parameter name, so
a consumer writing `(request, response, nxt)` gets a false positive. All
adjudicable, none a second `cleanPath`. Gating on a number no human has read is
how a budget becomes a thing people raise instead of a thing they meet.

## Out of scope

The 343 cases in the original direction. The 2 `no-fail-open-auth` findings —
real, but a false-positive vector, which self-reports and is not what this
intent is about.
