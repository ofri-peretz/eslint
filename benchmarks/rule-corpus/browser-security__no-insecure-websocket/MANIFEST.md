# Rule corpus — `browser-security/no-insecure-websocket` (CWE-319)

Written from CWE-319 semantics and real configuration idiom — an endpoint map, a
per-environment table, a JSX prop handed to a socket provider — **not** from the
rule's own test file.

This rule owns every `ws://` URL that is **not** the `new WebSocket(…)`
argument: the constructor belongs to `require-websocket-wss`, which reports the
same line WITH an autofix. That is the whole partition, and it is why `safe/`
contains constructors. They are not "safe code" — they are "not this rule's
finding".

The shape this rule exists for is the one the constructor rule structurally
cannot see: a cleartext endpoint written down somewhere a socket will read
later.
