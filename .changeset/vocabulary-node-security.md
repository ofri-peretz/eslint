---
'eslint-plugin-node-security': minor
---

**✨ Feature** — `no-zip-slip` gains `archiveEntryFields`

The rule carried seven guesses at what an archive library calls the property
holding an entry's path. The set of libraries a project uses was ALREADY
configurable via `archiveModules`, so the set of field names had to be too:
hard-coding seven names and calling it complete was an assertion about somebody
else's dependency list.

`archiveEntryFields` REPLACES the default:

```json
"node-security/no-zip-slip": ["error", { "archiveEntryFields": ["archivedAs"] }]
```

The default also loses two entries. `relativePath` and `pathname` were in it
with no library behind either — `pathname` is a URL property — and no test
exercised them. The remaining five each cite the library they come from:
`name` (node-stream-zip), `path` (unzipper, tar, decompress), `fileName`
(yauzl), `entryName` (adm-zip), `filename` (unzip-stream).
