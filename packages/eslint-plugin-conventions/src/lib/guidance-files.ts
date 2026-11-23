/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The shared model of agent guidance files the guidance-placement rules read:
 * which kind of file this is, its frontmatter, and its prose lines (fenced
 * code and frontmatter removed).
 *
 * Everything here is a fact a parser can tell. Whether a line is worth
 * keeping is a person's call, never this module's.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * `memory`: loaded into every session (CLAUDE.md, AGENTS.md, GEMINI.md).
 * `skill`: a skill body, loaded when its trigger matches.
 * `agent`: a subagent definition under `.claude/agents/`.
 */
export type GuidanceKind = 'memory' | 'skill' | 'agent';

const MEMORY_FILES: ReadonlySet<string> = new Set([
  'CLAUDE.md',
  'CLAUDE.local.md',
  'AGENTS.md',
  'GEMINI.md',
]);

export function guidanceKind(filename: string): GuidanceKind | null {
  const normalized = filename.replace(/\\/g, '/');
  const base = normalized.slice(normalized.lastIndexOf('/') + 1);
  if (MEMORY_FILES.has(base)) return 'memory';
  if (base === 'SKILL.md') return 'skill';
  if (/(?:^|\/)\.claude\/agents\/[^/]+\.md$/.test(normalized)) return 'agent';
  return null;
}

export interface Frontmatter {
  /**
   * Top-level keys and their values. A block scalar (`description: |` or
   * `>`) is its indented lines, joined; a block list (`tools:` then
   * `- Read` lines) is its items joined with `, `.
   */
  keys: Map<string, string>;
  /** 1-based line of the closing `---`. */
  endLine: number;
}

const BLOCK_SCALAR = /^([|>])[+-]?\d*$/;
const LIST_ITEM = /^\s*-\s+(.*)$/;

/** The leading `---` YAML block, read for its top-level keys only. */
export function frontmatter(lines: readonly string[]): Frontmatter | null {
  if (lines[0]?.trim() !== '---') return null;
  const keys = new Map<string, string>();
  let key: string | null = null;
  /** The indented lines under the current key. */
  let nested: string[] = [];
  const settle = (): void => {
    if (key !== null && nested.length)
      keys.set(key, nestedValue(keys.get(key) as string, nested));
    key = null;
    nested = [];
  };
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') {
      settle();
      return { keys, endLine: i + 1 };
    }
    const match = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (match) {
      settle();
      key = match[1];
      keys.set(key, match[2].trim());
    } else if (key !== null && /^(?:\s|-\s)/.test(line)) {
      nested.push(line.trim());
    }
  }
  return null;
}

/** The value of a key whose content sits on the indented lines below it. */
function nestedValue(head: string, nested: readonly string[]): string {
  const scalar = BLOCK_SCALAR.exec(head);
  if (scalar) return nested.join(scalar[1] === '|' ? '\n' : ' ').trim();
  // A plain scalar continues on its indented lines, folded with spaces.
  if (head !== '') return [head, ...nested].join(' ');
  return nested
    .map((l) => LIST_ITEM.exec(l)?.[1].trim() ?? '')
    .filter(Boolean)
    .join(', ');
}

export interface ProseLine {
  /** 1-based line number. */
  line: number;
  text: string;
}

const FENCE = /^\s{0,3}(`{3,}|~{3,})(.*)$/;

/** Every line outside frontmatter and fenced code. */
export function proseLines(lines: readonly string[]): ProseLine[] {
  const start = frontmatter(lines)?.endLine ?? 0;
  const prose: ProseLine[] = [];
  let fence: string | null = null;
  for (let i = start; i < lines.length; i++) {
    const text = lines[i];
    const open = FENCE.exec(text);
    if (fence) {
      // A closing fence is the same character, at least as long, and
      // nothing but whitespace after it.
      if (
        open &&
        open[1][0] === fence[0] &&
        open[1].length >= fence.length &&
        open[2].trim() === ''
      ) {
        fence = null;
      }
      continue;
    }
    if (open) {
      fence = open[1];
      continue;
    }
    prose.push({ line: i + 1, text });
  }
  return prose;
}

/** A file whose first lines say a tool wrote it. */
export function isGenerated(lines: readonly string[]): boolean {
  return lines
    .slice(0, 5)
    .some((l) => /\b(?:auto-?)?generated (?:by|from)\b|@generated\b/i.test(l));
}

/** `path` relative to `cwd`, with forward slashes. */
export function repoRelative(cwd: string, file: string): string {
  return path.relative(cwd, file).replace(/\\/g, '/');
}

/** Read a file, or `null` when it does not exist or cannot be read. */
export function readIfExists(file: string): string | null {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}
