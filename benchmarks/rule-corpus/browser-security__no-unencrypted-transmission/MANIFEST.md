# Rule corpus — `browser-security/no-unencrypted-transmission` (CWE-319)

Written from CWE-319 semantics and real connection-string idiom — a database
client, a cache client, a batch upload script — **not** from the rule's own test
file.

After the family partition this rule owns the **non-web cleartext protocols**:
`ftp:` `tcp:` `mongodb:` `redis:` `mysql:`. Nothing else in this package detects
them, and they are a materially different finding from a cleartext page asset:
a connection string usually carries the credentials inline, and it survives
being copied to staging with only the host swapped.

`http://` and `ws://` left this rule's defaults — they belong to
`require-https-only` / `detect-mixed-content` / `no-http-urls` and to
`require-websocket-wss` / `no-insecure-websocket`, all of which say more about
them. Those schemes therefore appear in `safe/`: not "safe code", but "not this
rule's finding", which is the only honest way to measure a partitioned family.

**Loopback does NOT exempt these schemes, on purpose.**
`mongodb://user:pass@localhost:27017` keeps its credentials when someone swaps
the host for staging, so the defect is the plaintext protocol and the inline
secret, not the destination.
