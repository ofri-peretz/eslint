#!/usr/bin/env node
/**
 * Build a shadcn-compatible registry from `packages/ui/src/primitives/*.tsx`.
 *
 * Output: `apps/registry/public/r/<name>.json` per the shadcn registry-item
 * schema (https://ui.shadcn.com/schema/registry-item.json). Plus an
 * `index.json` listing every available item.
 *
 * Consumer usage (when deployed):
 *
 *   npx shadcn add https://ds.interlace.tools/r/button.json
 *
 * Run with `--check` to validate without writing (used by CI drift check).
 */

import { readFile, readdir, writeFile, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_ROOT = path.resolve(SCRIPT_DIR, '..');
const REPO_ROOT = path.resolve(REGISTRY_ROOT, '..', '..');
const PRIMITIVES_DIR = path.join(REPO_ROOT, 'packages/ui/src/primitives');
const OUT_DIR = path.join(REGISTRY_ROOT, 'public/r');
const HOMEPAGE = 'https://ds.interlace.tools';
const CHECK_ONLY = process.argv.includes('--check');

// ─── Heuristic dependency extraction ─────────────────────────────────────────

const NPM_IMPORT_RE = /from\s+['"]([^.@/][^'"]*|@[^/]+\/[^'"]+)['"]/g;
const RELATIVE_IMPORT_RE = /from\s+['"](\.\/[^'"]+)['"]/g;

const collectDependencies = (source) => {
  const deps = new Set();
  for (const m of source.matchAll(NPM_IMPORT_RE)) {
    const pkg = m[1].startsWith('@')
      ? m[1].split('/').slice(0, 2).join('/')
      : m[1].split('/')[0];
    if (pkg === 'react' || pkg === 'react-dom') continue;
    deps.add(pkg);
  }
  return [...deps].sort();
};

const collectRegistryDependencies = (source) => {
  const deps = new Set();
  for (const m of source.matchAll(RELATIVE_IMPORT_RE)) {
    const rel = m[1].replace(/^\.\//, '').replace(/\.js$|\.tsx?$/, '');
    if (rel.includes('/')) continue; // skip nested helpers
    if (rel === 'button-variants' || rel === 'cn') continue; // packaged with primitive
    deps.add(rel);
  }
  return [...deps].sort();
};

// ─── Per-primitive registry item ─────────────────────────────────────────────

const buildItem = async (filePath, fileName) => {
  const source = await readFile(filePath, 'utf8');
  const name = fileName.replace(/\.tsx$/, '');
  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name,
    type: 'registry:ui',
    title: name.replace(/(^|-)([a-z])/g, (_, dash, c) =>
      dash ? ' ' + c.toUpperCase() : c.toUpperCase(),
    ),
    description: `@interlace/ui — ${name} primitive (shadcn-compatible).`,
    dependencies: collectDependencies(source),
    registryDependencies: collectRegistryDependencies(source),
    files: [
      {
        path: `registry/interlace-ui/${name}.tsx`,
        target: `components/ui/${name}.tsx`,
        type: 'registry:ui',
        content: source,
      },
    ],
  };
};

// ─── Main ────────────────────────────────────────────────────────────────────

const main = async () => {
  await stat(PRIMITIVES_DIR);
  const files = (await readdir(PRIMITIVES_DIR))
    .filter((f) => f.endsWith('.tsx'))
    .sort();

  if (CHECK_ONLY) {
    // Drift check: rebuild in-memory + diff against on-disk.
    const errors = [];
    for (const file of files) {
      const built = await buildItem(path.join(PRIMITIVES_DIR, file), file);
      const outPath = path.join(OUT_DIR, `${built.name}.json`);
      try {
        const current = JSON.parse(await readFile(outPath, 'utf8'));
        if (JSON.stringify(current) !== JSON.stringify(built)) {
          errors.push(`drift: ${built.name}`);
        }
      } catch {
        errors.push(`missing: ${built.name}`);
      }
    }
    if (errors.length) {
      console.error('Registry drift detected:\n  ' + errors.join('\n  '));
      process.exit(1);
    }
    console.log(`OK — ${files.length} item(s) match on-disk.`);
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  const index = {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'interlace-ui',
    homepage: HOMEPAGE,
    items: [],
  };

  for (const file of files) {
    const built = await buildItem(path.join(PRIMITIVES_DIR, file), file);
    await writeFile(
      path.join(OUT_DIR, `${built.name}.json`),
      JSON.stringify(built, null, 2) + '\n',
      'utf8',
    );
    index.items.push({
      name: built.name,
      type: built.type,
      title: built.title,
      description: built.description,
    });
  }

  await writeFile(
    path.join(OUT_DIR, 'index.json'),
    JSON.stringify(index, null, 2) + '\n',
    'utf8',
  );

  console.log(`Built ${files.length} registry item(s) → ${OUT_DIR}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
