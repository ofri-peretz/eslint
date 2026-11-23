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
  /** Top-level keys and their raw single-line values. */
  keys: Map<string, string>;
  /** 1-based line of the closing `---`. */
  endLine: number;
}

/** The leading `---` YAML block, read for its top-level keys only. */
export function frontmatter(lines: readonly string[]): Frontmatter | null {
  if (lines[0]?.trim() !== '---') return null;
  const keys = new Map<string, string>();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') return { keys, endLine: i + 1 };
    const match = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (match) keys.set(match[1], match[2].trim());
  }
  return null;
}

export interface ProseLine {
  /** 1-based line number. */
  line: number;
  text: string;
}

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

/** Every line outside frontmatter and fenced code. */
export function proseLines(lines: readonly string[]): ProseLine[] {
  const start = frontmatter(lines)?.endLine ?? 0;
  const prose: ProseLine[] = [];
  let fence: string | null = null;
  for (let i = start; i < lines.length; i++) {
    const text = lines[i];
    const open = FENCE.exec(text);
    if (fence) {
      if (open && open[1][0] === fence[0] && open[1].length >= fence.length) {
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
