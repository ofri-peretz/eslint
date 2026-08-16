/**
 * VULNERABLE (adversarial, CWE-789 arm) - a FAKE mitigation. `Math.min` looks
 * like a clamp, but both operands are values the same peer supplies, so the
 * peer still picks the allocation. A clamp is only a clamp against a bound the
 * peer cannot move.
 */
import { Buffer } from 'node:buffer';

export function reserveWindow(req) {
  const requested = Number(req.body.windowBytes);
  const advertised = Number(req.body.maxWindowBytes);
  return Buffer.alloc(Math.min(requested, advertised));
}
