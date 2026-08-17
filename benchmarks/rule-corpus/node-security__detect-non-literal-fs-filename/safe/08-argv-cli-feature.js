/** SAFE (deliberately) - for a CLI, reading the file named on the command line
 * IS the feature. Whoever controls argv controls the process. */
import fs from 'fs';
export function main() {
  return fs.readFileSync(process.argv[2], 'utf8');
}
