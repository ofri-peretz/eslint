/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The unconditioned-impact contract.
 *
 * ## The defect class this file exists to prevent
 *
 * A rule detects a *shape* correctly, then asserts a *consequence* whose
 * precondition it never checks. Measured over eight major NestJS repositories:
 * `no-res-bypass-serialization` told three codebases that `@Exclude()` would not
 * apply, in repositories containing zero `@Exclude()` decorators.
 * `no-hybrid-app-config-loss` told services their global configuration was lost,
 * in services that register no global configuration. 128 findings, 0 that were
 * worth opening a pull request about.
 *
 * The findings were not wrong about the shape. They were wrong about the
 * consequence, and the consequence is the entire reason a reader acts.
 *
 * ## What the contract says
 *
 * Every rule is one of two things, and has to say which:
 *
 * - **presence** — it fires on a dangerous construct that is *in the file*.
 *   Everything the message claims is visible at the report site. These are the
 *   only findings a stranger can open a pull request about, because the
 *   maintainer can check them without trusting us.
 *
 * - **absence** — it fires on a missing defence: no guard, no throttler, no
 *   validation pipe. The reason it is missing usually lives somewhere this rule
 *   cannot see (a global `APP_GUARD`, rate limiting at the CDN, a route that is
 *   public by design). Useful to a team that installed the plugin and knows its
 *   own architecture. Not evidence of a defect in someone else's repository.
 *
 * A presence rule additionally supplies `abstains`: source that has the *shape*
 * but not the *precondition*. If the rule reports on it, it is asserting impact
 * it has not established — the exact defect above — and this file fails.
 *
 * ## Why the registry is exhaustive
 *
 * The first assertion is that every exported rule has an entry. A new rule
 * cannot be added without its author deciding, in writing, which kind it is.
 * That is the point: the 128→0 result was not caused by carelessness in any one
 * rule, it was caused by nobody ever having to answer the question.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { rules } from './index';

interface Contract {
  /** What the rule keys on. See the header. */
  shape: 'presence' | 'absence';
  /** The consequence the message claims, in one line. */
  asserts: string;
  /**
   * Source carrying the rule's shape but not the precondition its message
   * asserts. Required for `presence` rules; meaningless for `absence` ones,
   * whose trigger *is* the missing thing.
   */
  abstains?: string;
}

const CONTRACT: Record<string, Contract> = {
  'no-permissive-cors': {
    shape: 'presence',
    asserts: 'this origin value accepts every site',
    // A CORS options object whose origin is an allow-list. Same call, same
    // shape, no permissive value — nothing to report.
    abstains: `app.enableCors({ origin: ['https://app.example.com'], credentials: true });`,
  },
  'no-res-bypass-serialization': {
    shape: 'presence',
    asserts: '@Exclude() will not be applied to this response',
    // The rule's own gate, pinned. A `@Res()` handler in a controller that
    // mounts no serializer: the bypass is real, but there is nothing for it to
    // bypass, so the message would be false. This is the exact shape that
    // produced 23 of the 27 findings before the gate landed.
    abstains: `
      @Controller('files')
      class FilesController {
        @Get()
        download(@Res() res: Response) { res.json(this.file); }
      }
    `,
  },
  'no-unsafe-multer-filename': {
    shape: 'presence',
    asserts: 'the client chose the name this file is stored under',
    // The name passes through `extname`, so the client controls at most the
    // suffix. The shape (diskStorage + originalname) is identical.
    abstains: `
      diskStorage({
        filename(req, file, cb) { cb(null, uuid() + extname(file.originalname)); },
      });
    `,
  },
  'require-validation-pipe-whitelist': {
    shape: 'presence',
    asserts: 'unknown properties in the request body reach your handler',
    // `whitelist: true` is the precondition's negation, present in the file.
    abstains: `app.useGlobalPipes(new ValidationPipe({ whitelist: true }));`,
  },

  // --- absence-shaped: hygiene for a team that installed us, not evidence ---
  'require-guards': {
    shape: 'absence',
    asserts: 'this route has no access control',
  },
  'require-throttler': {
    shape: 'absence',
    asserts: 'this route can be called without rate limiting',
  },
  'no-missing-validation-pipe': {
    shape: 'absence',
    asserts: 'this body is not validated',
  },
  'no-unguarded-swagger': {
    shape: 'absence',
    asserts: 'the API schema is reachable without authentication',
  },
  'no-exposed-private-fields': {
    shape: 'absence',
    asserts: 'this field is serialized to clients',
  },
  'no-hybrid-app-config-loss': {
    shape: 'absence',
    // Deliberately ungated, and worth recording *why*, because it looks like
    // the defect this file is about. The precondition (does this service
    // register any globals?) is only visible across files, and gating on a
    // cross-file scan means going quiet whenever the scan cannot read a
    // project's layout — a rule that switches itself off scores a perfect
    // false-positive rate while protecting nothing. Between "sometimes says
    // more than it has proved" and "sometimes silently protects nothing", the
    // second is worse. The remedy is a harmless one-line addition either way.
    asserts: 'global pipes and filters do not reach the connected microservice',
  },
};

const linter = new Linter({ configType: 'flat' });

function findingsFor(ruleName: string, code: string): number {
  return linter
    .verify(
      code,
      {
        files: ['**/*.ts'],
        languageOptions: {
          parser: tsParser as never,
          parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
        },
        plugins: { n: { rules } as never },
        rules: { [`n/${ruleName}`]: 'error' } as never,
      },
      'app.controller.ts',
    )
    .filter((m) => m.ruleId === `n/${ruleName}`).length;
}

describe('unconditioned-impact contract', () => {
  it('classifies every rule in the plugin', () => {
    // A new rule cannot ship without its author answering the question. If this
    // fails, add the entry — do not widen the assertion.
    expect(Object.keys(CONTRACT).sort()).toEqual(Object.keys(rules).sort());
  });

  const presence = Object.entries(CONTRACT).filter(
    ([, c]) => c.shape === 'presence',
  );

  it('has at least one presence-shaped rule', () => {
    // Guards the loop below against passing vacuously if the registry is ever
    // rewritten into all-absence — which would silently delete this whole file.
    expect(presence.length).toBeGreaterThan(0);
  });

  it.each(presence)(
    '%s abstains when its precondition is absent',
    (name, contract) => {
      expect(contract.abstains).toBeDefined();
      expect(findingsFor(name, contract.abstains!)).toBe(0);
    },
  );

  it.each(Object.entries(CONTRACT).filter(([, c]) => c.shape === 'absence'))(
    '%s is recorded as absence-shaped, so it is not PR-grade evidence',
    (_name, contract) => {
      // No behavioural claim to make: an absence rule's trigger *is* the
      // missing thing. The value of the row is that it is written down, and
      // that the exhaustiveness check above forces it to exist.
      expect(contract.abstains).toBeUndefined();
      expect(contract.asserts.length).toBeGreaterThan(0);
    },
  );
});
