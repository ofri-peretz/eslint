/**
 * ADVERSARIAL SAFE - the createRequire path the fix just opened, loading an
 * unrelated native addon. The new branch must recognise the loader without
 * reporting everything it loads.
 */
import { createRequire } from 'node:module';

const load = createRequire(import.meta.url);
const sqlite = load('better-sqlite3');

export const open = (file) => new sqlite(file, { readonly: true });
