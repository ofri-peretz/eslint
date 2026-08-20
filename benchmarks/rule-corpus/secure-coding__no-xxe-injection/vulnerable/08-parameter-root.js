/**
 * VULNERABLE - The tainted root is a function parameter. The route handler
 * passes the raw body into a service method that owns the parser, which is how
 * the taint and the sink end up in different functions in every real codebase.
 */
import { DOMParser } from '@xmldom/xmldom';

export class ManifestService {
  parseManifest(manifestXml) {
    return new DOMParser().parseFromString(manifestXml, 'application/xml');
  }
}

export function uploadManifest(req, res) {
  const service = new ManifestService();
  res.json(service.parseManifest(req.body.manifest));
}
