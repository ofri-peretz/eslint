/**
 * SAFE - @xmldom/xmldom cannot resolve an external entity, so a document off
 * the wire cannot make it read a file. Probed 2026-08-24 against
 * `<!ENTITY xxe SYSTEM "file:///…">` over a canary: the parser left `&xxe;`
 * unresolved and logged "entity not found".
 *
 * This file was in `vulnerable/` until then, on the stated premise that
 * "@xmldom/xmldom ships a SERVER-side DOMParser ... it will honour a DTD".
 * The premise was never tested. The seal's corpus axis says outright that a
 * human must confirm the fixtures came from the vulnerability rather than from
 * the rule; this is that confirmation, and it went the other way.
 */
import { DOMParser } from '@xmldom/xmldom';

export function readSitemap(req) {
  const parser = new DOMParser();
  return parser.parseFromString(req.file.buffer.toString('utf8'), 'text/xml');
}
