# Rule corpus - `postgresql-security/no-floating-query` (CWE-391)

## What the rule owns

A **query promise that nothing owns**. Nobody awaits it, nobody returns it,
nobody installs a rejection handler. When it fails the process gets an unhandled
rejection — a hard crash on Node ≥ 15 — and the caller has already returned 200
for a write that may not have happened. The surrounding `try/catch` is
decoration: a rejected promise that is never awaited does not throw into it.

## The defect this corpus exposed

The rule decided ownership from the **parent node type alone**:

```js
if (parent?.type === AST_NODE_TYPES.MemberExpression) return; // check chains?
if (parent?.type === AST_NODE_TYPES.VariableDeclarator) return; // Assumed handled
```

Four separate misses came out of that, and the rule's own tests asserted all of
them as correct behaviour:

- **A MemberExpression parent meant "chained, therefore handled."** A
  one-argument `.then(onFulfilled)` covers the success path and leaves the
  failure path unhandled; `.finally()` re-throws what it was handed and is
  transparent by specification. Both were accepted.
- **A VariableDeclarator or AssignmentExpression parent meant "stored, therefore
  handled"** — even when nothing ever read the binding, which is the same defect
  with an extra line.
- **Optional chaining moved the ExpressionStatement one node further away.**
  `this.db?.query(...)` wraps the call in a `ChainExpression`, so the shape
  vanished entirely.
- **Logical, ternary and sequence expressions were treated as ownership.** In
  statement position they are control flow: `dirty && pool.query(...)` is
  `if (dirty) pool.query(...)` with different punctuation, and the promise is
  discarded either way.

## What each fixture proves

| fixture | proves |
|---|---|
| `vulnerable/01` | the canonical fire-and-forget audit write |
| `vulnerable/02` | floating inside a conditional branch |
| `vulnerable/03` | floating inside a `try` that cannot catch it |
| `vulnerable/04` | a typed repository method on `this.pool` |
| `vulnerable/05` | a one-argument `.then()` — no rejection handler |
| `vulnerable/06` | `this.db?.query(...)` — optional chaining |
| `vulnerable/07` | `const pending = …` that nothing reads |
| `vulnerable/08` | `.finally(done)` alone |
| `vulnerable/09` | floating inside a `forEach` callback |
| `vulnerable/10` | `dirty && pool.query(...)` in statement position |
| `vulnerable/11` | two chained one-argument `.then()`s |
| `vulnerable/12` | a ternary in statement position (two reports) |
| `vulnerable/13` | assignment to a binding nothing reads |
| `vulnerable/14` | `query?.(...)` and a discarded sequence expression |
| `safe/01` | awaited |
| `safe/02` | returned, and an arrow's implicit return |
| `safe/03` | `.catch(handler)` — deliberate, handled fire-and-forget |
| `safe/04` | `.then(onFulfilled, onRejected)` |
| `safe/05` | `void` — the ecosystem's explicit "ignoring this on purpose" |
| `safe/06` | collected into `Promise.all` and awaited, typed |
| `safe/07` | started early, awaited later — the binding is read |
| `safe/08` | `.then().catch().finally()` — the `finally` does not undo the `catch` |
| `safe/09` | passed to a helper, and pushed onto an array |
| `safe/10` | `yield`, and an assignment that is awaited |
| `safe/11` | the same two-link chain as `vulnerable/11`, plus one `.catch` |
| `safe/12` | held in an object property and an array element, then awaited |
| `safe/13` | a class field initializer awaited by the methods, typed |
| `safe/14` | the same ternary and `&&` as `vulnerable/12`/`10`, in a VALUE position |

`vulnerable/10` ↔ `safe/14` and `vulnerable/11` ↔ `safe/11` are matched pairs:
identical syntax, one thing changed, opposite verdicts. They are the positive
controls for the two new rules.

## Judgement calls, and why

- **`void pool.query(...)` is not floating.** It is the marker every
  floating-promise linter in the ecosystem honours. Reporting it leaves the user
  with no way to say what they mean.
- **`.catch(h)` and `.then(a, b)` handle it; `.then(a)` and `.finally(f)` do
  not.** This is `@typescript-eslint/no-floating-promises`' line and it is the
  correct one: a one-argument `.then` installs no rejection handler, and
  `.finally` re-throws. A chain is handled when *any* link absorbs a rejection.
- **A variable handles a promise only when something reads it.** `const pending =
  pool.query(...)` with no reader is the original defect plus a line of
  decoration. `const p = q(); await p;` is genuine — and overlapping two
  independent reads that way is a deliberate, useful pattern (`safe/07`).
- **Logical / ternary / sequence expressions are TRANSPARENT, not owners.** In a
  value position whatever consumes the value owns the promise (`safe/14`); in
  statement position the value is discarded and the promise floats
  (`vulnerable/10`, `/12`, `/14`). This is the only judgement here that flipped
  four existing "valid" tests, and every one of them was an unhandled rejection.
- **Handing the promise anywhere else is ownership.** An argument, an array
  element, a property value, a `return`, an `await`, a `yield`, a class field —
  all quiet. Reporting a hand-off would report the remediation.

## Deliberately out of scope

- **Whether the receiver is really a `pg` handle.** Inside a file that imports a
  PostgreSQL client, `.query()` is the sink; narrowing further would cost recall
  on every injected handle for no measured precision gain.
- **Destructuring a query result without `await`** (`const { rows } =
  pool.query(...)`). A real mistake, but a different one; this rule abstains
  rather than guessing what the binding owns.
- **Whether a promise handed to a helper is actually awaited there.** That is
  interprocedural.

## Adversarial wave

Fixtures `vulnerable/11–14` and `safe/11–14` were written after the rule first
scored 100%: longer chains where the handler is one link further away, the
optional-CALL spelling (`query?.()`) as well as the optional-member one, the
assignment half of the unread-binding hole, and — the important one — the same
control-flow operators in a value position, to prove the new statement-position
rule had not simply started reporting `&&` and `?:` everywhere. The rule held at
**100%**.

## Score

| | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| before | 5 | 0 | 5 | 100% | 50.0% | 66.7% |
| after | 14 | 0 | 0 | 100% | 100% | **100%** |
