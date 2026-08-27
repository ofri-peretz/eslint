---
'eslint-plugin-browser-security': patch
---

fix: lock and document the W3C XML namespace exemption in `no-http-urls` and `detect-mixed-content`.

The spec-frozen namespace identifiers — `http://www.w3.org/2000/svg`,
`http://www.w3.org/1999/xhtml`, `http://www.w3.org/1999/xlink`,
`http://www.w3.org/XML/1998/namespace`, `http://www.w3.org/2000/xmlns/` — are
opaque strings compared byte-for-byte, never fetched, so neither CWE-319 nor
mixed content applies. The 1.x line reported them (hit in the wild on SVG
export code passing them to `createElementNS`); 2.x already exempts them via
the namespace-authority host allowlist and the subresource-position predicate.
This release pins every identifier in both shapes (bare literal and
`createElementNS` argument) with regression locks in both rules, and names the
exemption in both rule docs.
