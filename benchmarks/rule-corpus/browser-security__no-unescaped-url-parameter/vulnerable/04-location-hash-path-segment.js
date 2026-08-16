/**
 * VULNERABLE - A path SEGMENT, not a query value. `location.hash` can contain
 * `../` and `%2e%2e`, so an unencoded segment walks the API's route table.
 */
export function loadFragmentDoc() {
  const id = location.hash.slice(1);
  return fetch(`https://docs.example.com/api/v2/documents/${id}/content`);
}
