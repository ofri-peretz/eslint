# Rule corpus - `secure-coding/no-unchecked-loop-condition` (CWE-400 / CWE-606)

**The question this corpus exists to answer:** the one the rule ledger asked.

`docs/rule-ledger/secure-coding__no-unchecked-loop-condition.md` carried
`textual-matching` as a SMELL - "a decision is taken on PRINTED SOURCE rather
than on the AST" - with an explicit probe attached: *put the matched text in a
string literal or a comment inside otherwise-clean code; a report proves the
check reads text, not structure.*

This corpus runs that probe, with positive controls, and settles it.

## The probe, and its answer

```
while (source.slice(c, c + 7) !== '.match(') { c += 1; }   REPORTED
while (source.slice(c, c + 7) !== '.nope(')  { c += 1; }   quiet

for (let i = 0; i < /* endIndex */ rows.length; i++) {}    REPORTED
for (let i = 0; i < rows.length; i++) {}                   quiet
```

A hand-written lexer scanning for the literal text `.match(` was reported as a
**user-controlled loop bound** - a CWE-606 claim that a client chose the
iteration count. So was a loop whose only offence was a comment. The smell was a
defect. Two more from the same two functions, with no string or comment
involved at all:

```
while (page < totalPages && pageSize > 0) { … }            REPORTED
for (let i = startIndex; i < endIndex; i++) { … }          REPORTED
```

with `totalPages` computed from a database count and both indices derived from
`rows.length`.

## What the corpus proved

Ten defects. Seven fixed structurally, three documented as the rule's ceiling.

### False positives - all five fixed, precision 53.8% to 100%

| shape | what decided it | fix |
|---|---|---|
| the lexer, the comment, the index window, the page walk, the product | `sourceCode.getText(condition).includes(…)` against `.match(`, `.test(`, `page`+`pageSize`, `*`+`limit`, `startIndex`/`endIndex` | both functions removed - there is no structural version to write, and a regex call in a loop condition is `no-redos-vulnerable-regex` / `detect-non-literal-regexp` territory (the ledger already flags this rule for `duplicate-coverage` with the latter) |
| `while (isActive) { … }` | `varName.includes('active')` -> `infiniteLoop` | removed. `while (isReady)` was quiet on identical control flow, and the check fired whether or not the body had a `break`. Substring matching on an identifier in a reporting path is banned outright by CLAUDE.md, and this was four of them |
| `Object.keys(req.body).length` as a bound | taint propagated through `.length` | `.length` ends the taint walk. It is a MEASUREMENT of data the parser already materialised, not a count the client can inflate. `req.body.count` still reports |
| the guard-clause form of a validated collection | `checkIfCollectionIsValidated` only looked at ANCESTOR `if` statements, and compared `getText(test).includes(getText(collection))` so `items` matched inside `filteredItems` | walks preceding siblings too, and compares BINDINGS resolved through scope and property paths compared name by name |
| `function factorial(n, depth = 0) { if (depth > 10) return 1; return n * factorial(…) }` | introduced by the recursion fix below, caught before it shipped | a guard clause earlier in the block is a base case even though it is a sibling rather than an ancestor |

### Misses - two fixed, three documented

| shape | why it was silent | outcome |
|---|---|---|
| `(req.query.count as unknown as number)` | no `TSAsExpression` arm in the taint walk. Express types `req.query.x` as `string \| string[] \| ParsedQs \| undefined`, so a TypeScript codebase CANNOT use it as a bound without a cast - the rule did not fire on TypeScript Express code at all | `unwrapTypeSyntax` |
| `const limit = parseInt(req.query.limit, 10)` | `initText.includes('parseInt(')` counted as sanitization | a parse is not a clamp. Only `Math.min` / `Math.max` bound a value, matched on the `Math` global. `parseInt(req.query.pageSize) \|\| 10` needed `LogicalExpression` in the walk as well - `\|\|` replaces the falsy case and `?pageSize=1e9` is not falsy |
| conditional recursion over attacker-supplied depth (`vulnerable/08`) | see below | KNOWN MISS |
| a function PARAMETER as the taint root (`vulnerable/10`) | the HTTP layer is in another file | KNOWN MISS |
| the same handler with every identifier renamed (`vulnerable/11`) | the taint root is a name | KNOWN MISS |

### The recursion path was a two-name allowlist taken from its own tests

```ts
const isTreeTraversal = currentFunction === 'traverseObject';
if (callCount > maxRecursionDepth || currentFunction === 'recursiveFunc' || isTreeTraversal)
```

Both names are fixtures out of `no-unchecked-loop-condition.test.ts`. And
`callCount` counts recursive call SITES rather than depth, so the surviving
disjunct needs ELEVEN self-calls written inside one function before it fires.
Measured:

```
function traverseObject(n) { … traverseObject(c) … }   REPORTED
function recursiveFunc(n)  { recursiveFunc(n - 1) }    REPORTED
function walk(n)           { … walk(c) … }             quiet
```

`unsafeRecursion` reported on exactly two spellings and nothing else. Replaced
with the one thing about recursion that syntax can decide: **a self-call with no
branch above it inside the function never terminates**, whatever the function is
called. Depth-unbounded-but-conditional recursion (`vulnerable/08`) is a real
CWE-674 exposure and is NOT decidable here - it needs a bound on the input's
depth - so it stays in `vulnerable/` as a measured miss rather than being
guessed at from a name.

## The two taint-root misses stay in `vulnerable/`

`vulnerable/10-param-root.js` and `vulnerable/11-renamed-identifiers.js` are the
same unbounded loop as `vulnerable/01`, with the taint root spelled differently:
a function parameter in one, `envelope`/`payload`/`howMany` in the other. The
rule roots taint at a closed set of request-object NAMES (`req`, `request`,
`ctx`, `context`, `event`), so both go quiet. Closing them needs express module
evidence for the handler's first parameter, or interprocedural analysis. They
are left in `vulnerable/` deliberately, so the published recall figure carries
that ceiling rather than hiding it.

## Fixtures in the rule's own test suite that asserted a defect as correct

Six, in three groups:

1. `describe('Invalid Code - WhileStatement state-dependent variable-name branches')`
   asserted `while (isActive)`, `while (isEnabled)` and `while (shouldContinue)`
   as `infiniteLoop`. The describe title names the mechanism - the verdict is
   the spelling.
2. `while (page < pageSize)` ("pagination pattern"),
   `while (offset * limit < total)` ("arithmetic-overflow pattern") and
   `while (cache.match(rx))` ("non-user-input names") were asserted as
   `userControlledLoopBound`. Their own titles concede there is no user input.
3. A Layer-2 mock test passed the literal name `recursiveFunc`, with a comment
   saying it did so "to satisfy the flagged-pattern OR".

All six now assert the opposite, with the reason recorded next to them.

## Score

| wave | fixtures | TP | FP | FN | precision | recall | F1 |
|---|---|---:|---:|---:|---:|---:|---:|
| first (8v/8s, before merge) | 16 | 5 | 3 | 3 | 62.5% | 62.5% | 62.5% |
| merged + deduplicated, before fixes | 25 | 7 | 6 | 5 | 53.8% | 58.3% | 56.0% |
| final | 25 | 9 | 0 | 3 | 100% | 75.0% | 85.7% |

## A note on one fixture that changed direction

`for (const record of req.body.records)` with a per-item database write was
briefly filed under `safe/`, on the argument that request size is a body-parser
concern. It is not safe here: each iteration performs a write, so a 200k-element
array is a 200k-write amplification, and this rule's own
`checkIfCollectionIsValidated` path exists precisely to distinguish the two. The
same code cannot sit in both directories. The unvalidated form is
`vulnerable/02` and `safe/04` is its fix.
