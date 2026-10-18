# Quint oracle models

Hand-written rule tests check the shapes their author thought of. A Quint model
writes down the shape **space** instead. Each dimension a rule's verdict depends
on is a variable:

- where a value comes from
- how it is transformed
- how it is bound
- which sink receives it
- how the library is imported

The rule's contract becomes a pure function, `expected`, of those variables.
Sampling the model gives the combinations nobody writes by hand, for example an
escaped value that reaches the sink through a `let` reassignment, each stamped
with the verdict the contract demands.

## Layout

| Path                                     | What it is                                                                                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `models/<plugin>.<rule>.qnt`             | The model. Every dimension is a `var` chosen with `nondet … oneOf()` in `init`; `var expected: bool` is computed from them; `step` stutters. |
| `renderers/<plugin>.<rule>.mjs`          | Exports `plugin`, `rule`, `dimensions` (in key order) and `render(case) → source`. It spells the shape and decides nothing.                  |
| `cases/<plugin>.<rule>.json`             | Generated: distinct `[key, expected]` pairs from a fixed seed. Never edit by hand.                                                           |
| `generate.mjs`                           | Samples every model (Quint fetched with `npx`) and rewrites `cases/`.                                                                        |
| `../__tests__/quint-oracle.lock.test.ts` | Renders and lints every case, and fails on any rule/model disagreement.                                                                      |

## Workflow

```sh
node benchmarks/quint/generate.mjs [name-filter]   # after adding or editing a model
npx vitest run --root benchmarks __tests__/quint-oracle.lock.test.ts
```

A disagreement is either a rule defect (fix the rule, test-first) or a model
defect (the oracle or the renderer is wrong). Decide which by reading the
rendered case; never by what makes the test pass. When the model was wrong,
say why in a comment beside the corrected definition.

## Writing a good model

- **Oracle = the rule's documented contract.** Write it from the docs and the
  CWE, not from what the implementation does. If the docs are vague, make the
  call, write it into the rule doc and the model, and note it in the audit.
- **Dimensions that have historically hidden FPs/FNs:**
  - binding: inline, `const`, `let` reassigned, a same-file helper's return, a relative import
  - import style: named, default, namespace, aliased, `require`
  - wrappers: `await`, casts, `satisfies`, optional chaining, computed member `x['m']`
  - sanitisers: real ones and look-alikes
  - unrelated APIs that share a method name
- Keep a model's space small enough to sample fully: about 2,000 combinations
  at 8,000 samples. Split a rule into two models rather than cap coverage.
