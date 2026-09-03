/**
 * SAFE - TypeScript, the remediated shape. `Buffer.from` with a cast argument;
 * the cast is exactly the syntax a TS Express handler is forced to write, and
 * it must not turn a safe call into a finding.
 */
import { Buffer } from 'node:buffer';
import type { Request } from 'express';

export function bodyBytes(req: Request): Buffer {
  const encoded = req.query.payload as string;
  return Buffer.from(encoded, 'base64');
}
