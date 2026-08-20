/**
 * VULNERABLE - A poster frame is a subresource like any other, and it is the
 * attribute people forget when they sweep a codebase for `src`.
 */
export function Clip({ src }) {
  return <video src={src} poster="http://cdn.acme-corp.io/poster.jpg" controls />;
}
