/**
 * SAFE - The correct remediation for fixture vulnerable/03. fast-xml-parser
 * takes its entity policy on the CONSTRUCTOR, not on `parse`, so the proof that
 * this call is safe lives at the construction site of the receiver.
 */
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ processEntities: false, ignoreAttributes: false });

export function ingestFeed(req) {
  return parser.parse(req.body.feed);
}
