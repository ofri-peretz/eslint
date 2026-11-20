#!/usr/bin/env -S npx tsx
/**
 * generate-plugin-agents-md.ts — writes packages/eslint-plugin-*\/AGENTS.md.
 *
 *   npm run agents-md           # rewrite every file
 *   npm run agents-md -- --check  # exit 1 if any file is stale (the lock test does the same)
 *
 * Reads each plugin from its built dist (`npx turbo run build
 * --filter='eslint-plugin-*'` first); scripts/__tests__/plugin-agents-md.lock.test.ts
 * reads the TypeScript source instead and must agree.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  AGENTS_MD_EXCLUDED,
  factsFrom,
  renderAgentsMd,
} from './lib/plugin-agents-md.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = join(ROOT, 'packages');
const CHECK = process.argv.includes('--check');
const require = createRequire(import.meta.url);
const stack = JSON.parse(
  readFileSync(
    join(ROOT, 'skills/security-linting/references/stack-map.json'),
    'utf8',
  ),
);

async function main(): Promise<void> {
  let stale = 0;
  for (const dir of readdirSync(PACKAGES).sort()) {
    if (!dir.startsWith('eslint-plugin-')) continue;
    if ((AGENTS_MD_EXCLUDED as readonly string[]).includes(dir)) continue;
    const pkgPath = join(PACKAGES, dir, 'package.json');
    const entry = join(PACKAGES, dir, 'dist/src/index.js');
    if (!existsSync(entry)) {
      console.error(
        `${dir}: no dist/src/index.js. Build first: npx turbo run build --filter='eslint-plugin-*'`,
      );
      process.exit(2);
    }
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const target = join(PACKAGES, dir, 'AGENTS.md');
    const md = await renderAgentsMd(
      factsFrom(pkg, require(entry)),
      stack,
      target,
    );
    const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
    if (current === md) continue;
    if (CHECK) {
      stale++;
      console.error(`stale: packages/${dir}/AGENTS.md`);
    } else {
      writeFileSync(target, md);
      console.log(`wrote packages/${dir}/AGENTS.md`);
    }
  }
  if (CHECK && stale) {
    console.error(`${stale} stale. Run: npm run agents-md`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
