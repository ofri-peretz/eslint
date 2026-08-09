#!/usr/bin/env -S npx tsx
/**
 * Seed placeholder badges so the README never shows broken images.
 *
 * The badge URLs live in a committed README, but the SVGs only exist after
 * the first successful benchmark deploy. Between merging the README and that
 * run, every cell renders as a broken-image icon — which reads as "this
 * project is broken", not "not measured yet".
 *
 * These placeholders say exactly that: "pending first run". They are only
 * ever written for badges that do NOT already exist, so a real measurement
 * is never overwritten by a placeholder.
 *
 * Usage: npx tsx scripts/seed-badge-placeholders.ts
 */
import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'benchmark-results', 'badges');

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function badge(label: string, message: string, color: string): string {
  const lw = Math.round(label.length * 6.4) + 20;
  const mw = Math.round(message.length * 6.4) + 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + mw}" height="20" role="img" aria-label="${esc(label)}: ${esc(message)}">
  <title>${esc(label)}: ${esc(message)}</title>
  <rect width="${lw}" height="20" fill="#24292f"/>
  <rect x="${lw}" width="${mw}" height="20" fill="${color}"/>
  <g fill="#ffffff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${lw / 2}" y="14">${esc(label)}</text>
    <text x="${lw + mw / 2}" y="14">${esc(message)}</text>
  </g>
</svg>
`;
}

const GREY = '#6e7681';
const STACKS = ['ours', 'ours-oxlint', 'competitor', 'oxlint-stock'];
const METRICS = ['cold', 'warm', 'findings', 'files'];
const JOBS = [
  'circular-dependencies',
  'dom-xss-sinks-innerhtml-and-friends',
  'hardcoded-secrets-credentials',
  'command-shell-injection',
  'redos-catastrophic-backtracking',
  'path-traversal-non-literal-fs-access',
  'timing-attack-unsafe-comparison',
];

mkdirSync(OUT, { recursive: true });
const existing = new Set(existsSync(OUT) ? readdirSync(OUT) : []);
let written = 0;

// Never overwrite a real measurement with a placeholder.
const seed = (name: string, label: string, message: string) => {
  if (existing.has(name)) return;
  writeFileSync(join(OUT, name), badge(label, message, GREY));
  written++;
};

seed('verified.svg', 'benchmark', 'pending first run');
seed('corpus.svg', 'corpus', 'pending');
seed('parity.svg', 'file-set parity', 'pending');
seed('jobs-summary.svg', 'head-to-head jobs', 'pending');
seed('jobs-uncontested.svg', 'uncontested coverage', 'pending');
for (const s of STACKS) for (const m of METRICS) seed(`${s}-${m}.svg`, m, 'pending');
for (const j of JOBS) seed(`job-${j}.svg`, j.replace(/-/g, ' ').slice(0, 30), 'pending');

console.log(`Seeded ${written} placeholder badge(s) in ${OUT}`);
console.log(written ? 'These are replaced by real values on the first benchmark run.' : 'All badges already present — nothing seeded.');
