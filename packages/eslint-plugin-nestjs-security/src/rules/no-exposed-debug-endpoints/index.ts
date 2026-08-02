/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Detect debug endpoints without auth in NestJS applications
 *
 * Only *routes* are inspected: the path argument of `@Controller(...)` and of
 * the HTTP-method decorators. The previous implementation matched every string
 * literal in the file, which flagged enum members (`EnumLoggerLevel.debug`),
 * seed data and config values — 24 findings across two boilerplates, none of
 * them an endpoint.
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  getHttpMethodDecorator,
  getRoutePath,
  hasUnresolvedDecorator,
  hasUseGuards,
  isControllerClass,
} from '../../utils/decorators';
import { getProjectContext } from '../../utils/project-context';

type MessageIds = 'violationDetected';

export interface Options {
  endpoints?: string[];
  ignoreFiles?: string[];
  /** Suppress findings when the project registers a global guard. Default: true */
  detectGlobalGuards?: boolean;
}

type RuleOptions = [Options?];

/**
 * Only genuinely diagnostic route names. `admin`, `test` and `health` used to
 * be in this list; they are ordinary route names in every NestJS application
 * (`/admin/users`, `/health`) and produced pure noise. Re-add them through the
 * `endpoints` option if your project treats them as internal.
 */
const DEFAULT_DEBUG_PATHS = [
  'debug',
  '_debug',
  '__debug__',
  'debugger',
  'dev-tools',
  'devtools',
  'phpinfo',
];

export const noExposedDebugEndpoints = createRule<RuleOptions, MessageIds>({
  name: 'no-exposed-debug-endpoints',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/no-exposed-debug-endpoints.md',
      description: 'Detect debug endpoints without auth in NestJS applications',
      cwe: 'CWE-489',
      cvss: 7.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Exposed Debug Endpoint',
        cwe: 'CWE-489',
        description: 'Debug endpoint exposed without authentication',
        severity: 'HIGH',
        fix: 'Remove debug endpoints from production or add authentication',
        documentationLink: 'https://cwe.mitre.org/data/definitions/489.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          endpoints: {
            type: 'array',
            items: { type: 'string' },
            description: 'Custom list of debug/admin endpoints to flag'
          },
          ignoreFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of files or patterns to ignore'
          },
          detectGlobalGuards: { type: 'boolean', default: true },
        },
        additionalProperties: false
      }
    ],
  },
  defaultOptions: [{}],
  create(context) {
    const options = context.options[0] || {};
    const debugPaths = new Set(
      (options.endpoints ?? DEFAULT_DEBUG_PATHS).map((path) =>
        path.replace(/^\/+/, '').toLowerCase(),
      ),
    );
    const ignoreFiles = options.ignoreFiles || [];
    const detectGlobalGuards = options.detectGlobalGuards ?? true;
    const filename = context.filename;

    if (ignoreFiles.some(pattern => filename.includes(pattern))) {
      return {};
    }

    let isController = false;
    let classIsProtected = false;
    let classPathIsDebug = false;

    /** Any `/`-separated segment of the path is a configured debug name. */
    function isDebugPath(path: string | null): boolean {
      if (path === null) return false;
      return path
        .split('/')
        .some((segment) => debugPaths.has(segment.toLowerCase()));
    }

    /** Guarded explicitly, by a project-owned composite, or app-wide. */
    function isProtected(decorators: TSESTree.Decorator[] | undefined): boolean {
      return hasUseGuards(decorators) || hasUnresolvedDecorator(decorators);
    }

    function hasProjectGlobalGuard(): boolean {
      return detectGlobalGuards && getProjectContext(context).hasGlobalAuthGuard;
    }

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        isController = isControllerClass(node.decorators);
        classIsProtected = isProtected(node.decorators);
        classPathIsDebug = (node.decorators ?? []).some(
          (decorator) => isDebugPath(getRoutePath(decorator)),
        );
      },

      MethodDefinition(node: TSESTree.MethodDefinition) {
        if (!isController || classIsProtected) return;

        const httpDecorator = getHttpMethodDecorator(node.decorators);
        if (httpDecorator === null) return;
        if (isProtected(node.decorators)) return;

        if (!classPathIsDebug && !isDebugPath(getRoutePath(httpDecorator))) return;
        if (hasProjectGlobalGuard()) return;

        context.report({ node: httpDecorator, messageId: 'violationDetected' });
      },
    };
  },
});
