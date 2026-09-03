/**
 * VULNERABLE - fast-xml-parser expands DOCTYPE entities when `processEntities`
 * is left on, and the shared parser instance is handed an attacker-supplied
 * feed body. The sink is `<receiver>.parse(<member expression>)` - the single
 * most common written form of an XML parse in Node.
 */
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ processEntities: true, ignoreAttributes: false });

export function ingestFeed(req) {
  return parser.parse(req.body.feed);
}
