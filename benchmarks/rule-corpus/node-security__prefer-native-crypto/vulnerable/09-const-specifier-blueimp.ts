/**
 * VULNERABLE - the specifier hoisted to a module constant, which is how a file
 * that requires several vendored packages in a loop-free list is written. The
 * dependency is blueimp-md5 (CWE-1104).
 */
const HASH_PACKAGE = 'blueimp-md5';

const md5 = require(HASH_PACKAGE) as (value: string) => string;

export const gravatar = (email: string): string =>
  `https://www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}`;
