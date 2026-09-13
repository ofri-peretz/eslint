---
'eslint-plugin-secure-coding': patch
---

security: `detect-object-injection` missed the copy loop in its callback spelling

`checkMassAssignmentLoop` was registered on `ForOfStatement` only, so the two
loop spellings of a mass-assignment copy reported and the callback spelling did
not:

```js
for (const k of Object.keys(src)) dst[k] = src[k]; // reported
Object.keys(src).forEach((k) => {
  dst[k] = src[k];
}); // silent
```

The gap was not cosmetic. The recursive form was silent too, and measured in
Node 24 it reaches `Object.prototype`, not just one field:

```js
mergeOptions({}, JSON.parse('{"__proto__":{"polluted":"yes"}}'));
({}).polluted === 'yes';
```

So the unguarded recursive deep merge — the canonical CWE-1321 primitive, and
the shape the rule's own header cites when it declines to model `_.merge` by
name — went unreported in the spelling most application code uses.

The read exemption is unchanged: `Object.keys(x).forEach((k) => x[k])` reads an
own enumerable key of the object being iterated and stays silent. Only a write
onto a _different_ object is reported.
