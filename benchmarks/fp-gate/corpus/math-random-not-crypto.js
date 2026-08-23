// Provenance: shardeum/json-rpc-server src/api.ts (6 sites, HEAD 2026-08-22),
// plus the minimal repro that isolated the mechanism.
//
// Benign because: none of these values is a secret, a token, or a key. They are
// sharding buckets, jitter, and cache-busters. A rule that reports these is
// inferring "cryptographic" from an identifier's *name* (`/hash/i`, `/key/i`,
// `/code/i`), which is exactly what the repo's rule-design litmus forbids:
// rename every variable to foo/bar and the rule must behave identically.
let hashBucket = Math.floor(Math.random() * 16); // consistent-hashing shard
const cacheKey = `bust-${Math.random()}`; // cache-buster suffix
const retryCode = Math.random() < 0.5 ? 'a' : 'b'; // A/B branch for a retry test
const backoffJitterMs = Math.random() * 100; // retry jitter

module.exports = { hashBucket, cacheKey, retryCode, backoffJitterMs };
