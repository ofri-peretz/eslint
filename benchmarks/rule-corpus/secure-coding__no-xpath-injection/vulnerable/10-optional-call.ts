/**
 * VULNERABLE (adversarial) - Optional call syntax. `doc?.evaluate?.(expr)` is
 * the same evaluation with two extra null checks; the AST node type changes and
 * the injection does not.
 */
import type { Request } from 'express';

interface Evaluable {
  evaluate?(expression: string, context: unknown): { snapshotLength: number };
}

export function countLines(doc: Evaluable, req: Request): number {
  return doc?.evaluate?.('//invoice[@id="' + String(req.params.id) + '"]/line', doc)
    ?.snapshotLength ?? 0;
}
