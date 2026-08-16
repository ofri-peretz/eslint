/**
 * VULNERABLE (adversarial) - the same squatted literal wearing a TypeScript
 * `as string` cast, and a `const` alias with an explicit type annotation. A
 * cast changes no runtime value; `require` receives the string `'loadsh'`.
 */
const ADAPTER: string = 'expres';

export const util = require('loadsh' as string);
export const server = require(ADAPTER);

export function bootstrap(port: number): unknown {
  return server().listen(port);
}
