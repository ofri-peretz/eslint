#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_ROOT = fileURLToPath(new URL('../src/', import.meta.url));
const DIST_ROOT = fileURLToPath(new URL('../dist/', import.meta.url));

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

const useClientFiles = new Set();
for await (const file of walk(SRC_ROOT)) {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
  const content = await readFile(file, 'utf8');
  const firstLine = content.trimStart().split('\n', 1)[0];
  if (/^["']use client["'];?\s*$/.test(firstLine)) {
    const rel = relative(SRC_ROOT, file).replace(/\.tsx?$/, '.js');
    useClientFiles.add(rel);
  }
}

let patched = 0;
for await (const file of walk(DIST_ROOT)) {
  if (!file.endsWith('.js')) continue;
  const rel = relative(DIST_ROOT, file);
  if (!useClientFiles.has(rel)) continue;
  const content = await readFile(file, 'utf8');
  if (
    content.startsWith('"use client"') ||
    content.startsWith("'use client'")
  )
    continue;
  await writeFile(file, `"use client";\n${content}`);
  patched++;
}

console.log(
  `Preserved "use client" in ${patched}/${useClientFiles.size} file(s)`,
);
