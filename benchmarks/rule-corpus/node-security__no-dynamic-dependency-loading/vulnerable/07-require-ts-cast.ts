/**
 * VULNERABLE - a TypeScript `as string` cast over a request-derived value. The
 * cast is erased at compile time and asserts nothing about the runtime value;
 * `require` still receives whatever the client sent.
 */
interface MiddlewareRequest {
  headers: Record<string, unknown>;
}

export function loadMiddleware(req: MiddlewareRequest): unknown {
  const chain = req.headers['x-middleware-chain'] as string;
  const middleware = require(chain as string);
  return middleware.handler;
}
