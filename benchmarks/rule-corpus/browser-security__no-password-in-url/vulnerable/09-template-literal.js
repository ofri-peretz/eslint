/**
 * VULNERABLE - ADVERSARIAL. The identical URL written as a template literal.
 * A rule that only visits `Literal` nodes sees nothing, and a template with no
 * interpolation is exactly as static as a string.
 */
const API = `https://reporting:s3cr3t@api.acme-corp.io/v1`;
fetch(API);
