# The false-positive catalogue

Shapes that look like a defect to a rule and are not one. Each is a class, not
an instance: fixing one moves hundreds of findings.

Marked **[measured]** where we have confirmed it in our own output against the
20-repository corpus. The rest are drawn from how these tools fail generally,
and are listed as HYPOTHESES to test — an unconfirmed entry here is a to-do, not
a finding.

---

## A. Provenance mistaken for taint

The rule believes a value is attacker-controlled when it is not.

| # | Shape | Why it is not a finding |
| :--- | :--- | :--- |
| A1 **[measured]** | `process.env.X`, `process.argv` | Chosen by whoever started the process. An operator is not an attacker; if they are, the process is already lost. |
| A2 **[measured]** | `process.pid`, `process.execPath` | Runtime facts, not inputs. We reported `process.pid` as a traversal source. |
| A3 **[measured]** | A CLI script's own argument, validated in-file | The file calls `assertSafeName(x)` three lines up. The rule cannot summarise a called function ([[L1]]). |
| A4 | A value read back from a database the app itself wrote | Second-order taint is real, but treating every DB read as hostile reports the entire data layer. |
| A5 | `import.meta.url`, `__dirname`, `__filename` | Fixed at module load by the file's own location. |
| A6 | A constant table keyed by a validated enum | The key space is closed; the rule sees a computed access. |

## B. Names read as evidence

The rule matched a spelling rather than a binding. **This is our single largest
FP source and the one the ecosystem gates on** (`lint:name-inference`).

| # | Shape | Why it is not a finding |
| :--- | :--- | :--- |
| B1 **[measured]** | A parameter or local named `req`, `ctx`, `context`, `data` | A name is a developer's choice, not a type. We required request-surface evidence instead. |
| B2 **[measured]** | `function render(RegExp) { RegExp(p) }` | A parameter shadowing an intrinsic. Found by the adversarial wave. |
| B3 | `escapeHtml`, `sanitize`, `validate` on an allowlist | Defeated by `const escapeHtml = (s) => s`. A name-keyed allowlist is an evasion surface, not just an FP source. |
| B4 | A local `String`, `Buffer`, `Object` | Same shape as B2 for every global. |

## C. Guards the rule cannot see

The defect is mitigated, but not in a form the rule recognises.

| # | Shape | Why it is not a finding |
| :--- | :--- | :--- |
| C1 **[measured]** | A byte counter compared against a ceiling later in the function | We now scan the subtree for it. Before that, every bounded decompression reported. |
| C2 | An early `return` / `throw` on the failing branch | Flow-insensitivity ([[L3]]): the guard is three statements up an `else`. |
| C3 | Validation in a middleware, decorator, or route wrapper | Interprocedural ([[L1]]). Framework-shaped and extremely common. |
| C4 | A type-level guarantee — a branded type, a parsed schema | Type-unaware ([[L2]]). `zod`/`valibot` output is provably shaped and looks like an `any`. |
| C5 | A `switch` over a closed union, exhaustively | The rule sees computed access; the program has already narrowed. |

## D. Context where the weakness cannot apply

The code is real, the weakness is not reachable there.

| # | Shape | Why it is not a finding |
| :--- | :--- | :--- |
| D1 **[measured]** | Test files, fixtures, mocks | `skipTestFiles` on the rule definition. Detected by path AND by filename. |
| D2 **[measured]** | Build scripts, codemods, migration CLIs | No attacker surface. A dev script reading a path it was handed is its purpose. |
| D3 **[measured]** | Vendored bundles — `.yarn/releases/*.cjs`, `dist/`, `*.min.js` | Somebody else's compiled output. Corpus hygiene, and it inflated our own numbers before exclusion. |
| D4 | Files that only run at build time — `*.config.*`, `scripts/` | Same argument as D2, harder to detect. |
| D5 | AST tooling and codemods, where `node[key]` is traversal | Already handled for `detect-object-injection` via module evidence. |
| D6 | Generated code, `@generated` headers | Nobody edits it; a finding there is unactionable. |

## E. The claim is true but nobody would act

**These are effective false positives even when technically correct**, which is
the definition that governs our 5% bar.

| # | Shape | Why nobody acts |
| :--- | :--- | :--- |
| E1 **[measured]** | A polynomial regex on input the app bounds elsewhere | 150 ms at 20,000 characters, on a field capped at 200. Real, and not worth an interruption. |
| E2 **[measured]** | A literal absolute path to a sensitive file, in the tool whose job is reading it | `pm2/lib/tools/passwd.js` reads `/etc/passwd`. Correct observation, no available action. |
| E3 | A finding whose message does not say what to change | The most common effective FP in the literature, and invisible to a technical-precision measurement. |
| E4 | Severity uncalibrated — `CVSS:9.8` on a style-adjacent issue | Teaches the reader to ignore the severity field, then the rule. |
| E5 | The same defect reported by two rules | Doubles the noise and halves the trust. **Measured twice inside one plugin.** |

## F. Contract-level over-reporting

Not a bug in the rule — a decision about what the rule asserts.

| # | Shape | Why it is not a finding |
| :--- | :--- | :--- |
| F1 **[measured]** | *Report unless proven safe*, i.e. the final branch returns "report" | `detect-object-injection`: **14,696 findings, 0 confirmed TPs in sample.** No threshold fixes this; only inverting the contract does. |
| F2 **[measured]** | A rule reporting every instance of a broad language feature | `arr[i]` is computed access. So is every array read in the language. |

---

## How to use this

1. When a sweep produces a large class, look here **first** — most classes are
   already named, and a named class has a known fix shape.
2. When a class is NOT here, add it, with the measured example.
3. Unmarked entries are hypotheses. Confirming one against the corpus is cheap
   and turns it into a fixable class; leaving it unconfirmed keeps this file
   honest about what we know versus what we suspect.
