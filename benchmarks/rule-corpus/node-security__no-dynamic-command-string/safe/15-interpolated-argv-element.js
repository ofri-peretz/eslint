/**
 * SAFE (adversarial) - an interpolated argv element that is NOT a command
 * string. jq receives its filter as one argument and never re-parses it as a
 * shell command line; a rule that fired on "interpolation anywhere in argv"
 * would report this.
 */
import { execFile } from 'node:child_process';

export function readItemName(index, file) {
  return execFile('jq', ['-r', `.items[${index}].name`, file], { encoding: 'utf8' });
}
