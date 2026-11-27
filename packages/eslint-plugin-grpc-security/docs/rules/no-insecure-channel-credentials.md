---
title: no-insecure-channel-credentials
description: Do not send credentials over a plaintext gRPC channel
tags: ['security', 'grpc']
category: security
severity: high
cwe: CWE-319
autofix: false
---

# no-insecure-channel-credentials

> Do not send credentials over a plaintext gRPC channel.

- **CWE:** [CWE-319 — Cleartext Transmission of Sensitive Information](https://cwe.mitre.org/data/definitions/319.html)
- **OWASP:** A02:2021 — Cryptographic Failures
- **CVSS:** 7.4 (High)
- **Recommended:** `error`

## Why

`credentials.createInsecure()` builds a channel with no TLS. A call on it that carries a bearer token, a session cookie or an API key sends that secret in cleartext to everything on the network path. Anyone who can read the traffic can replay the token.

## Rule details

The rule decides from the credential flow, never from the target's host name. It reports the `createInsecure()` call when the same file shows all of:

1. **A client built on it:** `const client = new Client(target, credentials.createInsecure())`, including any generated service client, a `const` holding the credentials, or an imported `credentials`.
2. **Metadata carrying a credential:** `const md = new Metadata()` filled with `md.add` / `md.set` under `authorization`, `proxy-authorization`, `cookie` or `x-api-key` (any case), or with a value that starts with RFC 6750's `Bearer` scheme followed by a space.
3. **A call on that client that passes the metadata,** in any argument position (unary, streaming, `makeUnaryRequest`).

A plaintext channel that carries no secret (a sidecar, a health check) isn't reported. The header set is the definition of a credential header (RFC 9110, RFC 6265), and the `Metadata` API is what anchors it.

## Incorrect

```js
const client = new pkg.Accounts(target, grpc.credentials.createInsecure());
const md = new grpc.Metadata();
md.add('authorization', `Bearer ${token}`);
client.GetAccount({ id }, md, callback);
```

## Correct

```js
const client = new pkg.Accounts(target, grpc.credentials.createSsl());
const md = new grpc.Metadata();
md.add('authorization', `Bearer ${token}`);
client.GetAccount({ id }, md, callback);
```

## Limits

- Call credentials attached through `combineChannelCredentials` or a call option aren't followed: gRPC refuses to compose them with insecure channel credentials.
- Metadata built in another file or by a helper isn't followed.

## Further reading

- [gRPC authentication guide](https://grpc.io/docs/guides/auth/)
