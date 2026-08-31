---
'eslint-plugin-node-security': patch
---

`no-unsafe-buffer-alloc` renames `countNames` to `sizeNames`

The option was documented as `sizeNames` — with this exact default list — and
implemented as `countNames` six minutes earlier by a different session working
the same intent. A consumer who read the published table and set `sizeNames`
would have crashed on `additionalProperties: false`.

The documented name wins, and it is the better one: the list is `length`,
`len`, `size`, `count`, `capacity`. The docs also carried a contradiction
directly under the table — "None. The rule takes no configuration." — which is
now gone, and `wireNames` and `requestRootNames` are documented alongside.

`countNames` was never released; no published config can be relying on it.
