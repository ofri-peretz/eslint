---
'eslint-plugin-modernization': patch
---

fix: `prefer-at` handles member-expression receivers

`c.path[c.path.length - 1]` and `this.rows[this.rows.length - 1]` were invisible
because the receiver had to be a bare identifier. The two halves are now
compared by canonical key path, so `c["path"]` and `c.path` match. A receiver
containing a call or a dynamic computed segment is left alone, since two such
reads cannot be shown to name one object.
