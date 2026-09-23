---
'eslint-plugin-modernization': patch
---

fix(modernization): `prefer-at` reports a receiver that reads a private field

`this.#rows[this.#rows.length - 1]` was silent while `this.rows[this.rows.length - 1]` was reported and autofixed. A `#name` segment now renders to a receiver path like a public one, and stays distinct from a public field of the same name.
