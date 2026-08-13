#!/usr/bin/env tsx

/**
 * lint-plugin-taxonomy.ts — keeps the code-agnostic plugins code-agnostic.
 *
 * The scope promise: `secure-coding`, `node-security` and `browser-security`
 * detect what is reachable from the language and the platform. A rule that can
 * only fire when a specific framework, driver or SDK is installed belongs in
 * that ecosystem's own protective plugin (pg, mongodb-security, express-security,
 * nestjs-security, lambda-security, vercel-ai-security, …).
 *
 * Why it's enforced mechanically: rules drift in by name association — every
 * `no-*-injection` wants to live next to the other `no-*-injection` rules, and
 * `no-sql-injection` (2026-08-02) nearly landed in secure-coding gated on
 * `.query()`/`.raw()` sinks that only exist in a DB driver. The tell is always
 * the same: an exact SDK identifier compared against in the detection path.
 *
 * How it detects: every string literal in a rule source is compared for EXACT
 * equality against SDK_TOKENS. Exact-match-only is deliberate — remediation
 * prose ("Use ldapjs or libraries with automatic escaping") and doc links
 * mention libraries legitimately and never match, while a detection gate
 * (`callee.name === 'multer'`) always does.
 *
 * Known violations predating the guard are listed in GRANDFATHERED with the
 * reason they are still there. A stale entry — one whose tokens no longer
 * appear — is itself a failure, so the debt list cannot rot after a migration.
 *
 * Usage:
 *   tsx scripts/lint-plugin-taxonomy.ts           # exit non-zero on a new violation
 *   tsx scripts/lint-plugin-taxonomy.ts --quiet   # only print on failure
 *
 * Wired as `npm run lint:taxonomy` and gated in CI via the quality job.
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import process from 'node:process';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');

/** Plugins whose scope promise is "platform only, no framework/SDK". */
const CODE_AGNOSTIC_PLUGINS = [
  'eslint-plugin-secure-coding',
  'eslint-plugin-node-security',
  'eslint-plugin-browser-security',
];

/**
 * Framework / driver / SDK identifiers. A rule in a code-agnostic plugin that
 * compares against one of these is gated on that dependency being installed.
 *
 * Node built-ins (`http`, `https`, `crypto`, `fs`, `child_process`) are
 * deliberately absent — those ARE the platform.
 */
const SDK_TOKENS = new Set([
  // SQL drivers + ORMs
  'sequelize', 'typeorm', 'prisma', 'knex', 'objection', 'drizzle',
  'mysql', 'mysql2', 'sqlite', 'sqlite3', 'better-sqlite3', 'pg', 'postgres', 'mssql', 'oracledb',
  // NoSQL
  'mongoose', 'mongodb', 'redis', 'ioredis',
  // HTTP servers / middleware
  'express', 'fastify', 'koa', 'hapi', 'restify', 'nestjs', '@nestjs/common',
  'multer', 'helmet', 'cors', 'passport', 'body-parser', 'cookie-parser', 'csurf',
  // HTTP clients
  'axios', 'got', 'superagent', 'node-fetch',
  // UI frameworks
  'react', 'angular', 'vue', 'svelte', 'nuxt', 'preact',
  // Template engines
  'handlebars', 'ejs', 'pug', 'jade', 'mustache', 'nunjucks', 'swig',
  // GraphQL
  'graphql', 'apollo-server', 'graphql-tools', 'graphql-tag', '@apollo/server',
  // Cloud / AI SDKs
  'aws-sdk', '@aws-sdk', 'middy', 'openai', 'anthropic', 'langchain',
  // Auth / crypto libs
  'jsonwebtoken', 'jose', 'bcrypt', 'bcryptjs', 'argon2',
]);

/**
 * Deliberately NOT tokens: 'request', 'next', 'dot', 'ai', 'solid', 'ky', 'eta',
 * 'liquid'. They are ordinary identifiers in rule code — `'request'` is a taint
 * source name (`req`/`request`), `'next'` is the Express middleware parameter —
 * and matching them produced 8 false positives on the first run. A token earns
 * its place only when the literal is unambiguous evidence of an SDK.
 */

/**
 * Violations that predate this guard (audited 2026-08-02). Each one is either
 * scheduled to move to a scoped plugin at the next major, or explained as a
 * non-gate. Removing the tokens from the source means deleting the entry too —
 * a stale entry fails this script.
 */
interface Grandfathered {
  /** Path relative to packages/, without the `src/rules/` noise. */
  file: string;
  tokens: string[];
  reason: string;
}

const GRANDFATHERED: Grandfathered[] = [
  {
    file: 'eslint-plugin-secure-coding/src/rules/no-sql-injection/index.ts',
    tokens: ['better-sqlite3', 'knex', 'mssql', 'mysql', 'mysql2', 'objection', 'oracledb', 'pg', 'postgres', 'prisma', 'sequelize', 'sqlite3', 'typeorm'],
    reason:
      'Inverted: the driver list is what this rule ABSTAINS on, not what activates it. ' +
      'It owns driver-less `db.query("SELECT … " + req.params.id)` — the exact complement ' +
      'of the driver-scoped rules gate — so a file importing any of these belongs to ' +
      'postgresql-security / mysql-security / sqlite-security instead, and exactly one ' +
      'rule reports any query site. Moving it into a driver plugin would recreate the gap ' +
      'it was written to close (benchmarks/corpus/CWE-089, 3 fixtures, all driver-less).',
  },
  {
    file: 'eslint-plugin-node-security/src/rules/no-unsafe-buffer-alloc/index.ts',
    tokens: ['ioredis'],
    reason:
      'Comment-only. Both mentions cite the corpus site the CWE-789 arm was written ' +
      'against (redis/ioredis lib/resp/decoder.ts:669) as provenance for the measurement ' +
      'in the rule docs. No predicate reads it: the rule gates on a wire-derived length ' +
      'reaching a sized allocator, which is protocol-agnostic.',
  },
  {
    file: 'eslint-plugin-secure-coding/src/rules/no-template-injection/index.ts',
    tokens: ['handlebars', 'ejs', 'pug', 'jade', 'mustache', 'nunjucks', 'swig'],
    reason: 'Detection is fully gated on template-engine identifiers. Moves to a template-engine plugin at the next major.',
  },
  {
    file: 'eslint-plugin-secure-coding/src/rules/no-graphql-injection/index.ts',
    tokens: ['graphql', 'apollo-server', 'graphql-tools', 'graphql-tag'],
    reason: 'GraphQL-only rule. Moves to a graphql-scoped plugin at the next major.',
  },
  {
    file: 'eslint-plugin-secure-coding/src/rules/no-directive-injection/index.ts',
    tokens: ['angular', 'vue', 'react', 'svelte', 'handlebars', 'ejs', 'pug', 'mustache'],
    reason: 'Template-directive sinks are per-framework. Splits into the framework plugins at the next major.',
  },
  {
    file: 'eslint-plugin-secure-coding/src/rules/no-missing-authentication/index.ts',
    tokens: ['express', 'fastify', 'koa', 'hapi'],
    reason: 'Route detection keys off HTTP-framework router names. Belongs in express-security / nestjs-security.',
  },
  {
    file: 'eslint-plugin-secure-coding/src/rules/no-unlimited-resource-allocation/index.ts',
    tokens: ['multer'],
    reason: 'The multer() branch is Express middleware. Rest of the rule is platform-level and stays.',
  },
  {
    file: 'eslint-plugin-secure-coding/src/rules/no-format-string-injection/index.ts',
    tokens: ['mustache', 'handlebars', 'ejs', 'pug'],
    reason: 'NOT a gate — safeFormatLibraries is a suppression allowlist; the rule fires without any of them installed.',
  },
  {
    file: 'eslint-plugin-browser-security/src/rules/no-missing-cors-check/index.ts',
    tokens: ['cors'],
    reason: 'The cors package is Express middleware, and express-security ships a rule of the SAME id. Duplicate double-reports today; browser-security copy is the one to retire.',
  },
  {
    file: 'eslint-plugin-browser-security/src/rules/no-permissive-cors/index.ts',
    tokens: ['cors'],
    reason: 'Same duplicate-id problem as no-missing-cors-check above.',
  },
  {
    file: 'eslint-plugin-browser-security/src/rules/require-https-only/index.ts',
    tokens: ['axios'],
    reason: 'Scheme checking is platform-level; only the axios branch is SDK-shaped. Drop the branch at the next major.',
  },
  {
    file: 'eslint-plugin-node-security/src/rules/no-ssrf/index.ts',
    tokens: ['axios', 'got', 'superagent'],
    reason: 'http/https/undici sinks are the platform core; the client list is an additive sink superset, not a gate.',
  },
  {
    file: 'eslint-plugin-node-security/src/rules/detect-suspicious-dependencies/index.ts',
    tokens: ['react', 'express', 'axios', 'preact'],
    reason:
      'Sanctioned exception — typosquat reference names for dependency hygiene, not an SDK integration. The added names are the allow-list of real packages that sit one edit from a popular one, so a genuine dependency is not reported as an attack.',
  },
  {
    file: 'eslint-plugin-node-security/src/rules/prefer-native-crypto/index.ts',
    tokens: ['bcryptjs'],
    reason: 'Sanctioned exception — steers AWAY from a dependency toward node:crypto. Same family as detect-suspicious-dependencies.',
  },
  {
    file: 'eslint-plugin-browser-security/src/rules/no-missing-csrf-protection/index.ts',
    tokens: ['csurf'],
    reason: 'csurf is Express middleware and express-security already ships require-csrf-protection. Third browser-security/express-security overlap; retire the browser-security copy at the next major.',
  },
];

/** Every string literal in a source file, without interpolated templates. */
export function stringLiterals(source: string): string[] {
  const out: string[] = [];
  const re = /'([^'\\\n]*)'|"([^"\\\n]*)"|`([^`\\$\n]*)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    out.push(m[1] ?? m[2] ?? m[3] ?? '');
  }
  return out;
}

/** SDK tokens a rule source compares against, deduped and sorted. */
export function findSdkTokens(source: string): string[] {
  const hits = new Set<string>();
  for (const literal of stringLiterals(source)) {
    const token = literal.toLowerCase();
    if (SDK_TOKENS.has(token)) hits.add(token);
  }
  return [...hits].sort();
}

export interface Violation {
  file: string;
  tokens: string[];
}

export interface TaxonomyReport {
  /** Non-allowlisted SDK gates — hard failures. */
  violations: Violation[];
  /** Allowlist entries whose tokens are gone; delete the entry. */
  staleAllowlist: string[];
  filesScanned: number;
}

export function checkTaxonomy(
  files: { file: string; source: string }[],
  allowlist: Grandfathered[] = GRANDFATHERED,
): TaxonomyReport {
  const byFile = new Map(allowlist.map((g) => [g.file, new Set(g.tokens)]));
  const seen = new Map<string, Set<string>>();
  const violations: Violation[] = [];

  for (const { file, source } of files) {
    const tokens = findSdkTokens(source);
    if (tokens.length === 0) continue;
    seen.set(file, new Set(tokens));

    const allowed = byFile.get(file);
    const fresh = allowed ? tokens.filter((t) => !allowed.has(t)) : tokens;
    if (fresh.length > 0) violations.push({ file, tokens: fresh });
  }

  const staleAllowlist: string[] = [];
  for (const entry of allowlist) {
    const found = seen.get(entry.file);
    const gone = entry.tokens.filter((t) => !found?.has(t));
    if (gone.length === entry.tokens.length) {
      staleAllowlist.push(`${entry.file} — no SDK tokens left; delete the entry`);
    } else if (gone.length > 0) {
      staleAllowlist.push(`${entry.file} — tokens no longer present: ${gone.join(', ')}`);
    }
  }

  return { violations, staleAllowlist, filesScanned: files.length };
}

function ruleSources(): { file: string; source: string }[] {
  const files: { file: string; source: string }[] = [];
  for (const plugin of CODE_AGNOSTIC_PLUGINS) {
    const rulesDir = path.join(PACKAGES_DIR, plugin, 'src', 'rules');
    if (!fs.existsSync(rulesDir)) continue;
    for (const rule of fs.readdirSync(rulesDir)) {
      const entry = path.join(rulesDir, rule, 'index.ts');
      if (!fs.existsSync(entry)) continue;
      files.push({
        file: path.relative(PACKAGES_DIR, entry),
        source: fs.readFileSync(entry, 'utf8'),
      });
    }
  }
  return files;
}

function main(): void {
  const quiet = process.argv.includes('--quiet');
  const { violations, staleAllowlist, filesScanned } = checkTaxonomy(ruleSources());

  if (violations.length === 0 && staleAllowlist.length === 0) {
    if (!quiet) {
      console.log(
        `✅ ${filesScanned} rule(s) across ${CODE_AGNOSTIC_PLUGINS.length} code-agnostic plugin(s) — no new SDK gates. ` +
          `${GRANDFATHERED.length} known violation(s) still allowlisted.`,
      );
    }
    process.exit(0);
  }

  if (violations.length > 0) {
    console.error(`❌ ${violations.length} rule(s) in a code-agnostic plugin gate on a framework/SDK:\n`);
    for (const v of violations) {
      console.error(`  - ${v.file}`);
      console.error(`      compares against: ${v.tokens.join(', ')}`);
    }
    console.error('');
    console.error('  A rule that only fires when a specific dependency is installed belongs in that');
    console.error("  ecosystem's own protective plugin — not in secure-coding / node-security /");
    console.error('  browser-security. If this is a genuine platform rule that merely names a library');
    console.error('  in an allowlist, add it to GRANDFATHERED in scripts/lint-plugin-taxonomy.ts');
    console.error('  with the reason.\n');
  }

  if (staleAllowlist.length > 0) {
    console.error(`❌ ${staleAllowlist.length} stale allowlist entr(ies) — the debt moved, the record didn't:\n`);
    for (const s of staleAllowlist) console.error(`  - ${s}`);
    console.error('');
  }

  process.exit(1);
}

if (import.meta.url === url.pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
