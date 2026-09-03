/**
 * SAFE - `xmlns` is an opaque identifier compared byte-for-byte, never fetched,
 * and rewriting it to https BREAKS the document. It is not a subresource
 * attribute on any element, so the exemption is structural rather than a
 * special case.
 */
export function Icon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <path d="M0 0h16v16H0z" />
    </svg>
  );
}
