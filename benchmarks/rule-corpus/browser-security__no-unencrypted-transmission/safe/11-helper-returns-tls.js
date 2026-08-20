/**
 * SAFE - The DSN passes through a helper, which is the shape that defeats a
 * naive literal match. The helper returns the TLS scheme.
 */
function cluster(name) {
  return `mongodb+srv://${name}.acme-corp.io/app`;
}

export const primary = cluster('prod');
