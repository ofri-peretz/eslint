---
'eslint-plugin-secure-coding': patch
---

fix: `no-unsafe-deserialization` reported `yaml.load()` on repositories pinned
to js-yaml v4.

v4's `load` is what v3 called `safeLoad` — `DEFAULT_SCHEMA` carries no
`!!js/function` tag and the unsafe v3 `load` is gone. The rule's own comment
said it "cannot see which major is installed". It can: the manifest declares
it.

The lookup walks up from the linted file to the nearest `package.json`, so a
package inside a monorepo reads its own, and caches per directory. Nothing
declared, or a range with no digits in it, means nothing is known and the
finding stands.

Found on dwp/govuk-casa — the UK Department for Work and Pensions' service
framework — where it was the single finding across 156 files.
