---
'eslint-plugin-grpc-security': minor
'oxlint-plugin-grpc-security': minor
---

feat(grpc-security): `no-insecure-server-credentials` and `no-insecure-channel-credentials`

Plaintext gRPC is reported only where the file proves the risk, never by host name. `no-insecure-server-credentials` reports `ServerCredentials.createInsecure()` bound to `0.0.0.0`, `[::]` or a bare port, and stays silent on loopback, unix sockets and configured hosts. `no-insecure-channel-credentials` reports a `credentials.createInsecure()` channel when a call on it sends `Metadata` carrying an `authorization`, `cookie` or API-key header, or a `Bearer` value. Both are in `recommended`.
