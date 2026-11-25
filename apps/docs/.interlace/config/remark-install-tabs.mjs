/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * Install commands in every package manager. A shell fence whose every line is an
 * `npm install` (```` ```bash ```` then `npm install some-package`) becomes fumadocs' `npm`
 * fence, which `remarkNpm` turns into one tab each for npm, pnpm, yarn and bun, the choice
 * kept across pages. Pages keep writing the npm line, as the READMEs do; a reader on pnpm
 * copies their own command instead of translating it.
 *
 * Only installs: `npx <bin>` has no one translation (`pnpm dlx` fetches a fresh copy, where
 * the page means the one just installed), so a fence with any other line is left as it is.
 *
 * Ported from burgee's docs-chassis (`apps/docs-chassis/src/remark-install-tabs.mjs`).
 */
import { remarkNpm } from 'fumadocs-core/mdx-plugins';

const SHELLS = new Set(['bash', 'sh', 'shell', 'zsh']);
const INSTALL = /^npm (?:install|i|add)(?: [\w@./=-]+)+$/;

/** The tab choice is one setting for the whole site, so a pnpm reader stays on pnpm. */
export const PACKAGE_MANAGER_GROUP = 'package-manager';

/** Whether a fence is only install commands, so its other-manager tabs say the same thing. */
export function isInstallFence(node) {
  if (
    node.type !== 'code' ||
    !SHELLS.has(node.lang ?? '') ||
    (node.meta ?? '') !== ''
  )
    return false;
  const lines = node.value.split('\n').filter((line) => line.trim() !== '');
  return lines.length > 0 && lines.every((line) => INSTALL.test(line.trim()));
}

function markInstalls(node) {
  if (isInstallFence(node)) node.lang = 'npm';
  for (const child of node.children ?? []) markInstalls(child);
}

/** Marks the install fences, then hands them to fumadocs' own `remarkNpm`. */
export function remarkInstallTabs() {
  const tabs = remarkNpm({ persist: { id: PACKAGE_MANAGER_GROUP } });
  return (tree, file) => {
    markInstalls(tree);
    return tabs(tree, file);
  };
}
