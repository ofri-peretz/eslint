/**
 * VULNERABLE (adversarial) - the tainted offset reaches the read through a
 * plain `const` ALIAS. Nothing about the danger changes; only the number of
 * bindings between the request and the index does.
 */
import { Buffer } from 'node:buffer';

const catalog = Buffer.alloc(2048);

export function entry(req) {
  const requested = Number(req.query.entry);
  const at = requested;
  return catalog.readUInt16LE(at);
}
