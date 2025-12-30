/**
 * ESLint Rule: require-vitest-watch-false
 *
 * Ensures all vitest.config.* files have `watch: false` set in the test configuration.
 * This prevents CI and automated processes from hanging in watch mode.
 *
 * Watch mode can still be enabled dynamically via CLI: vitest --watch
 */

/**
 * @typedef {import('eslint').Rule.RuleModule} RuleModule
 * @typedef {import('eslint').Rule.RuleContext} RuleContext
 * @typedef {import('eslint').Rule.RuleFixer} RuleFixer
 * @typedef {import('eslint').Rule.Node} Node
 * @typedef {import('eslint').Rule.Node} ObjectExpression
 * @typedef {import('eslint').Rule.Node} Property
 */

/** @type {RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require vitest configs to have watch: false to prevent CI hangs',
      recommended: true,
    },
    fixable: 'code',
    messages: {
      missingWatchFalse:
        'Vitest config must have `watch: false` in test options to prevent CI hangs. Use `vitest --watch` for local development.',
      watchNotFalse:
        'Vitest config `watch` must be set to `false`. Use `vitest --watch` for local development.',
    },
    schema: [],
  },

  /**
   * @param {RuleContext} context
   * @returns {Object}
   */
  create(context) {
    const filename = context.filename || context.getFilename();

    // Only apply to vitest.config.* files
    if (!filename.includes('vitest.config.')) {
      return {};
    }

    /** @type {ObjectExpression | null} */
    let testObjectNode = null;
    /** @type {boolean} */
    let hasWatchFalse = false;
    /** @type {Property | null} */
    let watchProperty = null;

    return {
      /**
       * Find the test property in defineConfig({ test: { ... } })
       * @param {Property} node
       */
      'CallExpression[callee.name="defineConfig"] > ObjectExpression > Property[key.name="test"]'(
        node
      ) {
        if (node.value.type === 'ObjectExpression') {
          testObjectNode = /** @type {ObjectExpression} */ (node.value);

          // Look for watch property
          for (const prop of node.value.properties) {
            if (
              prop.type === 'Property' &&
              prop.key.type === 'Identifier' &&
              prop.key.name === 'watch'
            ) {
              watchProperty = /** @type {Property} */ (prop);
              if (
                prop.value.type === 'Literal' &&
                prop.value.value === false
              ) {
                hasWatchFalse = true;
              }
            }
          }
        }
      },

      'Program:exit'() {
        if (!testObjectNode) {
          return; // No test config found
        }

        if (!hasWatchFalse) {
          if (watchProperty) {
            // watch exists but is not false
            const propToFix = watchProperty;
            context.report({
              node: propToFix,
              messageId: 'watchNotFalse',
              /**
               * @param {RuleFixer} fixer
               */
              fix(fixer) {
                return fixer.replaceText(propToFix.value, 'false');
              },
            });
          } else {
            // watch property is missing
            const nodeToReport = testObjectNode;
            context.report({
              node: nodeToReport,
              messageId: 'missingWatchFalse',
              /**
               * @param {RuleFixer} fixer
               */
              fix(fixer) {
                // Insert after the opening brace of test object
                const sourceCode = context.sourceCode || context.getSourceCode();
                const firstProperty = nodeToReport.properties[0];

                if (firstProperty) {
                  // Insert before first property
                  return fixer.insertTextBefore(
                    firstProperty,
                    'watch: false,\n    '
                  );
                } else {
                  // Empty object, insert inside
                  const range = nodeToReport.range;
                  if (range) {
                    return fixer.insertTextAfterRange(
                      [range[0], range[0] + 1],
                      '\n    watch: false,\n  '
                    );
                  }
                  return null;
                }
              },
            });
          }
        }
      },
    };
  },
};
