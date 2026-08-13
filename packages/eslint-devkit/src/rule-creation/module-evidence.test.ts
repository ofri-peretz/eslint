/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the shared SDK-evidence probe.
 *
 * Every rule in every SDK-specific plugin is gated on one of these, so a bug
 * here is a bug in ~150 rules at once — silently, in whichever direction the
 * bug leans. The cases below are the accumulated findings of the corpus sweep
 * and the false-negative audit, not invented edge cases.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '@typescript-eslint/parser';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import { createModuleEvidence, matchesModule } from './module-evidence';

const ast = (code: string): TSESTree.Program =>
  parse(code, { sourceType: 'module', range: true });

const pg = createModuleEvidence({ packages: ['pg', 'postgres'] });
const ai = createModuleEvidence({ packages: ['ai'], scopes: ['@ai-sdk'] });
const lambda = createModuleEvidence({
  packages: ['aws-lambda'],
  scopes: ['@aws-sdk'],
  prefixes: ['serverless-'],
});

describe('createModuleEvidence', () => {
  describe('imports', () => {
    it.each([
      ["import { Pool } from 'pg';", 'bare package'],
      ["import c from 'pg/lib/client';", 'deep path counts — matched on the root'],
      ["import 'pg';", 'side-effect import with no bindings'],
      ["export { Pool } from 'pg';", 're-export'],
      ["export * from 'pg';", 'star re-export'],
      ["import type { Client } from 'pg';", 'type-only import'],
    ])('%s → true (%s)', (code) => {
      expect(pg(ast(code))).toBe(true);
    });

    it.each([
      ["import x from 'mysql2';", 'a different driver'],
      ["import x from 'pgx';", 'a package merely sharing the prefix'],
      ["import x from './pg';", 'relative — a local file named after the package'],
      ["import x from '../db/pg';", 'relative parent'],
      ["import x from '/pg';", 'absolute'],
      ['export const x = 1;', 'a local export with no source'],
      ["export * from './helpers';", 'a re-export of something else'],
      ['', 'an empty file'],
    ])('%s → false (%s)', (code) => {
      expect(pg(ast(code))).toBe(false);
    });
  });

  describe('scopes and prefixes', () => {
    it('a whole scope matches every package under it', () => {
      expect(ai(ast("import { openai } from '@ai-sdk/openai';"))).toBe(true);
      // The point of matching the scope rather than enumerating providers: a
      // provider we have never heard of still opens the gate.
      expect(ai(ast("import x from '@ai-sdk/some-future-provider';"))).toBe(true);
      expect(ai(ast("import x from '@ai-sdk/openai/edge';"))).toBe(true);
    });

    it('a different scope does not', () => {
      expect(ai(ast("import x from '@other/openai';"))).toBe(false);
    });

    it('a bare scope with no package name matches the scope', () => {
      // `@ai-sdk` alone is not installable, so this cannot occur in real code.
      // It resolves to the scope rather than being special-cased: erring open
      // on a specifier that cannot exist costs nothing, and the alternative is
      // a branch no corpus file would ever reach.
      expect(ai(ast("import x from '@ai-sdk';"))).toBe(true);
    });

    it('prefixes match on the package root', () => {
      expect(lambda(ast("import s from 'serverless-http';"))).toBe(true);
      expect(lambda(ast("import s from 'serverless-http/lib';"))).toBe(true);
      expect(lambda(ast("import s from 'server-less';"))).toBe(false);
    });
  });

  describe("Deno's specifiers — a false-negative class from the audit", () => {
    it.each([
      "import { S3 } from 'npm:@aws-sdk/client-s3';",
      "import x from 'npm:aws-lambda';",
    ])('%s → true (npm: prefix stripped)', (code) => {
      expect(lambda(ast(code))).toBe(true);
    });

    it('deno.land/x URLs are matched on the package segment', () => {
      expect(
        pg(ast("import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';")),
      ).toBe(true);
      expect(
        pg(ast("import x from 'http://deno.land/x/postgres/mod.ts';")),
      ).toBe(true);
    });

    it('an unrelated URL is not evidence', () => {
      expect(pg(ast("import x from 'https://esm.sh/lodash';"))).toBe(false);
      expect(pg(ast("import x from 'https://deno.land/x/oak/mod.ts';"))).toBe(false);
    });
  });

  describe("TypeScript's import-equals — the other audit class", () => {
    it('import pg = require("pg") counts', () => {
      // 82 corpus files were written this way for Express alone, with every
      // rule in the plugin silenced.
      expect(pg(ast('import client = require("pg");'))).toBe(true);
    });

    it('import-equals of something else does not', () => {
      expect(pg(ast('import x = require("mysql2");'))).toBe(false);
    });

    it('an import-equals alias of a namespace is not a module load', () => {
      expect(pg(ast('namespace N { export const x = 1; }\nimport A = N;'))).toBe(false);
    });
  });

  describe('require and dynamic import', () => {
    it.each([
      "const { Pool } = require('pg');",
      "function f() { return require('pg'); }",
      "if (x) { require('pg'); }",
      "const m = await import('pg');",
    ])('%s → true', (code) => {
      expect(pg(ast(code))).toBe(true);
    });

    it.each([
      ["require('mysql2');", 'a different package'],
      ["require('./pg');", 'a relative path'],
      ['require(name);', 'a non-literal specifier'],
      ['require();', 'no arguments'],
      ['require(123);', 'a non-string literal'],
      ['notRequire("pg");', 'a differently named function'],
      ['obj.require("pg");', 'a member call, not the global require'],
      ["await import('./pg');", 'a relative dynamic import'],
      ['await import(name);', 'a non-literal dynamic import'],
    ])('%s → false (%s)', (code) => {
      expect(pg(ast(code))).toBe(false);
    });
  });

  describe('a locally bound `require` is not module loading', () => {
    it.each([
      "function f(require) { require('pg'); }",
      "const load = (require) => require('pg');",
      "const require = (m) => m; require('pg');",
      "{ const require = (m) => m; require('pg'); }",
    ])('%s → false', (code) => {
      expect(pg(ast(code))).toBe(false);
    });

    // Shadowing is lexical, not file-wide. A file-wide flag silenced every rule
    // in the plugin whenever any inner binding existed — an FP fix that created
    // an FN, which is the worse direction.
    it('an unshadowed require survives a shadowing binding elsewhere', () => {
      expect(pg(ast("const c = require('pg');\nfunction w(require) {}"))).toBe(true);
      expect(pg(ast("function w(require) {}\nconst c = require('pg');"))).toBe(true);
      expect(
        pg(ast("function outer() { const c = require('pg'); }\nfunction w(require) {}")),
      ).toBe(true);
    });

    it('the other arms still apply when `require` is shadowed', () => {
      expect(pg(ast("import { Pool } from 'pg';\nfunction f(require) { require('pg'); }"))).toBe(true);
      expect(pg(ast("import c = require('pg');\nfunction f(require) { require('pg'); }"))).toBe(true);
    });
  });

  describe('extraEvidence — the non-import shapes', () => {
    // Lambda and Express need one because 45% and 60% of their real files
    // respectively import nothing; every other SDK is import-only.
    const withHandler = createModuleEvidence({
      packages: ['aws-lambda'],
      extraEvidence: (node) =>
        node.type === AST_NODE_TYPES.ExportNamedDeclaration &&
        node.declaration?.type === AST_NODE_TYPES.VariableDeclaration &&
        node.declaration.declarations.some(
          (d) =>
            d.id.type === AST_NODE_TYPES.Identifier && d.id.name === 'handler',
        ),
    });

    it('opens the gate with no import at all', () => {
      expect(withHandler(ast('export const handler = async (e) => {};'))).toBe(true);
    });

    it('does not fire for a near-miss', () => {
      expect(withHandler(ast('export const handleRequest = async (e) => {};'))).toBe(false);
    });

    it('is additive — the import arm still works without it', () => {
      expect(withHandler(ast("import type { Handler } from 'aws-lambda';"))).toBe(true);
    });

    it('a probe with no extraEvidence is unaffected', () => {
      expect(pg(ast('export const handler = async (e) => {};'))).toBe(false);
    });
  });

  describe('caching', () => {
    it('returns the same answer for the same Program without recomputing', () => {
      const program = ast("import { Pool } from 'pg';");
      expect(pg(program)).toBe(true);
      expect(pg(program)).toBe(true);
    });

    it('caches a negative too', () => {
      const program = ast('const x = 1;');
      expect(pg(program)).toBe(false);
      expect(pg(program)).toBe(false);
    });

    it('two probes over the same Program do not share a cache entry', () => {
      const program = ast("import { Pool } from 'pg';");
      expect(pg(program)).toBe(true);
      expect(ai(program)).toBe(false);
    });
  });


  describe('the shapes only a real rule produces', () => {
    const nest = createModuleEvidence({
      packages: ['@nestjs/common', '@nestjs/core'],
      prefixes: ['@nestjs/platform-'],
    });

    it('a scoped package can be listed exactly, not only by scope', () => {
      expect(nest(ast("import { Injectable } from '@nestjs/common';"))).toBe(true);
      expect(nest(ast("import { NestFactory } from '@nestjs/core';"))).toBe(true);
      // Same scope, package not listed — the scope alone is not the signal here.
      expect(nest(ast("import x from '@nestjs/graphql';"))).toBe(false);
    });

    it('a bare scope that matches no configured scope is compared as a root', () => {
      // Reaches the branch where the specifier has a scope but no package name
      // and the scope itself is not configured — `@nestjs` is neither a listed
      // package nor a listed scope for this probe.
      expect(nest(ast("import x from '@nestjs';"))).toBe(false);
    });

    it('a prefix can match inside a scope', () => {
      expect(nest(ast("import { Express } from '@nestjs/platform-express';"))).toBe(true);
      expect(nest(ast("import x from '@nestjs/platform';"))).toBe(false);
    });

    it('terminates on an AST carrying parent links', () => {
      // `parse()` sets no parents, but a rule passes `context.sourceCode.ast`,
      // which does. Without the `parent` skip the walk would follow the link
      // back up and recurse until the stack blew — on every file.
      const program = ast("const x = 1;\nimport { Pool } from 'pg';");
      const link = (node: Record<string, unknown>, parent: unknown): void => {
        node.parent = parent;
        for (const [key, value] of Object.entries(node)) {
          if (key === 'parent') continue;
          if (Array.isArray(value)) {
            for (const child of value) {
              if (child && typeof child.type === 'string') link(child, node);
            }
          } else if (value && typeof value === 'object' && typeof (value as { type?: unknown }).type === 'string') {
            link(value as Record<string, unknown>, node);
          }
        }
      };
      link(program as unknown as Record<string, unknown>, null);
      expect(pg(program)).toBe(true);
    });

    it('an import-equals whose reference is not a string literal is not a load', () => {
      // TypeScript requires a string there, so this cannot be parsed — it is
      // built by hand to pin the defensive branch rather than leave it untested.
      const program = ast('const x = 1;');
      (program.body as unknown as unknown[]).push({
        type: AST_NODE_TYPES.TSImportEqualsDeclaration,
        moduleReference: {
          type: AST_NODE_TYPES.TSExternalModuleReference,
          expression: { type: AST_NODE_TYPES.Identifier, name: 'pg' },
        },
      });
      expect(pg(program)).toBe(false);
    });
  });

  it('a probe configured with nothing matches nothing', () => {
    const none = createModuleEvidence({});
    expect(none(ast("import x from 'pg';"))).toBe(false);
  });

  describe('matchesModule (deprecated, kept for the public surface)', () => {
    it('matches the package itself and its subpaths, and nothing that merely shares a prefix', () => {
      expect(matchesModule('openai', ['openai'])).toBe(true);
      expect(matchesModule('openai/resources', ['openai'])).toBe(true);
      expect(matchesModule('openai-mock', ['openai'])).toBe(false);
      expect(matchesModule('pg', ['openai'])).toBe(false);
    });
  });
});
