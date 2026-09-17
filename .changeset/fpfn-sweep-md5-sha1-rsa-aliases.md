---
'eslint-plugin-node-security': patch
---

fix: `no-weak-hash-algorithm` missed the `WithRSAEncryption` aliases of MD5 and SHA-1

`crypto.getHashes()` ships `md5WithRSAEncryption` and `sha1WithRSAEncryption`, and both return output byte-identical to bare `md5`/`sha1` — they are the broken digest, not a signature curiosity. `/\bmd5\b/` and `/\bsha1\b/` could not reach them because `5`→`W` and `1`→`W` are word-char to word-char. The rule was inconsistent with itself as a result: `RSA-MD5` already reported, because the hyphen supplies the boundary, and `ripemd160WithRSA` already reported, because the RIPEMD entry had this exact defect fixed previously. Both patterns now accept the suffixed alias. Verified against all 25 `WithRSA`/`RSA-` digests in `getHashes()`: only the two intended names are newly matched, and no SHA-2/SHA-3 variant is touched.
