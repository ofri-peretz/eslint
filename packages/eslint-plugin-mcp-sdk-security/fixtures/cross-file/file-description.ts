/**
 * Cross-file fixture for no-tool-description-injection: descriptions read
 * from a file's CONTENTS in their own module — one beside this module (ships
 * with the server), one relative to the working directory (does not).
 */
import { readFileSync } from 'node:fs';

export const FILE_DESCRIPTION = readFileSync(
  new URL('./description.md', import.meta.url),
  'utf8',
);
/** Relative to the working directory — the user's project for a stdio server. */
export const CWD_DESCRIPTION = readFileSync('./TOOLS.md', 'utf8');
export const LOCAL_DESCRIPTION = 'Search the docs';
