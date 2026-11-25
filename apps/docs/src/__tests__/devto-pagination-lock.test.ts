/**
 * The articles sync reads every page of Dev.to's list endpoint.
 *
 * It used to request one page of 100, so past 100 published articles the
 * oldest ones vanished from articles.json and `total` stayed at 100.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fetchAllPages, PER_PAGE } from '../../scripts/lib/fetch-all-pages';

const page = (n: number, from = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: from + i }));

function fakeFetch(pages: Array<unknown[] | number>) {
  const urls: string[] = [];
  const impl = (async (url: string) => {
    urls.push(url);
    const body = pages[urls.length - 1] ?? [];
    if (typeof body === 'number')
      return { ok: false, status: body } as Response;
    return { ok: true, status: 200, json: async () => body } as Response;
  }) as unknown as typeof fetch;
  return { impl, urls };
}

describe('fetchAllPages', () => {
  it('concatenates pages until one comes back short', async () => {
    const { impl, urls } = fakeFetch([
      page(PER_PAGE),
      page(PER_PAGE, 100),
      page(7, 200),
    ]);
    const result = await fetchAllPages(
      'https://dev.to/api/articles/me/all',
      {},
      impl,
    );
    expect(result).toEqual({
      ok: true,
      items: [...page(PER_PAGE), ...page(PER_PAGE, 100), ...page(7, 200)],
    });
    expect(urls).toEqual([
      'https://dev.to/api/articles/me/all?per_page=100&page=1',
      'https://dev.to/api/articles/me/all?per_page=100&page=2',
      'https://dev.to/api/articles/me/all?per_page=100&page=3',
    ]);
  });

  it('appends to an existing query string', async () => {
    const { impl, urls } = fakeFetch([page(1)]);
    await fetchAllPages('https://dev.to/api/articles?username=x', {}, impl);
    expect(urls).toEqual([
      'https://dev.to/api/articles?username=x&per_page=100&page=1',
    ]);
  });

  it('reports the status of a failed page', async () => {
    const { impl } = fakeFetch([page(PER_PAGE), 401]);
    expect(await fetchAllPages('u', {}, impl)).toEqual({
      ok: false,
      status: 401,
    });
  });

  it('stops a pagination that never ends', async () => {
    const { impl } = fakeFetch(Array.from({ length: 5 }, () => page(PER_PAGE)));
    await expect(fetchAllPages('u', {}, impl, 2)).rejects.toThrow(
      /did not end within 2 pages/,
    );
  });
});

describe('update-articles-data.ts', () => {
  const source = readFileSync(
    resolve(__dirname, '../../scripts/update-articles-data.ts'),
    'utf-8',
  );
  it('reads both endpoints through fetchAllPages, never a single page', () => {
    expect(source).toMatch(/fetchAllPages\(endpoint/);
    expect(source).toMatch(/fetchAllPages\(publicEndpoint\)/);
    expect(source).not.toMatch(/per_page=100/);
  });
});

describe('generatedAt matches its schema', () => {
  // sync-plugin-stats.ts writes a date only (`toISOString().slice(0, 10)`),
  // so a same-day rerun changes nothing; the schemas said date-time, which
  // every generated file failed under format validation.
  const read = (p: string) =>
    JSON.parse(readFileSync(resolve(__dirname, p), 'utf-8'));
  it.each([
    ['../data/schemas/plugin-stats.schema.json', '../data/plugin-stats.json'],
    [
      '../data/schemas/interlace-numbers.schema.json',
      '../data/interlace-numbers.json',
    ],
  ])('%s declares the format %s carries', (schema, data) => {
    expect(read(schema).properties.generatedAt.format).toBe('date');
    expect(read(data).generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
