/**
 * VULNERABLE - @xmldom/xmldom ships a SERVER-side DOMParser. Unlike the browser
 * global of the same name it will honour a DTD, and the document here is a
 * multipart upload straight off the wire.
 */
import { DOMParser } from '@xmldom/xmldom';

export function readSitemap(req) {
  const parser = new DOMParser();
  return parser.parseFromString(req.file.buffer.toString('utf8'), 'text/xml');
}
