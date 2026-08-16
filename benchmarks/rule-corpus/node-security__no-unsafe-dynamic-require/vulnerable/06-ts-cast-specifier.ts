/**
 * VULNERABLE - TypeScript route. Express types `req.params` loosely enough that
 * the cast is required to compile; the cast is erased and the specifier is
 * still the request's.
 */
import type { Request, Response } from 'express';

interface Renderer {
  render(input: string): string;
}

export function renderWith(req: Request, res: Response): void {
  const rendererName = req.params.renderer as string;
  const renderer = require(rendererName) as Renderer;
  res.send(renderer.render(String(req.query.input)));
}
