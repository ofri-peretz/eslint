/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Remove suggestions ESLint throws away.
 *
 * `suggest: [{ messageId: 'x', fix: () => null }]` renders for nobody. Verified
 * against `linter.verify`: ESLint's report translator DROPS any suggestion whose
 * fix yields no edit, so the message comes back with no `suggestions` array at
 * all. Meanwhile `hasSuggestions: true` advertises that the rule offers them.
 *
 * The remediation text attached to those messageIds is therefore invisible — and
 * for plugins whose stated advantage IS the quality of their guidance, that is a
 * product gap, not a cosmetic one. Every one of them duplicates advice the
 * primary message already carries in its `fix:` line, which does render.
 *
 * WHAT THIS TOUCHES
 *
 *   - deletes `suggest: [...]` blocks whose every fix is `() => null`
 *   - deletes messageIds that become unreachable as a result
 *   - deletes `hasSuggestions` when no suggestion survives
 *
 * It does NOT touch a suggestion with a real fixer, or a mixed block where some
 * fix does something. Those are legitimate and tested elsewhere.
 *
 * Usage:
 *   tsx scripts/codemod-inert-suggestions.ts --dry
 *   tsx scripts/codemod-inert-suggestions.ts --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PACKAGES = path.resolve(__dirname, '..', 'packages');

/** Balanced-bracket scan from an opening delimiter. */
function balancedFrom(src: string, start: number, open: string, close: string): number {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Every `suggest: [ ... ]` block in the source, with its bounds. */
function suggestBlocks(src: string): { start: number; end: number; body: string }[] {
  const out: { start: number; end: number; body: string }[] = [];
  const re = /\bsuggest\s*:\s*\[/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const open = src.indexOf('[', m.index);
    const close = balancedFrom(src, open, '[', ']');
    if (close === -1) continue;
    out.push({ start: m.index, end: close, body: src.slice(open, close + 1) });
  }
  return out;
}

const INERT_FIX = /\bfix\s*:\s*(?:\([^)]*\)|\w+)\s*=>\s*(?:null|undefined|\[\s*\])/g;
const ANY_FIX = /\bfix\s*:/g;

function processRule(file: string): { changed: boolean; removedIds: string[] } {
  const original = fs.readFileSync(file, 'utf8');
  let src = original;
  const removedIds: string[] = [];

  // Work back-to-front so earlier offsets stay valid.
  for (const block of suggestBlocks(src).reverse()) {
    const inert = (block.body.match(INERT_FIX) ?? []).length;
    const total = (block.body.match(ANY_FIX) ?? []).length;
    // Only when EVERY fix in the block is inert. A mixed block is left alone.
    if (inert === 0 || inert !== total) continue;

    for (const idMatch of block.body.matchAll(/messageId\s*:\s*'(\w+)'/g)) {
      removedIds.push(idMatch[1]);
    }

    // Swallow a trailing comma and the whitespace the property sat on.
    let end = block.end + 1;
    while (end < src.length && /[,\s]/.test(src[end])) {
      if (src[end] === ',') { end++; break; }
      end++;
    }
    let start = block.start;
    while (start > 0 && /[ \t]/.test(src[start - 1])) start--;
    if (src[start - 1] === '\n') start--;
    src = src.slice(0, start) + src.slice(end);
  }

  if (removedIds.length === 0) return { changed: false, removedIds: [] };

  // Drop messageIds no longer reachable, and their union-type members.
  const stillUsed = (id: string): boolean =>
    new RegExp(`messageId\\s*:\\s*'${id}'`).test(src) ||
    new RegExp(`messageId\\s*:\\s*${id}\\b`).test(src);

  const orphaned = [...new Set(removedIds)].filter((id) => !stillUsed(id));
  for (const id of orphaned) {
    // meta.messages entry: `id: formatLLMMessage({ ... }),`
    const decl = new RegExp(`^\\s*${id}\\s*:\\s*formatLLMMessage\\(`, 'm').exec(src);
    if (decl) {
      const open = src.indexOf('(', decl.index);
      const close = balancedFrom(src, open, '(', ')');
      if (close !== -1) {
        let end = close + 1;
        while (end < src.length && /[,\s]/.test(src[end])) {
          if (src[end] === ',') { end++; break; }
          end++;
        }
        src = src.slice(0, decl.index) + src.slice(end);
      }
    }
    // The MessageIds union member.
    src = src.replace(new RegExp(`\\s*\\|\\s*'${id}'`), '');
    src = src.replace(new RegExp(`'${id}'\\s*\\|\\s*`), '');
  }

  // No suggestion left anywhere? Then the rule does not have any.
  if (!/\bsuggest\s*:\s*\[/.test(src)) {
    src = src.replace(/^\s*hasSuggestions\s*:\s*true,\s*$\n?/m, '');
  }

  if (src === original) return { changed: false, removedIds: [] };
  fs.writeFileSync(file, src);
  return { changed: true, removedIds: orphaned };
}

function main(): void {
  const apply = process.argv.includes('--apply');
  const plugins = fs.readdirSync(PACKAGES).filter((p) => p.startsWith('eslint-plugin-'));
  let touched = 0;
  const report: string[] = [];

  for (const plugin of plugins) {
    const rulesDir = path.join(PACKAGES, plugin, 'src', 'rules');
    if (!fs.existsSync(rulesDir)) continue;
    for (const rule of fs.readdirSync(rulesDir)) {
      const file = path.join(rulesDir, rule, 'index.ts');
      if (!fs.existsSync(file)) continue;
      const before = fs.readFileSync(file, 'utf8');
      const result = processRule(file);
      if (!apply) fs.writeFileSync(file, before);
      if (result.changed) {
        touched++;
        report.push(`  ${plugin.replace('eslint-plugin-', '')}/${rule}  −${result.removedIds.length} messageId(s)`);
      }
    }
  }
  console.log(`${apply ? 'Applied to' : 'Would change'} ${touched} rule(s):`);
  console.log(report.slice(0, 12).join('\n'));
  if (report.length > 12) console.log(`  … and ${report.length - 12} more`);
}

main();
