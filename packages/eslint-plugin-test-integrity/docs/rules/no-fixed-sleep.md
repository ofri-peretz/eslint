---
title: no-fixed-sleep
description: Disallow fixed-duration sleeps in tests; await the event or condition instead
tags:
  [
    'quality',
    'testing',
    'flaky-tests',
    'vitest',
    'jest',
    'playwright',
    'cypress',
  ]
category: quality
severity: medium
autofix: false
---

# no-fixed-sleep

> Disallow fixed-duration sleeps in tests; await the event or condition instead.

- **Files:** test files only (`*.test.*`, `*.spec.*`, `*.e2e.*`, `__tests__/`, `test/`, `tests/`, `e2e/`)
- **Recommended:** `error`

## Why

A sleep is a guess about how long something takes. On a fast machine it wastes the time; on a loaded CI runner it is too short and the test flakes — and the usual repair is a longer guess. Waiting for the thing itself is both faster and deterministic.

## Rule details

Reports:

- `new Promise((resolve) => setTimeout(resolve, n))` and its spellings (`() => resolve()`, a `function` executor);
- `setTimeout(n)` and `scheduler.wait(n)` imported from `timers/promises`;
- an awaited `sleep(n)`, `delay(n)`, `wait(n)` or `pause(n)` whose duration is a number literal;
- Playwright's `page.waitForTimeout(n)` and Cypress's `cy.wait(n)` with a number.

Fake timers (`vi.advanceTimersByTimeAsync`, `jest.runAllTimers`) are not sleeps and are never reported. `cy.wait('@alias')` waits for a request and is not reported.

## Incorrect

```ts
await new Promise((r) => setTimeout(r, 500));
expect(cache.size).toBe(1);

await page.waitForTimeout(1000);
await expect(page.getByText('Saved')).toBeVisible();
```

## Correct

```ts
await vi.waitFor(() => expect(cache.size).toBe(1));

await expect(page.getByText('Saved')).toBeVisible();

vi.useFakeTimers();
await vi.advanceTimersByTimeAsync(500);
```

## Known limitations

- A sleep helper with a computed duration (`await delay(backoff(n))`) is not reported; the name alone is not evidence of a fixed wait.
