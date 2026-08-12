---
'eslint-plugin-secure-coding': major
---

`no-unsafe-deserialization` no longer reports `JSON.parse` as CWE-502.

```js
function parseJSON(jsonString) { return JSON.parse(jsonString); }  // was CVSS 9.8
app.post('/x', (req, res) => { JSON.parse(req.body); });           // was CVSS 9.8
```

`JSON.parse` cannot instantiate objects, invoke constructors, or execute code.
It is the **remediation** for CWE-502 — and this rule's own message text says
so: *"Use JSON.parse() or safe deserialization libraries"*. It was telling
people to replace the fix with itself, at CRITICAL severity.

The branch responsible reported any `safeLibraries` member (`JSON.parse`,
`yaml.safeLoad`, protobuf, msgpack) whenever its argument looked untrusted,
justified by a comment that even `JSON.parse` "can be unsafe if used on complex
objects that get eval'd later". That is speculation about a *different* sink; if
something later evals the result, `dangerousEvalUsage` reports the eval.

Adjudicated against an 8-repo corpus: **33 findings, 0 true positives.** 31 were
this branch, most on plain `parseJSON(jsonString)` utilities. Now **33 → 2**,
and both survivors are `new Function(...)` in minified vendor bundles.

**A false negative is fixed in the same pass.** `isUntrustedInput` never
unwrapped `AwaitExpression` or `CallExpression`, so the *more* dangerous form
was the one being missed:

```js
function run(code) { eval(code); }                 // reported
async function f(res) { eval(await res.text()); }  // SILENT — now reports
```

Reading a response body (`.text()`, `.json()`, `.arrayBuffer()`, `.formData()`,
`.blob()`) or a file now counts as untrusted at any depth.

**Breaking:** the `untrustedDeserializationInput` message id is removed —
nothing can emit it. Suppressions referencing it by id should be deleted.
