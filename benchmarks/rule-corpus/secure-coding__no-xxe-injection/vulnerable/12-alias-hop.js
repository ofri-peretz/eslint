/**
 * VULNERABLE - ADVERSARIAL. The sink is reached through a `const` alias, so the
 * call site is a bare Identifier callee with no receiver to inspect. Extracting
 * a hot library method into a local is ordinary practice.
 */
import libxmljs from 'libxmljs2';

const parseDocument = libxmljs.parseXml;

export function importCatalogue(req) {
  return parseDocument(req.body.catalogue, { noent: true });
}
