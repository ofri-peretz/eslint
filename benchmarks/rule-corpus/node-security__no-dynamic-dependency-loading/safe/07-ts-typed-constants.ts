/**
 * SAFE - TypeScript type syntax over static specifiers. `as const`, a type
 * annotation and a non-null assertion all disappear at compile time; the
 * string that reaches the loader is the literal written here.
 */
const DRIVER = 'pg' as const;
const CLIENT: string = 'redis';

export const database = require(DRIVER);
export const cache = require(CLIENT!);

export async function metrics(): Promise<unknown> {
  return import('prom-client');
}
