---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): no-graphql-injection accepts `gql` documents composed from other `gql` documents

`gql`query { ...Asset } ${ASSET_FRAGMENT}`` no longer reports when the interpolation is a `gql`/`graphql`
tagged template, written in place or bound to a single-assignment `const`. That is the Apollo/graphql-tag
composition idiom, and it was 192 of 254 findings in vendure-ecommerce/vendure. A `gql` tag now makes its
template a document even with no static text, so `gql`${input}`` is checked. Imported fragments still report,
whatever they are named, because an import cannot be resolved within the file; so does any user value
interpolated into a query.
