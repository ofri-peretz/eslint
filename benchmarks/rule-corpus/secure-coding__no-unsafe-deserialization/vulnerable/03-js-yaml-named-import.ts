/**
 * VULNERABLE - The named-import form js-yaml's own v4 docs use
 * (`import { load } from 'js-yaml'`), plus the `as string` an Express+TS handler
 * cannot compile without: `req.body` is typed `any`, but `req.query.spec` is
 * `string | string[] | ParsedQs | undefined`.
 */
import { load } from 'js-yaml';
import type { Request, Response } from 'express';

export async function importPipeline(req: Request, res: Response): Promise<void> {
  const pipeline = load(req.query.spec as string);
  res.json({ stages: (pipeline as { stages: string[] }).stages });
}
