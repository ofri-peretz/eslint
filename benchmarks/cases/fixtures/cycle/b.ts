// Half of a two-module cycle. `a.ts` imports this file; this file imports back.
// The case registry lints `a.ts`'s CONTENT as a string with that filename, so
// the resolver needs this file to exist on disk for the cycle to be real.
import { a } from './a';
export const b = a;
