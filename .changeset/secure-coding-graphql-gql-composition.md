---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): no-graphql-injection accepts `gql` documents composed from other `gql` documents

`gql`query { ...Asset } ${ASSET_FRAGMENT}`` no longer reports when the interpolation is a `gql`/`graphql`
tagged template, written in place or bound to a single-assignment `const`. That is the Apollo/graphql-tag
composition idiom, and it was 192 of 254 findings in vendure-ecommerce/vendure. An import spelled
`*_FRAGMENT` or `*Fragment` from a relative module is trusted as a heuristic, since its definition is in
another file; a package import or any other name still reports, and so does any user value interpolated into a query.
