/**
 * VULNERABLE - Express + TypeScript. `req.query.tpl` is typed
 * `string | string[] | ParsedQs`, so the handler casts it, and the cast is the
 * only thing between the query string and the template compiler.
 */
import Handlebars from 'handlebars';
import type { Request } from 'express';

export function renderBanner(req: Request): string {
  const render = Handlebars.compile(req.query.tpl as string);
  return render({ now: Date.now() });
}
