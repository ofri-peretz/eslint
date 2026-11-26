---
'eslint-plugin-grpc-security': minor
'oxlint-plugin-grpc-security': minor
---

feat(grpc-security): `no-credential-metadata-logging` and `require-call-deadline`

`no-credential-metadata-logging` (in `recommended`) reports a `console` or logging-library call that receives gRPC metadata, its `getMap()` / `toJSON()`, or the value of an `authorization`, `cookie` or API-key header. `require-call-deadline` (`strict` only) reports a gRPC client call with no `deadline` in its options, and stays silent wherever an options object it cannot read might carry one.
