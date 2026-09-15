---
'eslint-plugin-maintainability': patch
---

fix: `identical-functions` no longer groups a function with a closure nested inside it. An outer function whose body is largely one call taking an inline callback shares almost all its text with that callback, so the pair cleared the similarity threshold by construction — but they are one implementation, and "extract to a reusable function" is impossible advice, because lifting a closure out of its own parent removes no code. A triple-nested `forEach` was reported as "3 duplicates" of itself. Removes 6 of burgee's 24 findings for this rule.
