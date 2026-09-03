---
'eslint-plugin-node-security': patch
---

fix: `md5(user['password'])` weighs the same evidence

`no-weak-hash-algorithm` decides whether a weak hash is being used on a
credential from the name of the value being hashed, and read that name on the
dotted spelling only — so a subscripted field carried no evidence and the
finding was dropped. A destructuring target still names no single field, and
is pinned as such.
