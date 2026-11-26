/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { describe } from 'vitest';
import { isSeparatorAnchored } from './separator-anchored';

/**
 * The probe reports every `x.startsWith(<arg>)` whose argument
 * `isSeparatorAnchored` accepts, so `invalid` lists the anchored guards and
 * `valid` lists the prefix bug and every argument it cannot read. The rules
 * that use the helper pin it end to end; this pins the helper on its own.
 */
const createRule = ESLintUtils.RuleCreator(() => 'https://example.test/probe');

const probe = createRule({
  name: 'probe',
  meta: {
    type: 'problem',
    docs: { description: 'test probe' },
    messages: { anchored: 'anchored' },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'startsWith' &&
          isSeparatorAnchored(node.arguments[0], context.sourceCode)
        ) {
          context.report({ node, messageId: 'anchored' });
        }
      },
    };
  },
});

const ruleTester = new RuleTester();
const anchored = [{ messageId: 'anchored' as const }];

describe('isSeparatorAnchored', () => {
  ruleTester.run('a startsWith prefix ends at a separator', probe, {
    valid: [
      // The prefix bug: `/safebad` passes `startsWith('/safe')`.
      `p.startsWith(base);`,
      `p.startsWith('/srv/data');`,
      `p.startsWith(\`/srv/data\`);`,
      // The separator is not the last part.
      `p.startsWith(base + '/' + x);`,
      `p.startsWith(base + suffix);`,
      `p.startsWith(\`\${base}/x\`);`,
      `p.startsWith(\`\${base}\${suffix}\`);`,
      // Some other object's `sep`.
      `p.startsWith(base + other.sep);`,
      // `sep` that is not the path module's.
      `const sep = '-'; p.startsWith(base + sep);`,
      // No argument at all.
      `p.startsWith();`,
    ],
    invalid: [
      { code: `p.startsWith(path.sep);`, errors: anchored },
      { code: `p.startsWith(base + path.sep);`, errors: anchored },
      {
        code: `import { sep } from 'node:path'; p.startsWith(base + sep);`,
        errors: anchored,
      },
      { code: `p.startsWith(base + '/');`, errors: anchored },
      { code: `p.startsWith(base + '\\\\');`, errors: anchored },
      { code: `p.startsWith('/srv/data/');`, errors: anchored },
      { code: `p.startsWith(\`\${base}/\`);`, errors: anchored },
      { code: `p.startsWith(\`\${base}\\\\\`);`, errors: anchored },
      { code: `p.startsWith(\`\${base}\${path.sep}\`);`, errors: anchored },
    ],
  });
});
