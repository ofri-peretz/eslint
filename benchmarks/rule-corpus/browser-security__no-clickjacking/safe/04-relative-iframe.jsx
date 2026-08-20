/** SAFE - a same-origin iframe. A relative URL cannot leave the origin, so
 *  there is no third party to composite in. */
export function Preview() {
  return <iframe src="/preview/document" title="Preview" />;
}
