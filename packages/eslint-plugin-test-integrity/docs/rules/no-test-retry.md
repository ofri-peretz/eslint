---
title: no-test-retry
description: Disallow test retries unless a comment cites the decision or issue that allows them
tags:
  ['quality', 'testing', 'flaky-tests', 'vitest', 'jest', 'playwright', 'mocha']
category: quality
severity: high
autofix: false
---

# no-test-retry

> Disallow test retries unless a comment cites the decision or issue that allows them.

- **Runners:** vitest, jest, mocha, Playwright
- **Recommended:** `error`

## Why

A retry turns "fails one run in three" into "passes". That intermittent failure is the signal a flaky test exists to give — a race, shared state, an unmocked clock. Retrying until green hides it from everyone, including the next person who hits it in production.

## Rule details

Reports a non-zero `retry` or `retries`:

- in the options of a test-runner call: `it('x', { retry: 3 }, fn)`, `test.describe.configure({ retries: 2 })`;
- inside `defineConfig`, `defineProject`, `defineWorkspace` or `mergeConfig`, at any depth;
- anywhere in a `vitest.config.*`, `vite.config.*`, `jest.config.*`, `playwright.config.*` or `vitest.workspace.*` file;

and the calls `jest.retryTimes(n)` and mocha's `this.retries(n)`.

`retry: 0` is the absence of a retry and is not reported. A `retry` key in any other object — an HTTP client's options, say — is not a test retry.

A retry is legal when a comment on the same line or the line above cites an issue URL or a decision id (`D-107`).

## Incorrect

```ts
export default defineConfig({
  test: { retry: 2 },
});

it('uploads', { retry: 3 }, async () => {});
```

## Correct

```ts
export default defineConfig({
  // D-20261123-e2e-retries: the staging browser grid drops one session in fifty
  retries: process.env.CI ? 1 : 0,
});
```

## Known limitations

- A config object built in another file and imported into the config is not read.
