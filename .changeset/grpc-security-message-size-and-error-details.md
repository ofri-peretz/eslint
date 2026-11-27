---
'eslint-plugin-grpc-security': minor
'oxlint-plugin-grpc-security': minor
---

feat(grpc-security): `no-unbounded-message-size` and `no-error-detail-leak`

`no-unbounded-message-size` reports `grpc.max_receive_message_length` or `grpc.max_send_message_length` set to `-1` (no limit) or above 100 MiB, so one message cannot make the server allocate without bound. `no-error-detail-leak` reports a gRPC status whose `details` are built from a caught error's stack or message, which would otherwise reach the client. Both are in `recommended`.
