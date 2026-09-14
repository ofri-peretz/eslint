/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock — a failed weekly-downloads fetch is recorded, never published as a
 * blank.
 *
 * `fetchWeeklyDownloads` used to return `null` on every path: non-2xx, network
 * throw, missing field. The caller assigned that without recording anything,
 * so "npm did not answer" and "this package has no downloads" were written
 * into `peer-health.json` identically, and the entry still counted toward
 * `successfulFetches` — the figure the markdown report leads with.
 *
 * On 2026-09-14 the snapshot wrote `eslint-plugin-typeorm-security:
 * weeklyDownloads 584 -> null` while `successfulFetches` went 47 -> 48. Every
 * entry "successful"; the package was serving 74 weekly downloads from the
 * live API throughout. This is the silent-zero class the benchmark configs are
 * already guarded against, pointed at published health data instead.
 *
 * A lock rather than review attention, because the symptom is a field that is
 * *absent*. Nothing goes red, no run fails, and the number simply reads blank
 * on a page nobody diffs by hand.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWeeklyDownloads } from '../fetch-peer-health';

const realFetch = globalThis.fetch;

/** Queue one response (or throw) per successive fetch call. */
function stubFetch(
  ...responses: Array<{ status: number; body?: unknown } | Error>
) {
  const queue = [...responses];
  globalThis.fetch = vi.fn(async () => {
    const next = queue.shift() ?? { status: 500 };
    if (next instanceof Error) throw next;
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      json: async () => next.body,
    } as Response;
  }) as typeof globalThis.fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('fetchWeeklyDownloads', () => {
  it('reports an error when the registry never answers', async () => {
    stubFetch({ status: 503 }, { status: 503 });
    const r = await fetchWeeklyDownloads('eslint-plugin-typeorm-security');
    expect(r.downloads).toBeNull();
    // The whole point: a failure is distinguishable from an absence.
    expect(r.error).toBeTruthy();
    expect(r.error).toContain('eslint-plugin-typeorm-security');
  });

  it('reports an error when the connection throws', async () => {
    stubFetch(new Error('ECONNRESET'), new Error('ECONNRESET'));
    const r = await fetchWeeklyDownloads('eslint-plugin-knex-security');
    expect(r.downloads).toBeNull();
    expect(r.error).toContain('ECONNRESET');
  });

  it('retries once, so a single transient miss is not published as data', async () => {
    stubFetch({ status: 503 }, { status: 200, body: { downloads: 584 } });
    const r = await fetchWeeklyDownloads('eslint-plugin-typeorm-security');
    expect(r).toEqual({ downloads: 584, error: null });
  });

  it('treats 404 as absence, not failure — the registry did answer', async () => {
    stubFetch({ status: 404 });
    const r = await fetchWeeklyDownloads('eslint-plugin-does-not-exist');
    expect(r).toEqual({ downloads: null, error: null });
  });

  it('keeps 0 as a real measurement', async () => {
    // A newly published package reports 0. That is data, and must not be
    // rewritten to null — `eslint-plugin-supabase-security` entered the
    // snapshot at exactly this value.
    stubFetch({ status: 200, body: { downloads: 0 } });
    const r = await fetchWeeklyDownloads('eslint-plugin-supabase-security');
    expect(r).toEqual({ downloads: 0, error: null });
  });

  it('errors when the response carries no downloads field', async () => {
    stubFetch({ status: 200, body: {} }, { status: 200, body: {} });
    const r = await fetchWeeklyDownloads('eslint-plugin-mysql-security');
    expect(r.downloads).toBeNull();
    expect(r.error).toContain('downloads');
  });
});

describe('fetchWeeklyDownloads retry policy', () => {
  it('does not retry a permanent 4xx', async () => {
    // Second queued response would succeed; reaching it means we retried
    // something that will never change its answer.
    stubFetch({ status: 403 }, { status: 200, body: { downloads: 999 } });
    const r = await fetchWeeklyDownloads('eslint-plugin-forbidden');
    expect(r.downloads).toBeNull();
    expect(r.error).toContain('403');
  });

  it('retries 429 and 408, which do recover', async () => {
    for (const status of [429, 408]) {
      stubFetch({ status }, { status: 200, body: { downloads: 12 } });
      const r = await fetchWeeklyDownloads('eslint-plugin-rate-limited');
      expect(r, `HTTP ${status} should be retried`).toEqual({
        downloads: 12,
        error: null,
      });
    }
  });
});
