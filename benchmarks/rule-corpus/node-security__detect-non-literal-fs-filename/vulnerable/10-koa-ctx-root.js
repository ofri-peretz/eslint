/** VULNERABLE - Koa spells the request `ctx`. A taint list naming only `req`
 * is blind to a whole framework. */
import fs from 'fs';
export async function handler(ctx) {
  ctx.body = fs.readFileSync(ctx.query.file);
}
