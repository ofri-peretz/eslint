import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Copy every `.js` from `fromDir` over the matching path under `toDir`.
 *
 * Used by build-package.ts to overlay the comment-stripped JavaScript onto
 * dist/. Since tsconfig.lib.json sets `emitDeclarationOnly`, the first tsc pass
 * emits ONLY declarations — this overlay is the sole producer of the runtime
 * code that ships.
 *
 * That is why the copy is unconditional and creates its target directories. An
 * earlier version copied only where the target already existed, which worked
 * solely because pass 1 had put a .js there. Re-introducing that guard now
 * would copy nothing and publish packages containing declarations and no
 * executable code.
 *
 * @returns number of .js files copied — the caller treats 0 as a hard failure.
 */
export function overlayJs(fromDir: string, toDir: string): number {
  let copied = 0;
  for (const entry of readdirSync(fromDir, { withFileTypes: true })) {
    const from = join(fromDir, entry.name);
    const to = join(toDir, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(to, { recursive: true });
      copied += overlayJs(from, to);
    } else if (entry.name.endsWith('.js')) {
      mkdirSync(toDir, { recursive: true });
      copyFileSync(from, to);
      copied++;
    }
  }
  return copied;
}
