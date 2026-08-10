---
'eslint-plugin-postgresql-security': patch
'eslint-plugin-lambda-security': patch
---

Fix a false negative: `require` shadowing is now lexical, not file-wide

Both module gates raised a single "this file shadows `require`" flag for the
whole file. So `const client = require('pg'); function wrapper(require) {}` was
read as fully shadowed: the real module load at module scope was ignored and
every rule in the plugin abstained.

That trades a false positive for a false negative, which is the worse trade —
a security rule that silently stops reporting is the defect class that matters
most.

Shadowing now propagates down the walk and applies only inside the scope that
binds the name: a function whose parameters include `require`, or a
Program/BlockStatement whose direct body declares one. A `require()` outside
that scope is module loading again.
