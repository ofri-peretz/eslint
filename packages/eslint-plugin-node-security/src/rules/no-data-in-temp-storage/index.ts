/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent sensitive data in temp directories
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected' | 'predictableTempPath';

export interface Options {
  tempPaths?: string[];
  ignoreFiles?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_TEMP_PATHS = ['/tmp', '/var/tmp', 'temp/', '/temp'];

/** fs functions whose first argument is the path being written. */
const FS_WRITE_FUNCTIONS = ['writeFileSync', 'writeFile'];

/**
 * `os.tmpdir()` — the portable spelling of the shared temp directory.
 *
 * The literal scan above only sees a hard-coded `/tmp/...` string. Code that
 * reaches the same world-writable directory through `os.tmpdir()` is the
 * identical exposure and was silently unchecked, which is why
 * `corpus/CWE-377/vulnerable/tmpdir-static-name.js` reported nothing while its
 * `/tmp/app-export.json` sibling reported.
 */
function isTmpdirCall(node: TSESTree.Node): boolean {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'os' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'tmpdir'
  );
}

/**
 * `path.join(os.tmpdir(), <string literal>…)` — a fully constant name inside
 * the shared temp directory.
 *
 * The "all remaining segments are string literals" requirement is what keeps
 * this from firing on the accepted safe shape. A randomised segment
 * (`randomUUID()`, `Date.now()`, an interpolated template) makes the final path
 * unpredictable, which is exactly the mitigation, so those are left alone.
 */
function isStaticTmpdirJoin(node: TSESTree.CallExpression): boolean {
  const { callee } = node;
  if (callee.type !== 'MemberExpression' || callee.computed) return false;
  if (callee.property.type !== 'Identifier') return false;
  if (callee.property.name !== 'join' && callee.property.name !== 'resolve') {
    return false;
  }
  if (callee.object.type !== 'Identifier' || callee.object.name !== 'path') {
    return false;
  }
  if (node.arguments.length < 2) return false;
  if (!isTmpdirCall(node.arguments[0])) return false;
  return node.arguments
    .slice(1)
    .every((arg) => arg.type === 'Literal' && typeof arg.value === 'string');
}

export const noDataInTempStorage = createRule<RuleOptions, MessageIds>({
  name: 'no-data-in-temp-storage',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-data-in-temp-storage.md',
      description: 'Prevent sensitive data in temp directories',
      cwe: 'CWE-312',
      cvss: 7.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Temp Storage Data',
        cwe: 'CWE-312',
        description: 'Sensitive data written to temp directory - not secure',
        severity: 'HIGH',
        fix: 'Use secure storage location or encrypt data before writing',
        documentationLink: 'https://cwe.mitre.org/data/definitions/312.html',
      }),
      predictableTempPath: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Predictable Temp File Name (CWE-377)',
        cwe: 'CWE-377',
        cvss: 7.5,
        description:
          'path.join(os.tmpdir(), …) with a constant name resolves to the same path on every run, in a directory every local user can write. An attacker who pre-creates that name — or symlinks it at a file they want clobbered — wins the race before the write happens.',
        severity: 'HIGH',
        fix: 'Create the file inside a fresh directory from fs.mkdtemp/mkdtempSync, or add a crypto.randomUUID() segment to the name.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/377.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          tempPaths: {
            type: 'array',
            items: { type: 'string' },
            description: 'Custom list of temporary paths to flag'
          },
          ignoreFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of files or patterns to ignore'
          }
        },
        additionalProperties: false
      }
    ],
  },
  defaultOptions: [{}],
  create(context) {
    const options = context.options[0] || {};
    const tempPaths = options.tempPaths || DEFAULT_TEMP_PATHS;
    const ignoreFiles = options.ignoreFiles || [];
    const filename = context.filename;

    if (ignoreFiles.some(pattern => filename.includes(pattern))) {
      return {};
    }

    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }
    
    /**
     * A predictable temp path only matters where it becomes the name something
     * is written to.
     *
     * Called from the three sites that produce such a name — a declarator, an
     * assignment, and the path argument of an fs write — rather than by walking
     * up from the `path.join` call. That is the same "bound to a name, or
     * written through" standard the literal scan below already applies, and it
     * keeps `log(path.join(os.tmpdir(), 'x'))` from reporting.
     */
    function reportIfPredictable(
      candidate: TSESTree.Node | null | undefined,
    ): void {
      if (!candidate || candidate.type !== 'CallExpression') return;
      if (!isStaticTmpdirJoin(candidate)) return;
      context.report({ node: candidate, messageId: 'predictableTempPath' });
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Detect fs.writeFileSync or fs.writeFile with temp path
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'fs' &&
            node.callee.property.type === 'Identifier' &&
            FS_WRITE_FUNCTIONS.includes(node.callee.property.name)) {

          const pathArg = node.arguments[0];
          if (pathArg && pathArg.type === 'Literal' && typeof pathArg.value === 'string') {
            if (tempPaths.some(tp => pathArg.value.includes(tp))) {
              report(pathArg);
            }
          }
          // path.join(os.tmpdir(), 'constant-name') — same exposure as a
          // hard-coded '/tmp/...' literal, written portably.
          reportIfPredictable(pathArg);
        }
      },

      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        reportIfPredictable(node.init);
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        reportIfPredictable(node.right);
      },

      Literal(node: TSESTree.Literal) {
        // Detect temp path literals
        if (typeof node.value === 'string') {
          if (tempPaths.some(tp => node.value.includes(tp))) {
            // Only flag if parent is assignment or variable declaration
            const parent = node.parent;
            if (parent?.type === 'VariableDeclarator' || parent?.type === 'AssignmentExpression') {
              report(node);
            }
          }
        }
      },
    };
  },
});
