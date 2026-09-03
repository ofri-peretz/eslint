/**
 * SAFE - a CLI argument parser. `process.argv.slice(2)` is an array of
 * strings; `args[patternIndex + 1]` is an ordinary array read. Neither the
 * receiver nor the index has anything to do with buffer memory.
 */
import process from 'node:process';

export function parse() {
  const args = process.argv.slice(2);
  const patternIndex = args.indexOf('--pattern');
  const pattern = patternIndex === -1 ? null : args[patternIndex + 1];
  return { pattern };
}
