---
title: no-unexplained-skip
description: Require every skipped or todo test to carry an issue link, a decision id or an unexpired date
tags: ['quality', 'testing', 'vitest', 'jest', 'playwright', 'mocha']
category: quality
severity: high
autofix: false
---

# no-unexplained-skip

> Require every skipped or todo test to carry an issue link, a decision id or an unexpired date.

- **Runners:** vitest, jest, mocha, Playwright, node:test, bun:test
- **Recommended:** `error`

## Why

Skipping a flaky test is the fastest way to turn a red suite green, and nothing downstream can tell it happened. A skip that says why — and until when — is a decision somebody can revisit. A bare `.skip` is a test that silently stopped existing.

## Rule details

Reports:

- `.skip`, `.todo` and Playwright's `.fixme` on a test, suite or `each` table;
- `xit`, `xtest`, `xdescribe`;
- `skipIf` / `runIf` with a constant condition (`it.skipIf(true)`);
- Playwright's `test.skip()` with no condition, or with `true`.

A skip is legal when a comment on the same line or the line above carries:

- an issue or pull-request URL (`https://github.com/acme/app/issues/42`);
- a decision id (`D-107`, `D-20261123-slug`);
- a `YYYY-MM-DD` date that has not passed. Once the date passes, the rule reports the skip as expired.

Runtime conditions are gates, not skips, and are never reported: `it.skipIf(process.platform === 'win32')`, `describe.runIf(hasDocker)`, Playwright's `test.skip(browserName === 'webkit', 'reason')` and vitest's `ctx.skip()`.

## Incorrect

```ts
it.skip('retries the upload', async () => {});

// flaky
test.todo('handles a dropped connection');

// until 2024-01-01
describe.skip('legacy importer', () => {});
```

## Correct

```ts
// https://github.com/acme/app/issues/812 — upstream mock server drops HEAD
it.skip('retries the upload', async () => {});

test.todo('handles a dropped connection'); // D-140

it.skipIf(process.platform === 'win32')('uses symlinks', () => {});
```

## Known limitations

- The rule checks that a reason exists, not that it is a good one.
