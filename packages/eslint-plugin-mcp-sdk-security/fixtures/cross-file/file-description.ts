/**
 * Cross-file fixture for no-tool-description-injection: a description read
 * from a file's CONTENTS in its own module.
 */
import { readFileSync } from 'node:fs';

export const FILE_DESCRIPTION = readFileSync(
  new URL('./description.md', import.meta.url),
  'utf8',
);
export const LOCAL_DESCRIPTION = 'Search the docs';
