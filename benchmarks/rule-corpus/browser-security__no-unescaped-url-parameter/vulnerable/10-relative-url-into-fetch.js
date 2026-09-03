/**
 * VULNERABLE - A site-relative URL is still a URL once it reaches a sink. The
 * template alone proves nothing; `fetch` at the other end of a one-hop binding
 * is what makes it one.
 */
export function loadPage(slug) {
  const url = `/api/v1/pages?slug=${slug}`;
  return fetch(url);
}
