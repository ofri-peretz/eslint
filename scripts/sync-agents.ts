#!/usr/bin/env tsx

/**
 * sync-agents.ts — copy shared assets from the sibling `../agents` repo.
 *
 * Sync targets are declared statically in SYNC_CONFIG below:
 *   • Public: shadcn UI components → apps/docs/src/components/ui
 *   • Private: content/digital-footprint → apps/docs/.agents-data/content
 *
 * If `../agents` doesn't exist locally (typical for OSS contributors), the
 * script is a no-op and exits 0.
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import process from 'node:process';

interface SyncEntry {
  name: string;
  /** `public` = committed to this OSS repo. `private` = path is gitignored. */
  type: 'public' | 'private';
  source: string;
  target: string;
  description: string;
}

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const AGENTS_REPO_DIR = path.resolve(ROOT_DIR, '../agents');

const SYNC_CONFIG: SyncEntry[] = [
  {
    name: 'UI Components',
    type: 'public',
    source: path.join(AGENTS_REPO_DIR, 'packages/ui/src/components'),
    target: path.join(ROOT_DIR, 'apps/docs/src/components/ui'),
    description: 'Shared shadcn UI components',
  },
  {
    name: 'Digital Footprint Data',
    type: 'private',
    source: path.join(AGENTS_REPO_DIR, 'content/digital-footprint'),
    target: path.join(ROOT_DIR, 'apps/docs/.agents-data/content'),
    description: 'Private analytics and content data',
  },
];

function syncDirectory(config: SyncEntry): void {
  console.log(`\n🔄 Syncing: ${config.name} (${config.type})`);
  console.log(`   From: ${config.source}`);
  console.log(`   To:   ${config.target}`);

  if (!fs.existsSync(config.source)) {
    console.log(`   ⚠️ Source not found. Skipping.`);
    return;
  }

  try {
    if (!fs.existsSync(config.target)) {
      fs.mkdirSync(config.target, { recursive: true });
    }
    fs.cpSync(config.source, config.target, { recursive: true, force: true });
    console.log(`   ✅ Successfully synchronized ${config.name}.`);
  } catch (err) {
    console.error(`   ❌ Failed to synchronize ${config.name}:`, (err as Error).message);
  }
}

function main(): void {
  console.log('🛡️  Interlace Agents Sync Bridge');
  console.log('==================================');

  if (!fs.existsSync(AGENTS_REPO_DIR)) {
    console.log('⚠️  The ../agents repository was not found locally.');
    console.log('   Skipping synchronization. This is normal for open-source contributors.');
    process.exit(0);
  }

  for (const config of SYNC_CONFIG) {
    syncDirectory(config);
  }

  console.log('\n✅ Sync complete.');
}

try {
  main();
} catch (err) {
  console.error('Fatal error during sync:', err);
  process.exit(1);
}
