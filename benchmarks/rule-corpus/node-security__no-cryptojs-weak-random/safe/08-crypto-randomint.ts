/**
 * SAFE - a CSPRNG-backed integer draw with the cast a TypeScript caller writes
 * when the bound comes from config.
 */
import { randomInt } from 'node:crypto';

export function pickShard(config: { shards: unknown }): number {
  return randomInt(0, Number(config.shards as string));
}
