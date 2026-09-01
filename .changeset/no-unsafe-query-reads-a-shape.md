---
'eslint-plugin-mongodb-security': minor
---

**🐛 Fix** — `no-unsafe-query` was wrong in both directions

Its model was "any identifier inside a filter object is user input, and nothing
else is user input at all". One heuristic produced a miss and a false positive
together. Executed:

```
0  find(req.body)                          ← MISSED
1  find({ name: req.body.name })           ← reported
0  findOne(req.query)                      ← MISSED
1  find({ name: NAME })  const NAME='root' ← REPORTED as "user input"
0  find({ name: 'root' })                  ← silent
```

**The miss.** `find(req.body)` hands the caller the query document. `{"$ne":
null}` as a password turns the lookup into "any user" — the canonical NoSQL
authentication bypass, and the most direct form the bug takes. The rule
early-returned on any first argument that was not an object literal, so it saw
nothing.

**The false positive.** A `const NAME = 'root'` two lines above your query was
reported as `User input "NAME" is used directly`. Every constant in a filter
was a finding.

Both are gone. The taint decision is now structural — `readsRequestShape` asks
whether the value is a read of `.query` / `.params` / `.headers` / `.body` off
something that ARRIVED as a function parameter — so it no longer depends on
what anything is spelled. A handler written `(request, reply)`, Fastify's own
convention, now works; it matched nothing before.

**You may see new findings** where a request object is passed whole to a query
method, and **fewer** on filters built from local constants.

Two behaviours worth knowing:

- A bare identifier is no longer treated as tainted. Resolving one needs real
  dataflow, and guessing costs a false positive on every `const`. If you want
  `const q = req.body; find(q)` caught, that is a separate change.
- A string literal whose text happens to read `'req.body'` is no longer a
  finding. The old model compared printed source against that text, so quoting
  it was enough to trip the rule.
