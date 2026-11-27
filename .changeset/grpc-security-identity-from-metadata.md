---
'eslint-plugin-grpc-security': minor
'oxlint-plugin-grpc-security': minor
---

feat(grpc-security): `no-identity-from-metadata` reports a gRPC caller identity read from client-settable metadata

gRPC metadata is HTTP/2 headers, and the client sets every one of them. A backend that takes "who is calling" from a header a gateway is supposed to set (`x-authenticated-user`) trusts the client as soon as the backend is reachable another way. The rule reports a read of a handler's `call.metadata` whose value reaches an equality check against a per-request record (`acc.owner !== user`). Resolving the header through a server-side lookup or a verifier first keeps it silent. It decides from the flow, never from the header's name, and is in `recommended`.
