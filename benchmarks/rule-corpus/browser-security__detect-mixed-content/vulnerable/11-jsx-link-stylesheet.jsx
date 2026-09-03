/**
 * VULNERABLE - `<link href>` LOADS; `<a href>` navigates. Same attribute name,
 * opposite answer, which is why the element has to be part of the evidence.
 */
export function Theme() {
  return <link rel="stylesheet" href="http://cdn.acme-corp.io/theme.css" />;
}
