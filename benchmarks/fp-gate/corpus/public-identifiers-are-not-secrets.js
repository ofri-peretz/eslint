// Provenance: shardeum/json-rpc-server src/api.ts:1770 (HEAD 2026-08-22).
//
// Benign because: none of these are secrets. A blockchain address is public by
// definition, a git SHA is public, a content-hashed asset name is public. Any rule
// that reports these is treating "length >= 32 and alphanumeric" as "credential".
const DEFAULT_FROM_ADDRESS = '0x2041B9176A4839dAf7A4DcC6a97BA023953d9ad9';
const RELEASE_COMMIT = 'e83c5163316f89bfbde7d9ab23ca2e25604af290';
const BUNDLE_FILENAME = 'main.4f8b2c9e1a7d3056b8e4f2a1c9d7b3e5.js';
const CONTENT_INTEGRITY = 'sha384-oqVuAfXRKap7fdgcCY5uykM6Y7JB0PGDji0ZmPmQ6PLK';

module.exports = { DEFAULT_FROM_ADDRESS, RELEASE_COMMIT, BUNDLE_FILENAME, CONTENT_INTEGRITY };
