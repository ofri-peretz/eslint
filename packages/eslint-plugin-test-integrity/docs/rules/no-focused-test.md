---
title: no-focused-test
description: Disallow focused tests (.only, fit, fdescribe) that silently turn the rest of the suite off
tags: ['quality', 'testing', 'vitest', 'jest', 'playwright', 'mocha']
category: quality
severity: high
autofix: false
---

# no-focused-test

> Disallow focused tests (`.only`, `fit`, `fdescribe`) that silently turn the rest of the suite off.

- **Runners:** vitest, jest, mocha, Playwright, node:test, bun:test
- **Recommended:** `error`
- **Suggestion:** removes the focus

## Why

A focused test runs alone. Every other test in the file is skipped, and the run still reports green. Narrowing a failing run with `.only` is a normal debugging step; committing it means CI tests one case and passes. An agent iterating on a single failure leaves exactly this behind.

## Rule details

Reports a call whose callee is a test-runner API and carries `.only` anywhere in its chain (`it.only`, `describe.only`, `test.describe.only`, `it.only.each(table)`), or is `fit`, `ftest` or `fdescribe`.

A callee counts as a test-runner API when its root is an unbound global (`globals: true`, jest, mocha) or is imported from `vitest`, `@jest/globals`, `@playwright/test`, `node:test`, `bun:test` or `mocha`.

## Incorrect

```ts
it.only('adds', () => {
  expect(add(1, 2)).toBe(3);
});

import { test } from '@playwright/test';
test.describe.only('checkout', () => {});

fit('subtracts', () => {});
```

## Correct

```ts
it('adds', () => {
  expect(add(1, 2)).toBe(3);
});
```

```bash
# run one test without editing the file
npx vitest run -t "adds"
npx playwright test -g "checkout"
```

## Known limitations

- A test-runner function re-exported through a local module (`import { it } from './test-utils'`) is not read as a test runner.
