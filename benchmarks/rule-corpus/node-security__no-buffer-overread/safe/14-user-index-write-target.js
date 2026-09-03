/**
 * SAFE for CWE-126 (adversarial) - the index IS attacker-controlled, and the
 * buffer IS a real Buffer, but the access is a WRITE. Writing past the end is
 * CWE-787 with a different fix; a rule that reports it under CWE-126 tells the
 * reader the wrong thing about what is wrong.
 */
import { Buffer } from 'node:buffer';

const scoreboard = Buffer.alloc(256);

export function record(req) {
  scoreboard[Number(req.body.slot)] = Number(req.body.score) & 0xff;
  return scoreboard.length;
}
