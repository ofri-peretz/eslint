---
title: no-unbounded-message-size
description: Keep gRPC message size limits bounded
tags: ['security', 'grpc']
category: security
severity: high
cwe: CWE-770
autofix: false
---

# no-unbounded-message-size

> Keep gRPC message size limits bounded.

- **CWE:** [CWE-770 — Allocation of Resources Without Limits or Throttling](https://cwe.mitre.org/data/definitions/770.html)
- **OWASP:** A04:2021 — Insecure Design
- **CVSS:** 7.5 (High)
- **Recommended:** `error`

## Why

`grpc.max_receive_message_length` and `grpc.max_send_message_length` cap how large one gRPC message may be, and gRPC defaults the receive cap to 4 MiB. With the cap at `-1` (no limit) or at gigabytes, one client request can make the process buffer that much before any handler code runs. A single caller can then exhaust the server's memory.

## Rule details

The rule reports either option, on a server, a client or a channel, when its value is `-1` (or any negative number) or above 100 MiB. It reads object literals (including computed literal keys) and assignments such as `options['grpc.max_receive_message_length'] = -1`.

The value is evaluated, never guessed. The rule reads number literals, unary `-` and `+`, `* + - / ** <<`, `const` bindings, `Infinity` and `Number.MAX_SAFE_INTEGER` / `MAX_VALUE` / `POSITIVE_INFINITY`. A value from configuration or a call can't be judged from the source, so the rule stays silent on it.

The keys are gRPC's own channel-argument names, so matching them exactly is structure, not a guess about naming.

## Incorrect

```js
const server = new grpc.Server({ 'grpc.max_receive_message_length': -1 });

const client = new pkg.Uploads(target, creds, {
  'grpc.max_send_message_length': 1024 * 1024 * 1024,
});
```

## Correct

```js
const server = new grpc.Server({
  'grpc.max_receive_message_length': 16 * 1024 * 1024,
});
```

To move large payloads, stream them in chunks instead of raising the cap.

## Further reading

- [gRPC channel arguments](https://grpc.github.io/grpc/core/group__grpc__arg__keys.html)
