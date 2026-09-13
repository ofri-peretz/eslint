---
'eslint-plugin-import-next': patch
---

fix: `no-extraneous-dependencies` no longer reports `<scheme>:` specifiers as missing packages

The package name was derived by splitting the specifier on `/` alone, so
`fumadocs-mdx:collections/server` yielded the "package" `fumadocs-mdx:collections`
— a name npm's grammar forbids, since `:` is outside `[a-z0-9-._~]`. The rule
reported it as missing at HIGH and suggested `npm install fumadocs-mdx:collections`,
a command that cannot succeed, while the package actually backing it
(`fumadocs-mdx`) was declared all along.

Specifiers carrying a URI scheme are now skipped, the same as the existing `#`
and `node:` carve-outs. This covers spec-defined URL specifiers (`data:`,
`https:`) and build-tool virtual modules (`virtual:`, `astro:`). They are
skipped rather than prefix-mapped: `virtual:pwa-register` belongs to no package,
and `astro:content` does not belong to one named `astro`.
