---
'eslint-plugin-node-security': patch
---

fix: `no-weak-cipher-algorithm` reported only the Triple-DES spellings Node rejects

The rule matched `3des` and `tripledes` — neither of which is in `crypto.getCiphers()`; both throw `ERR_CRYPTO_UNKNOWN_CIPHER` before encrypting anything — while staying silent on `des3` and `des3-wrap`, which Node does ship and which encrypt successfully. So the only spellings that could ever be a real CWE-327 vulnerability were the only ones going unreported. The cause is a word boundary: `/\bdes\b(?!-ede)/` cannot reach `des3` because `s`→`3` is word-char to word-char, and the 3DES pattern required the literal `-ede`. The pattern now also accepts the `des3` form. Checked against all 51 names in `crypto.getCiphers()`: exactly two verdicts change, both genuinely Triple-DES, and no secure cipher is newly flagged.
