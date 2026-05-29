import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  type ComponentMetadata,
  extractMetadata,
} from './component-metadata';

/**
 * Server-side helper to load registry-item JSON during page rendering.
 * The build runs `scripts/build-registry.mjs` (prebuild step) to populate
 * `public/r/*.json` from `packages/ui/src/primitives/*.tsx`. Pages read those
 * JSON files to render previews and source.
 */

export type RegistryFile = {
  path: string;
  target: string;
  type: string;
  content: string;
};

export type RegistryItem = {
  name: string;
  type: string;
  title: string;
  description: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files: RegistryFile[];
};

export type EnrichedItem = RegistryItem & {
  metadata: ComponentMetadata;
};

export type RegistryIndex = {
  name: string;
  homepage: string;
  items: Array<Pick<RegistryItem, 'name' | 'type' | 'title' | 'description'>>;
};

const PUBLIC_R = join(process.cwd(), 'public', 'r');

export const loadIndex = async (): Promise<RegistryIndex> => {
  const raw = await readFile(join(PUBLIC_R, 'index.json'), 'utf8');
  return JSON.parse(raw) as RegistryIndex;
};

export const loadItem = async (name: string): Promise<RegistryItem | null> => {
  try {
    const raw = await readFile(join(PUBLIC_R, `${name}.json`), 'utf8');
    return JSON.parse(raw) as RegistryItem;
  } catch {
    return null;
  }
};

export const listItemNames = async (): Promise<string[]> => {
  const entries = await readdir(PUBLIC_R);
  return entries
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
};

export const loadEnrichedItem = async (
  name: string,
): Promise<EnrichedItem | null> => {
  const item = await loadItem(name);
  if (!item) return null;
  const content = item.files[0]?.content ?? '';
  return { ...item, metadata: extractMetadata(content) };
};

export const loadEnrichedIndex = async (): Promise<
  Array<RegistryIndex['items'][number] & { metadata: ComponentMetadata | null }>
> => {
  const index = await loadIndex();
  const entries = await Promise.all(
    index.items.map(async (item) => {
      // Style items don't carry primitive source; skip the metadata extract.
      if (item.type !== 'registry:ui') {
        return { ...item, metadata: null };
      }
      const full = await loadItem(item.name);
      if (!full) return { ...item, metadata: null };
      const content = full.files[0]?.content ?? '';
      return { ...item, metadata: extractMetadata(content) };
    }),
  );
  return entries;
};
