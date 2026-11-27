# oxlint-plugin-grpc-security

All notable changes to `oxlint-plugin-grpc-security` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 0.3.0

### Minor Changes

- **✨ Feature** — `no-unbounded-message-size` and `no-error-detail-leak`

  `no-unbounded-message-size` reports `grpc.max_receive_message_length` or `grpc.max_send_message_length` set to `-1` (no limit) or above 100 MiB, so one message cannot make the server allocate without bound. `no-error-detail-leak` reports a gRPC status whose `details` are built from a caught error's stack or message, which would otherwise reach the client. Both are in `recommended`.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-grpc-security@0.3.0`

## 0.2.0

### Minor Changes

- **✨ Feature** — `no-identity-from-metadata` reports a gRPC caller identity read from client-settable metadata

  gRPC metadata is HTTP/2 headers, and the client sets every one of them. A backend that takes "who is calling" from a header a gateway is supposed to set (`x-authenticated-user`) trusts the client as soon as the backend is reachable another way. The rule reports a read of a handler's `call.metadata` whose value reaches an equality check against a per-request record (`acc.owner !== user`). Resolving the header through a server-side lookup or a verifier first keeps it silent. It decides from the flow, never from the header's name, and is in `recommended`.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-grpc-security@0.2.0`

## 0.1.0

### Minor Changes

- **✨ Feature** — **✨ New**: `eslint-plugin-grpc-security`, starting with `no-unguarded-reflection`.

  gRPC server reflection tells any client, without credentials, which services and methods a listener serves. Registered unconditionally, it ships to production, and `grpcurl -plaintext host:port list` names every service on the server, including the internal ones nobody was supposed to know about. The rule reports `new ReflectionService(def).addToServer(server)` from `@grpc/reflection` and `addReflection(server, …)` from `grpc-server-reflection` when no branch stands between the registration and the program running. It is silent once any branch decides it: an `if` on `process.env.NODE_ENV`, a config flag, or an earlier `return`.

  The devkit registers `plugin-grpc-security` in `PLUGIN_DOCS_CATEGORY`, so the rule ships with a working docs URL.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-grpc-security@0.1.0`
