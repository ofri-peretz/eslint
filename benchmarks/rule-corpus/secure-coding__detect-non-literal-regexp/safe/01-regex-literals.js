/**
 * SAFE — regex literals. The pattern is fixed in the source; there is no
 * constructor call at all. A rule that reports here is reporting on the word
 * "RegExp" rather than on a construction site.
 */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateArticleParams(params) {
  return SLUG.test(params.slug) && ISO_DATE.test(params.publishedOn);
}
