---
'eslint-plugin-secure-coding': patch
---

`no-improper-sanitization` no longer reports `.length` interpolated into markup.

```js
res.send('<p>' + arr.length + '</p>');   // was reported, twice
```

`.length` is a number in every JavaScript engine, so there is nothing to
escape. Found while measuring `express/examples/online/index.js:53` for #398.

Non-computed access only. `data[length]` reads a *variable* named `length`,
which carries whatever that variable holds, so it still reports — the exemption
must not become a way to smuggle an attacker-controlled key past the check.

Note this does **not** change the Express finding count: that line is
`'<p>Users online: ' + ids.length + '</p>' + list(ids)`, and `list(ids)` is an
unsanitized call reaching an HTML sink, which is a legitimate finding.
