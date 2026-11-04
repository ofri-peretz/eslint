---
title: no-external-api-calls-in-utils
description: "Report network calls inside utility modules, where an HTTP client makes the helper untestable without the network."
tags: ['architecture', 'modularity']
category: modularity
autofix: suggestions
---

> **Keywords:** no external api calls in utils, network call, dependency injection, fetch, axios, architecture, ESLint rule, SonarQube RSPEC-1075

<!-- @rule-summary -->
Report a network call made inside a utility module. A helper that reaches the network cannot be tested, reused or run offline without it; the client belongs in a service, or is passed in.
<!-- @/rule-summary -->

This rule is part of [`eslint-plugin-modularity`](https://www.npmjs.com/package/eslint-plugin-modularity).

## Quick Summary

| Aspect          | Details                                                     |
| --------------- | ----------------------------------------------------------- |
| **Severity**    | Error (code quality)                                        |
| **Auto-Fix**    | ❌ No                                                       |
| **Category**    | Modularity                                                  |
| **Suggestions** | ✅ Inject the client, extract to a service, pass the client |

## Rule Details

In a utility file, the rule reports a call whose callee resolves, by its
binding, to an HTTP client:

- the global `fetch`, also written `globalThis.fetch` / `window.fetch`;
- a value imported or required from one of `httpModules` (axios, got, ky,
  node-fetch, undici, superagent, needle, phin, `http`, `https`, `http2`, with
  or without the `node:` prefix), called directly (`axios(config)`) or through
  one of `networkMethods` (`axios.get(url)`, `axios['post'](url)`,
  `https.get(url)`);
- a client derived from one by a `const` (`const api = axios.create()`, then
  `api.get(url)`).

It does not report:

- a client passed in as a parameter. Injecting the client is the fix this rule
  suggests, so `function load(url, fetch) { return fetch(url); }` and
  `function load(url, axios) { return axios.get(url); }` are not findings, even
  when an import of the same name exists in an outer scope;
- other methods of a client (`axios.create()`, `axios.isAxiosError(e)`), a
  `Map#get`, or a function imported from a module that is not an HTTP client
  (lodash's `get`);
- a test file (`*.test.*`, `*.spec.*`) while `ignoreInTests` is true;
- any file outside `utilityPatterns`.

An undeclared identifier spelled like a client module (`axios.get(url)` with no
import in the file) is still reported, for the CDN global it most often is.

## Configuration

| Option             | Type       | Default                                         | Description                                                                                                         |
| ------------------ | ---------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `utilityPatterns`  | `string[]` | `['**/utils/**', '**/helpers/**', '**/lib/**']` | Globs (`**` any path, `*` one segment) for the files the rule checks                                                |
| `httpModules`      | `string[]` | the list above                                  | Modules whose imports and requires are HTTP clients                                                                 |
| `networkMethods`   | `string[]` | `get post put patch delete head options request fetch all stream` | Methods that send a request on a client. A dotted entry (`'httpClient.get'`) names an in-house client exactly, by name |
| `ignoreInTests`    | `boolean`  | `true`                                          | Skip `*.test.*` / `*.spec.*` files                                                                                  |

## Examples

### ❌ Incorrect

```typescript
// src/utils/user.ts
import axios from 'axios';

export async function loadUser(id: string) {
  const { data } = await axios.get(`/api/users/${id}`);
  return data;
}

export const ping = () => fetch('/health');
```

### ✅ Correct

```typescript
// src/utils/user.ts: the client is passed in
export async function loadUser(id: string, http: { get(url: string): Promise<{ data: unknown }> }) {
  const { data } = await http.get(`/api/users/${id}`);
  return data;
}

// src/services/user-service.ts: services own the network
import axios from 'axios';
export const loadUser = (id: string) => axios.get(`/api/users/${id}`);
```

## Configuration Examples

```javascript
// eslint.config.mjs
export default [
  {
    rules: {
      'modularity/no-external-api-calls-in-utils': [
        'error',
        { utilityPatterns: ['**/shared/**'], networkMethods: ['get', 'post', 'apiClient.get'] },
      ],
    },
  },
];
```

## Related Rules

- [`no-mutable-exports`](./no-mutable-exports.md) - Keep module interfaces stable

## Known False Negatives

- A wrapper the rule cannot trace (`import { http } from './http'`, an in-house
  client) is not recognised; name it in `networkMethods` as `'http.get'`.
- A client destructured from an import (`const { get } = axios`) is not
  followed.
