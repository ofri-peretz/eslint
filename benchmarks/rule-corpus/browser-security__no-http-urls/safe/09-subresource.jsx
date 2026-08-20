/**
 * SAFE FOR THIS RULE - A subresource load the browser will BLOCK.
 * `detect-mixed-content` owns it and reports the stronger CWE-311 fact.
 */
export function Theme() {
  return <link rel="stylesheet" href="http://cdn.acme-corp.io/theme.css" />;
}
