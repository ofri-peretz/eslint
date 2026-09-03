/**
 * VULNERABLE - A `do...while` whose continuation is decided by request data.
 * The body always runs at least once and then keeps running as long as the
 * client's cursor says so.
 */
import { fetchPage } from '../lib/upstream.js';

export async function paginateAll(req) {
  const collected = [];
  let cursor = 0;
  do {
    const page = await fetchPage(cursor);
    collected.push(...page.items);
    cursor += 1;
  } while (cursor < req.query.maxPages);
  return collected;
}
