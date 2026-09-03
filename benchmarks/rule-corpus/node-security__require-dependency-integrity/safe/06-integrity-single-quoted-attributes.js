/**
 * SAFE - the protected form written with single-quoted attribute values and
 * with the attributes in an unusual order, inside a plain string literal
 * rather than a template. The hash is present; only the spelling differs.
 */
const HEAD =
  "<script crossorigin='anonymous' integrity='sha384-0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c4b5a69788796a5b4c3d2e1f0' src='https://unpkg.com/preact@10.19.3/dist/preact.min.js'></script>" +
  "<link integrity='sha256-aabbccddeeff00112233445566778899aabbccddeeff001122334455667788' rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css'>";

export function head() {
  return HEAD;
}
