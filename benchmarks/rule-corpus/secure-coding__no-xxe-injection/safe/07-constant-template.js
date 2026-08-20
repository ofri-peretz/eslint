/**
 * SAFE - The parsed document is a constant that ships with the source. There is
 * no attacker anywhere in this data path, so no parser configuration can make
 * it an XXE.
 */
import { XMLParser } from 'fast-xml-parser';

const SEED_CATALOGUE = '<catalogue><item sku="A-1">Desk</item></catalogue>';

export function seedCatalogue() {
  const parser = new XMLParser();
  return parser.parse(SEED_CATALOGUE);
}
