---
'eslint-plugin-node-security': patch
---

fix(node-security): require-dependency-integrity renders a tagged template whole

`@typescript-eslint` 8.68.0 changed `TemplateElement.value.cooked`: 8.54.0
typed it `string` and emitted the RAW text for an escape it could not cook,
8.68.0 types it `string | null` and emits `null`. Both directions were verified
against a real 8.54.0 install, not read off a changelog.

`require-dependency-integrity` visits `TemplateLiteral`, so it sees the quasis of
tagged templates, and a null `cooked` truncated the rendered text — an
unprotected CDN `<script>` could survive it. Both quasi reads fall back to
`raw`. `detect-non-literal-fs-filename` and `const-value` are handed argument
nodes instead, where a tagged template arrives as `TaggedTemplateExpression` and
an untagged one with a bad escape is a parse error, so they assert.
