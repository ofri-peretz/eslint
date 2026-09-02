---
'eslint-plugin-secure-coding': patch
---

fix: `parts['join'](' ')` concatenates the same SQL statement

`no-sql-injection` matched the array join on `property.name`, so fragments
carrying a request value were assembled into a query unreported.
