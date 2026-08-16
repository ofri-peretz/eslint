/**
 * VULNERABLE - TypeScript job runner. `req.query.target` is typed
 * `string | string[] | ParsedQs | undefined`, so the handler MUST cast to
 * compile; the cast is erased and `bash -c` still re-parses the value.
 */
import type { Request, Response } from 'express';
import { spawn } from 'node:child_process';

export function runJob(req: Request, res: Response): void {
  const target = req.query.target as string;
  const child = spawn('bash', ['-c', `make ${target}`], { cwd: process.cwd() });
  child.on('exit', (code: number | null) => res.json({ code }));
}
