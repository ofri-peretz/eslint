/**
 * VULNERABLE (adversarial) - `export ... from` is a module load. A barrel file
 * is the single most common place a dependency name is written in a modern
 * codebase, and `export { x } from 'axois'` installs and executes the impostor
 * exactly as `import` would.
 */
export { default as http, isAxiosError } from 'axois';
export { chunk, uniq } from 'loadsh';

export const clientName = 'internal-http';
