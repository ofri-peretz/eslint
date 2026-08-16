/**
 * SAFE - ADVERSARIAL (nominal inference, reporting direction). The parsed value
 * is a module constant and the parser has entity processing off. There is no
 * attacker in this file at all.
 *
 * The only thing that distinguishes it from safe/07 is the spelling of the
 * constant: `metadata` contains the substring `data`.
 */
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ processEntities: false });

const metadata = '<meta><app>invoicer</app><schema>2</schema></meta>';

export function appMetadata() {
  return parser.parse(metadata);
}
