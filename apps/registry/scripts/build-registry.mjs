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

// ─── Consumer-side import rewriting ──────────────────────────────────────────

/**
 * Rewrite source-internal relative imports to consumer-facing shadcn aliases.
 *
 * The package source uses `../lib/cn.js` and `./button.js` because those resolve
 * inside `@interlace/ui` (compiled from `packages/ui/src/`). But `shadcn add`
 * writes the source verbatim into the consumer's `components/ui/<name>.tsx`,
 * where no `../lib/` or sibling `.js` exists. Consumers configure aliases in
 * `components.json` (`utils → @/lib/utils`, `ui → @/components/ui`) — rewrite
 * to those before embedding so the consumer's tree resolves out of the box.
 *
 * Mapping:
 *   `../lib/cn.js`                    → `@/lib/utils`
 *   `../lib/use-reduced-motion.js`    → `@/hooks/use-reduced-motion`
 *   `./<sibling>.js`                  → `@/components/ui/<sibling>`
 */
const rewriteImportsForConsumer = (source) =>
  source
    .replace(/from\s+(['"])\.\.\/lib\/cn\.js\1/g, 'from $1@/lib/utils$1')
    .replace(
      /from\s+(['"])\.\.\/lib\/(use-[\w-]+)\.js\1/g,
      'from $1@/hooks/$2$1',
    )
    .replace(
      /from\s+(['"])\.\/([\w-]+)\.js\1/g,
      'from $1@/components/ui/$2$1',
    );

// ─── Per-primitive registry item ─────────────────────────────────────────────

const readOptionalMeta = async (filePath) => {
  const metaPath = filePath.replace(/\.tsx$/, '.meta.json');
  try {
    return JSON.parse(await readFile(metaPath, 'utf8'));
  } catch {
    return null;
  }
};

const buildItem = async (filePath, fileName) => {
  const source = await readFile(filePath, 'utf8');
  const name = fileName.replace(/\.tsx$/, '');
  const meta = await readOptionalMeta(filePath);
  const item = {
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
        content: rewriteImportsForConsumer(source),
      },
    ],
  };
  // Optional sibling `<name>.meta.json` adds shadcn-schema fields the source
  // file can't express on its own — cssVars (theme tokens), css (keyframes /
  // @theme entries). Used by primitives that depend on a CSS-side companion.
  if (meta?.cssVars) item.cssVars = meta.cssVars;
  if (meta?.css) item.css = meta.css;
  return item;
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
