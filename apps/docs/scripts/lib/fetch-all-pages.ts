/**
 * Every page of a Dev.to list endpoint, concatenated.
 *
 * Dev.to caps `per_page` at 1000 but the sync asked for 100 and read one
 * page, so an account past 100 published articles silently lost the oldest
 * ones and `total` reported the truncated count as complete. Pages are read
 * from 1 until one comes back short; `maxPages` bounds a misbehaving API.
 */
export const PER_PAGE = 100;

export async function fetchAllPages<T>(
  url: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
  maxPages = 50,
): Promise<{ ok: true; items: T[] } | { ok: false; status: number }> {
  const items: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetchImpl(
      `${url}${separator}per_page=${PER_PAGE}&page=${page}`,
      init,
    );
    if (!response.ok) return { ok: false, status: response.status };
    const batch = (await response.json()) as T[];
    items.push(...batch);
    if (batch.length < PER_PAGE) return { ok: true, items };
  }
  throw new Error(`Dev.to pagination did not end within ${maxPages} pages`);
}
