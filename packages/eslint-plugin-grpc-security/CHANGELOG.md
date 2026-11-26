# eslint-plugin-grpc-security

All notable changes to `eslint-plugin-grpc-security` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 0.1.0

### Minor Changes

- **✨ Feature** — **✨ New**: `eslint-plugin-grpc-security`, starting with `no-unguarded-reflection`.

  gRPC server reflection tells any client, without credentials, which services and methods a listener serves. Registered unconditionally, it ships to production, and `grpcurl -plaintext host:port list` names every service on the server, including the internal ones nobody was supposed to know about. The rule reports `new ReflectionService(def).addToServer(server)` from `@grpc/reflection` and `addReflection(server, …)` from `grpc-server-reflection` when no branch stands between the registration and the program running. It is silent once any branch decides it: an `if` on `process.env.NODE_ENV`, a config flag, or an earlier `return`.

  The devkit registers `plugin-grpc-security` in `PLUGIN_DOCS_CATEGORY`, so the rule ships with a working docs URL.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@2.5.1`
