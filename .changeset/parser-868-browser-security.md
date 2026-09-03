---
'eslint-plugin-browser-security': patch
---

fix(browser-security): no-http-urls still reads a quasi with an uncookable escape

`@typescript-eslint` 8.68.0 changed `TemplateElement.value.cooked`: 8.54.0
typed it `string` and emitted the RAW text for an escape it could not cook,
8.68.0 types it `string | null` and emits `null`. Both directions were verified
against a real 8.54.0 install, not read off a changelog.

`no-http-urls` visits `TemplateElement` directly and `no-password-in-url` folds
its text from a `TemplateLiteral` visitor, so `String.raw` URLs reach both and a
null `cooked` silently dropped the host or the credential — a real finding lost,
not a false positive avoided. Both fall back to `raw`, each locked by a test
that fails without the fallback.

`detect-mixed-content` guards `!= null` instead: `isSubresourcePosition` reads
`node.parent`, which for a tagged quasi is the `TaggedTemplateExpression` and
never the `src=` it sits under, so that shape cannot report whichever text is
read. The remaining reads are handed argument nodes, where a tagged template
arrives as `TaggedTemplateExpression` and an untagged one with a bad escape is a
parse error, so they assert rather than branch on an input that cannot occur.
