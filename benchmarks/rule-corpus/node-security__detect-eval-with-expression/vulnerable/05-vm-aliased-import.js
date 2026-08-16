/**
 * VULNERABLE - the named import, renamed. `runInThisContext` compiles in the
 * CURRENT global scope, which is strictly worse than a fresh context.
 */
import { runInThisContext as runIt } from 'node:vm';
import { readFile } from 'node:fs/promises';

export async function applyMacro(macroPath) {
  const source = await readFile(macroPath, 'utf8');
  return runIt(source, { filename: macroPath });
}
