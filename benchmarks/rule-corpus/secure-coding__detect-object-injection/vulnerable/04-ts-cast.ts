/**
 * TypeScript `as string` on the key.
 *
 * The cast makes the compiler stop asking; it does not make the value safe. The
 * document is a plain object, so `__proto__` still resolves to the prototype
 * setter — the type system has nothing to say about that at runtime.
 */
import type { Request, Response } from 'express';

import { documentRepository } from '../repositories/document-repository';

export async function patchDocument(req: Request, res: Response): Promise<void> {
  const field = req.body.field as string;
  const document = await documentRepository.byId(req.params.id);

  document[field] = req.body.value;
  await documentRepository.save(document);

  res.json({ document });
}
