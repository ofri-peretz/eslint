/**
 * ESLint Rule: changelog-format
 *
 * Verifies that CHANGELOG.md files follow the expected format for the UI to parse correctly.
 * Expected header format: ## [version] - YYYY-MM-DD
 */

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure CHANGELOG.md follows the required format ## [version] - YYYY-MM-DD',
      recommended: true,
    },
    schema: [],
    messages: {
      invalidFormat: 'Line {{line}}: Invalid changelog header format. Expected "## [version] - YYYY-MM-DD"',
      noVersions: 'No version headers found in changelog. Expected at least one "## [version] - YYYY-MM-DD"',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    const text = sourceCode.text;
    const lines = text.split('\n');

    return {
      Program() {
        let foundVersion = false;
        lines.forEach((line, index) => {
          const trimmedLine = line.trim();
          
          // Check for headers that look like they SHOULD be version headers but might be wrong
          if (trimmedLine.startsWith('## ') && !trimmedLine.includes('Changelog')) {
            // Patterns: 
            // ## [1.0.0] - 2024-01-01
            // ## [Unreleased]
            const versionPattern = /^## \[\d+\.\d+\.\d+(-[a-z0-9.]+)?\] - \d{4}-\d{2}-\d{2}$/;
            const unreleasedPattern = /^## \[Unreleased\]$/i;
            
            if (!versionPattern.test(trimmedLine) && !unreleasedPattern.test(trimmedLine)) {
              context.report({
                loc: {
                  start: { line: index + 1, column: 0 },
                  end: { line: index + 1, column: trimmedLine.length }
                },
                messageId: 'invalidFormat',
                data: {
                  line: index + 1
                }
              });
            } else {
              foundVersion = true;
            }
          }
        });

        if (!foundVersion) {
            context.report({
                loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } },
                messageId: 'noVersions'
            });
        }
      },
    };
  },
};
