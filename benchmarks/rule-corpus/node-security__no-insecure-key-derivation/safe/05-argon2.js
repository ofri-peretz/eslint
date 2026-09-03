/**
 * SAFE - Argon2id, the other recommended alternative.
 */
import argon2 from 'argon2';

export const hashPassword = (password) =>
  argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });
