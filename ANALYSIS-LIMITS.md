# Analysis limits — the registry

When a rule stops improving, the useful question is not "how do I try harder"
but **which limit did I reach**. This file names them, using the terms the
program-analysis literature already uses, so that "I am stuck" becomes a
citation rather than a feeling.

Every entry in a rule's `SEAL.json` `knownGaps[]` must cite a `limit` from this
registry. That turns the two questions worth asking into queries:

```bash
npm run limits              # which limits are we hitting, on which rules, how often
npm run limits -- L1        # every gap that cites this limit — "was I here before?"
```

## Our posture, named

An analysis is **sound** if it has no false negatives, **complete** if it has no
false positives. Rice's theorem puts both out of reach for any non-trivial
semantic property, so every practical tool gives one up.

This ecosystem is **soundy** (Livshits et al., *In Defense of Soundiness*, CACM
2015): deliberately unsound in a specific, enumerated set of ways, sound
everywhere else. The registry below IS that enumeration. A gap that cites a
limit is inside the posture; a gap that cites none is a defect.

## The registry

| ID | Limit | What it is |
| :--- | :--- | :--- |
| **L1** | **Intraprocedural scope** | ESLint's unit of analysis is one file, and a rule's is usually one function. There is no call graph and no interprocedural summary, so a parameter is opaque: nothing in the file says what a caller passes. |
| **L2** | **Type-unaware (syntactic) analysis** | The rules read an AST, not a type. `new Buffer(x)` cannot be resolved to its numeric or its string overload without the checker. Lifting this means type-aware linting — `parserOptions.project`, and a large cost per file. |
| **L3** | **Flow- and path-insensitivity** | A rule sees a syntactic neighbourhood, not a control-flow graph with path conditions. `if (guard) { sink() }` is recognised only when the guard is adjacent and shaped as expected; a guard three statements up an `else` branch is not. |
| **L4** | **No points-to / alias analysis** | Assignment chains are followed by a hand-rolled walk with a depth cap, not by a points-to solver. `const a = b; a.x = tainted` is followed; `arr[i] = tainted; use(arr[j])` is not. |
| **L5** | **Unmodeled library semantics** | Whether `xml2js` expands entities, whether `mkdirSync(…, {recursive:true})` throws EEXIST, whether `zlib` bounds its output — these are facts about compiled behaviour, learned by RUNNING the library. They cannot be derived from the AST and must be curated as summaries, which then rot against upstream releases. |
| **L6** | **Configuration and deployment invisibility** | Defaults, environment, and deploy-time configuration are not in the file. axios ships `maxContentLength: -1`; whether a consumer overrides it is unknowable here. |
| **L7** | **Reflection and dynamic dispatch opacity** | Computed access, `eval`, dynamic `import()`, and proxy indirection defeat any static resolution of the callee or the key. |
| **L8** | **Undecidability of the property** | "Can an attacker control this value" is a non-trivial semantic property. Rice's theorem: undecidable in general. Every verdict is an approximation, and the useful question is which direction it errs in. |
| **L9** | **Corpus incompleteness** | Absence of false negatives is unprovable. A corpus is a finite sample, an adversarial wave raises confidence, and neither closes the question. |
| **L10** | **Measurement resolution** | Some properties are true but not measurable with the instrument at hand — a rule's marginal CPU cost sitting below the noise of a difference between two parser-dominated timings. Distinct from L8: the property is decidable, the instrument is not sharp enough. |

## How to use it

**When a rule stops improving**, classify the blocker before doing more work:

1. Can the answer be derived from THIS file? No → **L1**.
2. Does it need a type? → **L2**. A path condition? → **L3**. An alias? → **L4**.
3. Does it need to know what a dependency does at runtime? → **L5**.
4. Does it need config or deploy state? → **L6**.
5. Is the callee or key computed? → **L7**.
6. Is the question "is this exploitable" rather than "is this the shape"? → **L8**.
7. Is the claim "there are no more"? → **L9**.
8. Did the instrument fail to resolve it? → **L10**.

**A gap that classifies is closed as a limit, not left open as work.** That is
the exit condition: a rule is finished when every residual gap cites a limit
here. It is not perfect — it is at the boundary of the method, with the boundary
written down.

**A gap that classifies to nothing is a defect.** Fix it.

## Lifting a limit

Each of these has a known remedy at a known cost. Recording them stops the same
proposal being re-litigated:

| Limit | Remedy | Cost |
| :--- | :--- | :--- |
| L1 | interprocedural taint — CodeQL, Semgrep taint mode, or a call graph built over the project | a different tool class; not an ESLint rule |
| L2 | type-aware linting (`parserOptions.project`) | large per-file cost, and a hard requirement on consumers' tsconfig |
| L3 | build a CFG per function and evaluate path conditions | substantial per-rule machinery |
| L4 | a points-to solver | out of scope for a lint rule |
| L5 | curated library summaries, verified by executing the library | maintenance against every upstream release |
| L6 | read the consumer's config at lint time | outside what a rule is given |
| L7 | none — this is a property of the language | — |
| L8 | none — Rice | — |
| L9 | adversarial waves, competitor diffing, mutation testing | raises confidence, never closes |
| L10 | a sharper instrument (CPU profile attributing samples to rule frames) | buildable, not built |
