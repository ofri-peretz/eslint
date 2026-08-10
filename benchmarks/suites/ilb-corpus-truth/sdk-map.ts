/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Which packages put a plugin's SDK into a file.
 *
 * This is the measurement side of the module gates, and it is deliberately
 * **independent of them**: the probe here reads import specifiers out of the
 * source text, while a gate reads the AST and may accept additional evidence
 * (a Lambda handler export, an Express middleware signature). Sharing one
 * implementation would make the bench unable to disagree with the thing it is
 * measuring — a rule could go wrong in exactly the way the probe went wrong and
 * the number would still look clean.
 *
 * The consequence is that `offSdk` is an **upper bound**: a plugin whose gate
 * accepts a non-import signal will show residual off-SDK findings that are
 * correct behaviour. Read the number as "findings this probe cannot justify",
 * not "findings that are wrong".
 */
export const SDK_PACKAGES: Readonly<Record<string, readonly string[]>> = {
  'express-security': ['express', 'express-serve-static-core'],
  'nestjs-security': [
    '@nestjs/common',
    '@nestjs/core',
    '@nestjs/platform-express',
    '@nestjs/platform-fastify',
  ],
  'jwt-security': [
    'jsonwebtoken',
    'jose',
    '@nestjs/jwt',
    'passport-jwt',
    'express-jwt',
    'fast-jwt',
    'njwt',
    'jwt-simple',
  ],
  'mongodb-security': [
    'mongodb',
    'mongoose',
    '@nestjs/mongoose',
    '@typegoose/typegoose',
  ],
  'mysql-security': ['mysql', 'mysql2'],
  'knex-security': ['knex', 'objection'],
  'drizzle-security': ['drizzle-orm'],
  'sqlite-security': [
    'sqlite3',
    'better-sqlite3',
    'node:sqlite',
    'bun:sqlite',
    'sqlite',
  ],
  'prisma-security': ['@prisma/client', 'prisma'],
  'typeorm-security': ['typeorm', '@nestjs/typeorm'],
  'sequelize-security': ['sequelize', 'sequelize-typescript', '@nestjs/sequelize'],
  'postgresql-security': [
    'pg',
    'pg-pool',
    'pg-native',
    'pg-cursor',
    'pg-promise',
    'pg-copy-streams',
    'postgres',
    'slonik',
    '@vercel/postgres',
    '@neondatabase/serverless',
    '@electric-sql/pglite',
  ],
  'lambda-security': [
    'aws-lambda',
    'aws-sdk',
    'aws-xray-sdk',
    'serverless',
    '@aws-sdk/client-s3',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb',
    '@middy/core',
    '@aws-lambda-powertools/logger',
  ],
  'openai-security': ['openai'],
  'anthropic-security': ['@anthropic-ai/sdk'],
  'gemini-security': [
    '@google/generative-ai',
    '@google/genai',
    '@google-cloud/vertexai',
  ],
  // The whole `@ai-sdk` scope, not an enumerated provider list. Enumerating
  // four of them measured this plugin against a corpus it does not describe:
  // across the 107 repositories the scope appears as at least fourteen
  // packages, and the two most common — `@ai-sdk/provider-utils` (639 files)
  // and `@ai-sdk/provider` (607) — were both absent, so every file importing
  // them was scored "no SDK" while plainly being the SDK. That inflates
  // `offSdk` for this plugin and would let the ratchet fire on a corpus
  // refresh that merely added a provider.
  'vercel-ai-security': ['ai', '@ai-sdk/*'],
  'mcp-sdk-security': ['@modelcontextprotocol/sdk'],
};

/**
 * Plugins whose scope is the *language*, not an SDK, so an off-SDK number is
 * meaningless for them. They are measured by preset budget instead (see A5 in
 * NEXT-LEVEL-PLAN.md), not by this metric.
 *
 * react-a11y and react-features are absent from both lists on purpose: a React
 * file legitimately may not import `react` under the modern JSX transform, so
 * an import probe cannot answer the question for them. They need a JSX-presence
 * probe before they can be measured here.
 */
export const PLATFORM_PLUGINS: readonly string[] = [
  'node-security',
  'browser-security',
  'secure-coding',
  'conventions',
  'import-next',
  'maintainability',
  'modernization',
  'modularity',
  'operability',
  'reliability',
];

/** Package root of an import specifier; null for relative/absolute paths. */
export function packageRoot(specifier: string): string | null {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return null;
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/**
 * Every package specifier a source file references.
 *
 * Read from text rather than parsed, because this is a measurement probe and it
 * must not share a parser bug with the rules it measures. Deliberately
 * generous — anything that looks like an import, a require, or a dynamic import
 * counts — so "no evidence" is a strong statement rather than a parsing
 * artefact.
 */
export function specifiersIn(source: string): ReadonlySet<string> {
  const found = new Set<string>();
  const patterns = [
    /(?:from\s*|require\(\s*|import\(\s*)['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      const root = packageRoot(m[1]);
      if (root) found.add(root);
    }
  }
  return found;
}

/**
 * Whether a file's import specifiers show evidence of a plugin's SDK.
 *
 * An entry of the form `@scope/*` matches any package in that scope. It exists
 * because some SDKs ship as an open-ended family — `@ai-sdk` was fourteen
 * packages across this corpus and grows every release — and an enumerated list
 * silently scores real SDK files as off-SDK. Exact package names are still the
 * default: a scope wildcard is only correct where the whole scope belongs to
 * the one SDK.
 */
export function fileHasSdk(
  specifiers: ReadonlySet<string>,
  plugin: string,
): boolean {
  return SDK_PACKAGES[plugin].some((pkg) => {
    if (pkg.endsWith('/*')) {
      const scope = pkg.slice(0, -2);
      for (const s of specifiers) if (s === scope || s.startsWith(`${scope}/`)) return true;
      return false;
    }
    return specifiers.has(pkg);
  });
}
