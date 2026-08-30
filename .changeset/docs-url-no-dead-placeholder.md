---
'@interlace/eslint-devkit': patch
---

fix: the default `createRule` no longer mints a docs URL that 404s

`createRule` stamped every rule it built with
`github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin/docs/rules/<name>.md`
— a package that has never existed in this repo. `withCanonicalDocsUrls` scrubs
that on export, but only for plugin slugs registered in `PLUGIN_DOCS_CATEGORY`.
All 30 shipping plugins are registered, so nothing 404s today; a **new** plugin
authored before its slug is added would have shipped the dead link into every
IDE "see docs" affordance, CI report and SARIF file.

Two changes make that gap loud instead of silently wrong:

- The default `createRule` mints no URL at all. It cannot know which plugin a
  rule belongs to, so any URL it builds is a guess.
- `withCanonicalDocsUrls` warns when its slug is absent from
  `PLUGIN_DOCS_CATEGORY`, naming the file to register it in. It warns rather
  than throws — a missing documentation link must never break a consumer's
  lint run.

No shipped rule's `meta.docs.url` changes. `scripts/__tests__/rule-docs-url-lock.test.ts`
loads every plugin barrel and asserts it.
