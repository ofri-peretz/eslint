---
'eslint-plugin-secure-coding': patch
'eslint-plugin-import-next': patch
---

fix(secure-coding, import-next): three false positives and one crash reported by adopters

- `no-hardcoded-credentials` no longer reports a template placeholder name under a key called `token`. `Replacement.create({ token: 'unsubscribeUrl', value })` (stamhoofd/stamhoofd EmailBuilder.ts and exampleReplacements.ts, four disables) was read as a high-entropy blob because the word check rejected four consonants in a row, which `unsubscribe`, `subscribe`, `construct` and `abstract` all contain. The limit is now five. A value with digits or a real key shape under `token` still reports.
- `no-sensitive-data-exposure` no longer reports `` `unexpected key type: ${privateKey.type}` `` (honojs/hono `src/utils/jwt/jws.ts:110`). `type`, `algorithm`, `extractable` and `usages` are CryptoKey's own attributes and cannot carry the key; `privateKey`, `privateKey.pem` and `privateKey.value` still report.
- `import-next/no-default-export` no longer throws on `export default class {}` in plain JavaScript. espree gives a class no `decorators` field and the 4.1.2 autofix read its `length`.
