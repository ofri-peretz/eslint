---
'eslint-plugin-secure-coding': patch
---

fix: `detect-object-injection` FN — a guard naming an unrelated object cleared a recursive merge

`bodyGuardsKey` credited any `hasOwn` / `hasOwnProperty` / `includes` / `has` / `in` call whose arguments named the key. It never asked which object was being tested — the leg the function's own docstring already listed as open: "never which key it tests, **nor which object**, nor whether it relates to the loop at all." The key leg was closed earlier; the object leg was not.

Executed in Node v24. This sets an **own** `polluted` property on `Object.prototype`, and the rule reported nothing:

```js
function merge(target, source, seen) {
  for (const key of Object.keys(source)) {
    if (Object.prototype.hasOwnProperty.call(seen, key)) continue; // names `seen`
    const value = source[key];
    if (value && typeof value === 'object')
      merge(target[key], value, seen); // writes `target`
    else target[key] = value;
  }
}
merge({}, JSON.parse('{"constructor":{"prototype":{"polluted":"yes"}}}'), {});
({}).polluted; // "yes"
```

The byte-identical control with only the guard line deleted reported. `Object.hasOwn(seen, key)` and `visitedSet.has(key)` were silent the same way. SPEC.md §1.A1 lists a user-written recursive merge over untrusted data verbatim as a required true positive, and §0's table records this exact payload as polluting.

A membership guard now records _which_ object it interrogates. Covering the object actually written, or a module-owned binding, clears the finding outright. Anything else — a caller-supplied parameter such as `seen` — falls through to the standard the denylist arm already held: sound for a shallow copy, insufficient once the body hands a keyed read onward to a recursive call.

Measured after the fix: repro reports, control reports, and a guard on the same object being written (`hasOwnProperty.call(target, key)`) stays silent — which is correct, since that form genuinely does stop the traversal at runtime. The FP budget is unchanged and is now pinned in recursive bodies too, not only shallow ones.

**Scope, stated plainly.** Requiring the guarded object unconditionally would flip three pre-existing valid cases that guard a caller-supplied parameter, one of them part of the head-to-head duel behind the rule's published F1 figure. Those pin _shallow_ copies, where the runtime escape is narrower. So the object leg is a positive credit rather than a requirement, and two residuals are deliberately left open: an inverted allowlist (`if (ALLOWED.includes(key)) continue;`, which writes exactly the non-allowed keys) is still silent because `ALLOWED` is module-owned, and distinguishing it needs a guard-polarity analysis; and a local `const visited = new Set()` is still credited as module-owned. Both need measurement against the FP budget rather than a judgement call.

The corpus artifact under `benchmarks/rule-corpus/` and the head-to-head volume re-measure that the locked header's procedure asks for are outstanding.
