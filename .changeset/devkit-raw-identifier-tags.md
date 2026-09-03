---
'@interlace/eslint-devkit': patch
---

fix: `createRawIdentifierRule` reads a subscripted tag and callee

`tagName` and `calleeText` both required a dotted member, so
``prisma['$queryRaw']`SELECT * FROM ${table}` `` was not recognised as a raw
query tag at all. Shared by the Prisma and Drizzle raw-identifier rules.
