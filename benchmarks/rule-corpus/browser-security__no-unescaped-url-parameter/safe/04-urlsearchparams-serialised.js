/**
 * SAFE - `URLSearchParams` percent-encodes on stringification. Building the
 * query as an object and interpolating the serialiser is the structural fix,
 * not a workaround.
 */
export function searchUrl(term, page) {
  const params = new URLSearchParams({ term, page });
  return `https://api.example.com/v1/search?${params.toString()}`;
}
