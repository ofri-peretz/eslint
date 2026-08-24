---
'docs': patch
---

fix(docs): the changelog API returned `"date": "Unknown"` for every modern release

`/api/changelog` is a documented public endpoint — `advanced/changelog.mdx`
publishes curl examples for it. Its parser reads the release date out of the
version heading, which works for the legacy keep-a-changelog format. Changesets
writes `## 1.4.1` with no date at all, so from the day this repo adopted
changesets every entry the endpoint returned carried `"date": "Unknown"`.

The real date is the release's git tag, which `sync-changelog.ts` already
resolves for all 458 releases. The route consults the tag first, falls back to the heading date, and only
then admits `"Unknown"` — the same precedence `sync-changelog.ts` uses, since a
hand-written heading date records when someone edited the changelog rather than
when the release shipped. For
`eslint-plugin-jwt-security`: 8 of 10 entries gain a date; the two that remain
unknown have no tag.

`type` gets the same treatment. It was a substring guess —
`content.includes('fix')` fires on any entry whose prose happens to contain the
word — where the changeset's own conventional-commit prefix says what the author
declared. The guess stays as the fallback for entries with no declared kind.

Response shape is unchanged; only the values improve.
