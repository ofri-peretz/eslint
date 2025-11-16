/**
 * ESLint rule to enforce caret (^) version ranges in package.json dependencies
 * 
 * This rule ensures all dependencies use caret versions for flexibility
 * while maintaining compatibility within the same major version.
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce caret (^) version ranges in package.json dependencies',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      missingCaret: 'Dependency "{{name}}" should use caret version range (^) instead of exact version "{{version}}"',
    },
  },
  create(context) {
    return {
      'Property[key.value="dependencies"], Property[key.value="devDependencies"], Property[key.value="peerDependencies"]'(
        node
      ) {
        if (node.value.type !== 'ObjectExpression') return;

        node.value.properties.forEach((prop) => {
          if (prop.key && prop.value) {
            const depName = prop.key.value || prop.key.name;
            const version = prop.value.value;

            // Skip if already has caret, tilde, or range
            if (
              typeof version === 'string' &&
              !version.startsWith('^') &&
              !version.startsWith('~') &&
              !version.includes(' - ') &&
              !version.includes('||') &&
              !version.startsWith('file:') &&
              !version.startsWith('link:') &&
              !version.startsWith('workspace:') &&
              version.match(/^\d+\.\d+\.\d+/) // Only check semantic versions
            ) {
              context.report({
                node: prop.value,
                messageId: 'missingCaret',
                data: {
                  name: depName,
                  version: version,
                },
                fix(fixer) {
                  return fixer.replaceText(prop.value, `"^${version}"`);
                },
              });
            }
          }
        });
      },
    };
  },
};

