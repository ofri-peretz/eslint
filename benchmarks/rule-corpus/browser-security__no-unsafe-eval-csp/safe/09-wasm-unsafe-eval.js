/** SAFE - 'wasm-unsafe-eval' is the CORRECT narrow remediation: it permits
 *  WebAssembly compilation and nothing else. It is emphatically not
 *  'unsafe-eval', and a rule that matches loosely turns the fix into a
 *  finding. */
export const csp =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; object-src 'none'";
