---
'eslint-plugin-secure-coding': patch
---

fix: `detect-object-injection` no longer accepts a lone `__proto__` check as proof for a recursive merge

A one-key denylist is sound for a SHALLOW copy — `__proto__` is the only string
key whose `[[Set]]` escapes the receiver, so `target['constructor'] = v` merely
shadows with an own property. It stops being sound the moment the body
recurses, because the escape is then through the READ:
`target['constructor']` walks the prototype chain to the `Object` function,
then `Object['prototype']`, and the write that follows lands on the global
prototype. `bodyGuardsKey` credited any single member of `POLLUTION_KEYS` and
returned before walking the rest of the body, so a recursive merge guarding
only `__proto__` was silent.

Measured in Node 24: `merge({}, JSON.parse('{"constructor":{"prototype":{"pwn":1}}}'))`
sets `({}).pwn === 1` — global prototype pollution the rule did not report. The
rule's own remediation string already prescribes all three keys; it just
accepted any one of them as proof of the other two.

A body that only writes still needs one key, so the documented shallow-copy fix
is unchanged. A body that carries a key-computed read onward into a call must
now name every key that can escape.

Found by the burgee FP/FN sweep at `packages/burgee/src/yargs/utils.ts:220`.
