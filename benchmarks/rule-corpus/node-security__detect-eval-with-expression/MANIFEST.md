# Rule corpus — `node-security/detect-eval-with-expression` (CWE-95)

Written from CWE-95 semantics and real Node idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

The sink family is "a string becomes running code": `eval`, the `Function`
constructor, and the `vm` / `vm2` entry points that are mistaken for sandboxes.

## Wave 1 — the shapes a maintainer would think of

| Fixture | Shape |
|---|---|
| `vulnerable/01-express-eval-query.js` | `eval(req.query.expr)` |
| `vulnerable/02-function-constructor-rules-engine.js` | `new Function('facts', 'return ' + expr)` |
| `vulnerable/03-function-call-form.js` | `Function(...)` without `new` |
| `vulnerable/04-vm-run-in-new-context.js` | `vm.runInNewContext(req.body.formula, sandbox)` |
| `vulnerable/05-vm-aliased-import.js` | `import { runInThisContext as runIt } from 'node:vm'` |
| `vulnerable/06-vm-script-precompiled.js` | `new vm.Script(source)` |
| `vulnerable/07-vm2-nodevm-run.js` | `new NodeVM(...)` then `sandbox.run(req.body.script)` |
| `vulnerable/08-vm-compile-function.js` | `compileFunction(body, ['row'])` |
| `vulnerable/09-ts-cast-eval.ts` | TypeScript `req.body.formula as string` |
| `safe/01-json-parse.js` | the remediation for "eval this JSON" |
| `safe/02-allowlist-dispatch.js` | the remediation for "eval this expression" |
| `safe/03-vm-static-const-script.js` | vm sink, source is a module constant, context is dynamic |
| `safe/04-vm-script-static-literal.js` | `new vm.Script('…')` with a literal |
| `safe/05-mentions-eval-in-text.js` | `eval` / `new Function` / `runInNewContext` only in a CSP string and comments |
| `safe/06-expression-parser-library.js` | mathjs `evaluate()` — a NAME, not a code sink |
| `safe/07-run-method-not-vm2.js` | `.run()` on a task queue |
| `safe/08-local-function-wearing-the-name.js` | a LOCAL `function runInNewContext(...)` that renders a template |

Wave 1 already found one miss: **`vulnerable/05`** — 94.1% F1 (8 TP / 0 FP / 1 FN).

## Wave 2 — adversarial

Took the score to **69.6% F1** (8 TP / 1 FP / 6 FN).

| Fixture | Attack |
|---|---|
| `vulnerable/10-indirect-eval.js` | `(0, eval)(src)` — indirect eval, the global-scope spelling |
| `vulnerable/11-globalthis-eval.js` | `globalThis.eval(src)` |
| `vulnerable/12-eval-const-alias.js` | `const compile = eval; compile(src)` |
| `vulnerable/13-vm-computed-member.js` | `vm[VM_API](src)` with `const VM_API = 'runInNewContext'` |
| `vulnerable/14-inline-require-vm.js` | `require('node:vm').runInNewContext(src)` — no binding at all |
| `safe/09-let-all-literal-writes.js` | a `let` whose every write is a string literal |
| `safe/10-local-sandbox-facade.js` | `NodeVM` out of `./isolate`, not vm2 |
| `safe/11-eval-as-property-name.js` | `eval` as an object KEY mapped to `parseFloat` |

## What this corpus proved

Six false negatives, one false positive, one duplicate diagnostic, and **three
lock tests that pinned defects as correct behaviour**. All fixed in
`packages/eslint-plugin-node-security/src/rules/detect-eval-with-expression/index.ts`.

1. **The vm prefilter threw renamed imports away.** `CallExpression` carried a
   node to `Program:exit` only if its callee's *local* name was in the sink
   vocabulary — but `resolveModuleMember` exists precisely to resolve
   `import { runInThisContext as runIt }`, and the filter deleted the rename
   before the binding was ever consulted. Every identifier callee is now
   carried; the binding decides at exit, which is the whole point of deferring.
   Same defect in `NewExpression` (`import { Script as VmScript }`).
2. **`eval` was matched only as a bare identifier.** Three other spellings
   execute the same string: `(0, eval)(src)` (indirect eval — the canonical way
   to force global scope, and what bundlers emit), `globalThis.eval(src)`, and
   `const compile = eval; compile(src)`. All three are now resolved through the
   binding or the AST shape; `HANDLERS.eval` and `queue.run` stay quiet because
   they do not resolve to a sink, not because of how they are spelled.
3. **A computed vm member named nothing.** `vm[VM_API]` with a `const`
   property resolves to the same sink.
4. **`require('node:vm').runInNewContext(src)` created no binding**, so a
   binding-only lookup saw nothing.
5. **`isStaticCode` counted writes instead of reading them.** "Exactly one
   write" made a `let` assigned two different string literals — ordinary
   branch-then-run code — a CRITICAL finding. It now takes the last write
   *before the use site* (the same straight-line model `provenance.ts` uses),
   which also closes the opposite hole: "all writes are static" would have
   excused `function go(s) { vm.run(s); s = 'x'; }`, where the literal lands
   after the sink already ran the parameter.
6. **`new Function(x)()` reported twice.** `checkCallExpression` handled a
   `NewExpression` callee *and* `checkNewExpression` handled the same node —
   two identical diagnostics at one location. The duplicate branch is gone.

### Lock tests that asserted the defect (corrected in this pass)

- `(new Function)(code)` expected **two** errors, commented "CallExpression
  check" / "NewExpression check" — the duplicate report written down as
  intended behaviour.
- `const vm = require('vm'); vm['runInNewContext'](userCode);` was asserted
  **valid** — a code sink pinned as a non-finding because of its bracket
  spelling. Now invalid.
- `let s; s = 'x = 1'; vm.runInThisContext(s);` and
  `function go(s) { s = 'x = 1'; vm.runInThisContext(s); }` were asserted
  **invalid** — reports on a value provably equal to a string literal at the
  call. They pinned the implementation ("the declarator has no initializer",
  "the definition is a parameter") rather than the security question. Moved to
  valid, with the genuinely-unresolved parameter cases kept invalid.

### Reported, not fixed

- **The remediation text is chosen by regex over printed source.**
  `detectPattern` runs `new RegExp(EVAL_PATTERNS[i].pattern, 'i')` against
  `sourceCode.getText(argument)` to pick the messageId. Because the `object`
  entry's pattern ends in `|\.`, *any* argument containing a dot wins it:
  `eval(req.query.expr)` is reported as **"Use direct property access instead of
  eval() for dynamic property access — use obj[key] or Map.get(key)"**, which is
  not the fix for that finding. It never changes *whether* a report happens, so
  it costs no precision or recall — but it is a user-facing decision made from
  text rather than structure, and repairing it means retiring several messageIds
  (a maintainer-level call, not a corpus one).
- **`VM_CODE_SINK_METHODS` / `VM_MODULES` are unconfigurable.** Defensible as a
  closed Node API surface, but there is no way to add `isolated-vm` or a
  house-built `safe-eval`; `additionalEvalFunctions` covers only plain function
  names.
- `const { ['runInNewContext']: run } = require('vm')` is still asserted valid
  in the rule's suite (a computed destructuring key binds nothing). Left alone:
  no realistic code writes it, and the corpus did not probe it.
