---
'eslint-plugin-conventions': patch
---

fix: commented-out code is recognised through a string subscript

`no-commented-code` decides whether a comment holds code from source-text
shapes, and every call pattern required a DOT — so `// await
client['connect']()` did not read as code. Minified or generated code pasted
into a comment is still commented-out code.
