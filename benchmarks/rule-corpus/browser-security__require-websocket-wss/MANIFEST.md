# Rule corpus — `browser-security/require-websocket-wss` (CWE-319)

Written from CWE-319 semantics and real realtime-client idiom — a chat hook, a
reconnecting socket, a live-metrics dashboard — **not** from the rule's own test
file. A corpus derived from the tests can only re-derive what the author already
thought of.

This rule owns the **`new WebSocket(…)` URL argument**, because it is the only
rule in the family that can FIX one: it ships an autofix and a suggestion that
rewrite `ws://` to `wss://` in place. A `ws://` URL that is not at a constructor
belongs to `no-insecure-websocket` and therefore appears in `safe/` — not as
"safe code" but as "not this rule's finding", which is the only honest way to
measure a partitioned family.
