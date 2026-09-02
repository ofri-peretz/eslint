---
'eslint-plugin-vercel-ai-security': patch
---

fix: `ai['generateText'](…)` is the same SDK call as `ai.generateText`

A member spelled `o['k']` reaches exactly what `o.k` reaches, and these gates
compared `property.name` before asking what the property was. They now resolve
through the devkit's `propertyName`, which still abstains on the one shape that
genuinely cannot be resolved: a key chosen at runtime, whose name is not
statically known.
