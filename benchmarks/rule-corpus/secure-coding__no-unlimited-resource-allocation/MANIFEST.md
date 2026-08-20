# Rule corpus — `secure-coding/no-unlimited-resource-allocation` (CWE-770)

Written on 2026-08-18 from what CWE-770 **is** — an allocation the invoker can
make arbitrarily large — and from the 173 findings this rule produced across 20
popular repositories, **not** from the rule's own test file.

Before that measurement the rule detected **0 of the 2** vulnerable fixtures in
`benchmarks/corpus/CWE-770/`, while reporting 173 times on code it did not
write. Both halves came from one predicate: `isUserInputExpression` ran
`String.includes` over the PRINTED source against `['req','request','body',
'query','params','input','data']`. That matches `dataDir`, `queryParams`,
`inputFile` and `Metadata`, and misses `const size = Number(url.searchParams.get('size'))`.

## The distinction this corpus exists to hold

**An allocation is bounded by whoever chooses its size, not by where it sits.**

- `new Set(existing)` inside a loop is not a finding, however dynamic it looks.
  `Set` and `Map` take an ITERABLE, not a size: copying one allocates what the
  program already holds, and no input makes it larger. That single expression
  was 107 of the 173 findings.
- `for (let i = 0; i < count; i++) { Buffer.alloc(1024 * 1024) }` **is** a
  finding when `count` comes from the request, even though every individual
  allocation is a fixed, bounded 1 MB. The unbounded quantity is the trip count.
- `process.env` and `process.argv` are chosen by whoever started the process.
  An operator who can set `MAX_HEAP` can equally just not start it.

`safe/` is therefore not a list of "safe code". It is a list of shapes that are
**not this rule's finding** — several would be reported by a sibling rule, and
several are the exact expressions the rule used to get wrong.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.
