/**
 * SAFE - A namespace URI is an opaque identifier compared byte-for-byte, never
 * fetched. "Fixing" it to https BREAKS the document, so reporting it is worse
 * than noise.
 */
export function Icon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" />;
}
