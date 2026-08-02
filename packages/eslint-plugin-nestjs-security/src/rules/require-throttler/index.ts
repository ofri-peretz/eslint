/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-throttler
 * Requires an application-wide rate limiter (ThrottlerModule + ThrottlerGuard)
 * CWE-770: Allocation of Resources Without Limits or Throttling
 *
 * Rate limiting in NestJS is adopted **once**, in the root module:
 *
 * ```ts
 * @Module({
 *   imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])],
 *   providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
 * })
 * export class AppModule {}
 * ```
 *
 * Reporting the missing throttler on every route handler therefore produced
 * dozens of findings for a single one-line fix (24 on one boilerplate, 93 on
 * another). This rule reports once, on the root module — where the fix goes.
 *
 * @see https://cwe.mitre.org/data/definitions/770.html
 * @see https://docs.nestjs.com/security/rate-limiting
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { getBasename } from '@interlace/eslint-devkit';
import { isModuleClass } from '../../utils/decorators';
import { getProjectContext } from '../../utils/project-context';

type MessageIds = 'missingThrottler' | 'addThrottler';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** @deprecated No longer used — the rule no longer reports per route. */
  skipRoutes?: string[];
  /** Skip rule entirely, without scanning the project. Default: false */
  assumeGlobalThrottler?: boolean;
  /** Class names treated as the application root module. Default: ['AppModule'] */
  rootModuleNames?: string[];
  /** File names treated as the application root module. Default: ['app.module.ts'] */
  rootModuleFiles?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_ROOT_MODULE_NAMES = ['AppModule'];
const DEFAULT_ROOT_MODULE_FILES = ['app.module.ts'];

/**
 * Rate limiting actually **registered** in the file being linted.
 *
 * Matching the bare identifiers `ThrottlerGuard` / `ThrottlerStorage` anywhere
 * in the file text was wrong: a lone
 * `import { ThrottlerGuard } from '@nestjs/throttler'` silenced the rule on a
 * module that never put the guard in `providers`. Only a module import or a
 * provider entry counts as a registration.
 */
const THROTTLER_REGISTRATIONS: readonly RegExp[] = [
  // imports: [ThrottlerModule.forRoot(...)] / .forRootAsync(...)
  /ThrottlerModule\s*\.\s*forRoot(?:Async)?\s*\(/,
  // imports: [ThrottlerModule] — configured by a dedicated module
  /imports\s*:\s*\[[^\]]*\bThrottlerModule\b/,
  // providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
  /provide\s*:\s*APP_GUARD[\s\S]{0,240}?use(?:Class|Existing)\s*:\s*Throttler[\w$]*/,
];

/** True when the linted source registers rate limiting itself. */
function registersThrottler(source: string): boolean {
  return THROTTLER_REGISTRATIONS.some((pattern) => pattern.test(source));
}

export const requireThrottler = createRule<RuleOptions, MessageIds>({
  name: 'require-throttler',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/require-throttler.md',
      description: 'Requires an application-wide ThrottlerModule for rate limiting',
      cwe: 'CWE-770',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      missingThrottler: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Rate Limiting',
        cwe: 'CWE-770',
        cvss: 7.5,
        description:
          'Application module {{name}} registers no rate limiting — every route, including authentication, is open to brute-force and DoS',
        severity: 'HIGH',
        fix: 'Register ThrottlerModule.forRoot([...]) and { provide: APP_GUARD, useClass: ThrottlerGuard }',
        documentationLink: 'https://docs.nestjs.com/security/rate-limiting',
      }),
      addThrottler: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Rate Limiting',
        description: 'Configure ThrottlerModule to protect against DoS/brute-force attacks',
        severity: 'LOW',
        fix: 'npm i @nestjs/throttler && ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])',
        documentationLink: 'https://docs.nestjs.com/security/rate-limiting',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          skipRoutes: { type: 'array', items: { type: 'string' }, default: [] },
          assumeGlobalThrottler: { type: 'boolean', default: false },
          rootModuleNames: { type: 'array', items: { type: 'string' } },
          rootModuleFiles: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, skipRoutes: [], assumeGlobalThrottler: false }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
      allowInTests = true,
      assumeGlobalThrottler = false,
      rootModuleNames = DEFAULT_ROOT_MODULE_NAMES,
      rootModuleFiles = DEFAULT_ROOT_MODULE_FILES,
    } = options as Options;

    // Skip entirely if global ThrottlerModule is assumed (configured in AppModule)
    if (assumeGlobalThrottler) {
      return {};
    }

    const filename = context.filename;
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    const rootNames = new Set(rootModuleNames);
    const rootFiles = new Set(rootModuleFiles);
    const isRootModuleFile = rootFiles.has(getBasename(filename));

    /** Only the root module is a sensible place to report a project-wide gap. */
    function isRootModule(node: TSESTree.ClassDeclaration): boolean {
      if (!isModuleClass(node.decorators)) return false;
      if (isRootModuleFile) return true;
      return node.id !== null && rootNames.has(node.id.name);
    }

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (!isRootModule(node)) return;

        // Registered right here (imports: [ThrottlerModule.forRoot(...)])
        if (registersThrottler(context.sourceCode.getText())) return;

        // …or anywhere else in the project (a dedicated throttler module)
        if (getProjectContext(context).hasGlobalThrottler) return;

        context.report({
          node,
          messageId: 'missingThrottler',
          data: { name: node.id === null ? '<anonymous>' : node.id.name },
          suggest: [{ messageId: 'addThrottler', fix: () => null }],
        });
      },
    };
  },
});
