---
title: no-error-detail-leak
description: Do not send a caught error's stack or message to the gRPC client
tags: ['security', 'grpc']
category: security
severity: medium
cwe: CWE-209
autofix: false
---

# no-error-detail-leak

> Do not send a caught error's stack or message to the gRPC client.

- **CWE:** [CWE-209 — Generation of Error Message Containing Sensitive Information](https://cwe.mitre.org/data/definitions/209.html)
- **OWASP:** A05:2021 — Security Misconfiguration
- **CVSS:** 5.3 (Medium)
- **Recommended:** `error`

## Why

A gRPC status's `details` travel to the client. Filled from a caught error, they carry whatever the error carried: a stack trace with file paths and dependency versions, a database error quoting the query, the URL of an internal service. Each one is a map of the server for whoever called it.

## Rule details

The rule decides from structure, not from names.

- **Sink:** something a gRPC handler was given, where a handler is a method of the object passed to `.addService(service, implementation)`. That covers the handler's callback (`cb({ details })`, `callback(status)`) and its call object (`call.emit('error', status)`, `call.destroy(status)`).
- **Source:** a caught error, identified by its binding: a `catch (e)` parameter, or the first parameter of a `.catch((e) => …)` callback.
- **Flow:** the `details` or `message` of the status object (inline or through a `const`) is reported when it is built from `e`, `e.stack`, `e.message`, `String(e)` or `e.toString()`. Templates, `+`, `||`, `??`, ternaries and consts in between are followed.

Passing the caught error itself (`cb(e)`) is not reported. gRPC then sends its message, and applications often throw errors whose message is meant for the client.

## Incorrect

```js
server.addService(svc, {
  GetOrder(call, cb) {
    try {
      cb(null, db.find(call.request.id));
    } catch (err) {
      cb({ code: grpc.status.INTERNAL, details: err.stack });
    }
  },
});
```

## Correct

```js
server.addService(svc, {
  GetOrder(call, cb) {
    try {
      cb(null, db.find(call.request.id));
    } catch (err) {
      log.error(err);
      cb({ code: grpc.status.INTERNAL, details: 'internal error' });
    }
  },
});
```

## Further reading

- [gRPC error handling](https://grpc.io/docs/guides/error/)
