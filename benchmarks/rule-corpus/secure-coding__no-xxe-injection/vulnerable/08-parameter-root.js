/**
 * VULNERABLE - The tainted root is a function parameter. The route handler
 * passes the raw body into a service method that owns the parser, which is how
 * the taint and the sink end up in different functions in every real codebase.
 *
 * On libxmljs2 since 2026-08-24: the shape under test is the parameter root,
 * and @xmldom/xmldom - which this used to import - cannot resolve an external
 * entity, so it could not carry the vulnerability the shape is meant to show.
 */
const libxmljs = require('libxmljs2');

class ManifestService {
  parseManifest(manifestXml) {
    return libxmljs.parseXml(manifestXml);
  }
}

function uploadManifest(req, res) {
  const service = new ManifestService();
  res.json({ root: service.parseManifest(req.body.manifest).root().name() });
}

module.exports = { ManifestService, uploadManifest };
