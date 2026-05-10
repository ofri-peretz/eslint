"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireDataTestId = void 0;
const eslint_devkit_1 = require("@interlace/eslint-devkit");
/**
 * Native HTML elements that always need a stable selector — they're the
 * usual targets in Playwright / Cypress / Testing Library.
 */
const ALWAYS_INTERACTIVE = new Set([
    'button',
    'input',
    'select',
    'textarea',
    'form',
]);
/**
 * `<a>` is interactive only when it has `href` or `onClick`. We don't want
 * to flag in-content anchor jumps (e.g. <a name="...">).
 */
function isInteractiveAnchor(node) {
    return node.attributes.some((attr) => {
        if (attr.type !== 'JSXAttribute')
            return false;
        const name = attr.name.type === 'JSXIdentifier' ? attr.name.name : undefined;
        return name === 'href' || name === 'onClick';
    });
}
function hasEventHandler(node) {
    return node.attributes.some((attr) => {
        if (attr.type !== 'JSXAttribute')
            return false;
        if (attr.name.type !== 'JSXIdentifier')
            return false;
        // React `on*` handler convention: onClick, onChange, onSubmit, etc.
        return /^on[A-Z]/.test(attr.name.name);
    });
}
function getJsxName(name) {
    if (name.type === 'JSXIdentifier')
        return name.name;
    if (name.type === 'JSXMemberExpression') {
        // Conservative: use the right-most segment. e.g. `<Card.Header />` → "Header"
        return name.property.type === 'JSXIdentifier'
            ? name.property.name
            : undefined;
    }
    return undefined;
}
function hasDataTestId(node) {
    for (const attr of node.attributes) {
        if (attr.type !== 'JSXAttribute')
            continue;
        if (attr.name.type === 'JSXIdentifier' && attr.name.name === 'data-testid')
            return attr;
    }
    return null;
}
function hasSpreadingAllProps(node) {
    // If the element receives `{...props}` we trust the parent is supplying
    // data-testid (or else the parent itself is responsible). Avoid double-
    // flagging in pure render-forward components.
    return node.attributes.some((a) => a.type === 'JSXSpreadAttribute');
}
function isStableValue(attr) {
    if (!attr.value)
        return false; // <... data-testid />  — boolean shorthand
    if (attr.value.type === 'Literal')
        return typeof attr.value.value === 'string';
    if (attr.value.type === 'JSXExpressionContainer') {
        const expr = attr.value.expression;
        if (expr.type === 'Literal')
            return typeof expr.value === 'string';
        if (expr.type === 'TemplateLiteral') {
            // Template literal is stable if all expressions are member/identifier
            // (no function calls / random values).
            return expr.expressions.every((e) => ['Identifier', 'MemberExpression', 'Literal'].includes(e.type));
        }
        // Identifier reference (likely a constant) — accept.
        if (expr.type === 'Identifier')
            return true;
        return false;
    }
    return false;
}
exports.requireDataTestId = (0, eslint_devkit_1.createRule)({
    name: 'require-data-testid',
    meta: {
        type: 'problem',
        docs: {
            url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/require-data-testid.md',
            description: 'Require stable `data-testid` attributes on interactive elements and custom components for testability.',
        },
        fixable: undefined,
        hasSuggestions: false,
        messages: {
            missingDataTestId: (0, eslint_devkit_1.formatLLMMessage)({
                icon: eslint_devkit_1.MessageIcons.WARNING,
                issueName: 'Missing data-testid',
                description: 'Interactive elements and custom components must expose a stable `data-testid` for E2E testability. Class-name selectors break on every Tailwind refactor; `data-testid` survives.',
                severity: 'MEDIUM',
                fix: 'Add `data-testid="<lower-kebab-case-name>"` to the element.',
                documentationLink: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/require-data-testid.md',
            }),
            dynamicDataTestId: (0, eslint_devkit_1.formatLLMMessage)({
                icon: eslint_devkit_1.MessageIcons.WARNING,
                issueName: 'Unstable data-testid value',
                description: '`data-testid` should be a string literal or a template literal of stable identifiers — values that change between renders make tests flaky.',
                severity: 'LOW',
                fix: 'Use a string literal or template like `pagination-page-${pageNumber}` instead of dynamic / computed values.',
                documentationLink: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/require-data-testid.md',
            }),
        },
        schema: [
            {
                type: 'object',
                additionalProperties: false,
                properties: {
                    requireOn: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Extra element / component names to flag.',
                    },
                    ignore: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Element / component names to skip.',
                    },
                    componentPattern: {
                        type: 'string',
                        description: 'Regex; matched names are treated as custom components. Empty disables component checks.',
                    },
                    componentRequiresHandler: {
                        type: 'boolean',
                        description: 'When `componentPattern` matches, only flag if the component has an `on*` event handler (default true). Set false to flag every matching component.',
                    },
                    enforceStableValues: {
                        type: 'boolean',
                        description: 'Reject computed `data-testid` values (default: true).',
                    },
                },
            },
        ],
    },
    defaultOptions: [
        {
            requireOn: [],
            ignore: [],
            // Default: only flag PascalCase components when they handle events.
            // Pure presentational wrappers (e.g. <Body />, <AnchorProvider>) are
            // not testing targets and would create noise.
            componentPattern: '^[A-Z]',
            componentRequiresHandler: true,
            enforceStableValues: true,
        },
    ],
    create(context, [opts]) {
        const options = opts ?? {};
        const requireOn = new Set(options.requireOn ?? []);
        const ignore = new Set(options.ignore ?? []);
        const componentPatternStr = options.componentPattern ?? '^[A-Z]';
        const componentPattern = componentPatternStr
            ? new RegExp(componentPatternStr)
            : null;
        const componentRequiresHandler = options.componentRequiresHandler ?? true;
        const enforceStableValues = options.enforceStableValues ?? true;
        return {
            JSXOpeningElement(node) {
                const name = getJsxName(node.name);
                if (!name)
                    return;
                if (ignore.has(name))
                    return;
                // Decide whether this element is in-scope.
                let inScope = false;
                if (ALWAYS_INTERACTIVE.has(name))
                    inScope = true;
                else if (name === 'a' && isInteractiveAnchor(node))
                    inScope = true;
                else if (componentPattern && componentPattern.test(name)) {
                    // PascalCase component. Only flag when it has an interactive
                    // event handler, unless `componentRequiresHandler: false` is set.
                    inScope = componentRequiresHandler ? hasEventHandler(node) : true;
                }
                else if (requireOn.has(name))
                    inScope = true;
                if (!inScope)
                    return;
                // Skip if a spread is forwarding all props — the parent owns testid.
                if (hasSpreadingAllProps(node))
                    return;
                const existing = hasDataTestId(node);
                if (!existing) {
                    context.report({ node, messageId: 'missingDataTestId' });
                    return;
                }
                if (enforceStableValues && !isStableValue(existing)) {
                    context.report({ node: existing, messageId: 'dynamicDataTestId' });
                }
            },
        };
    },
});
//# sourceMappingURL=require-data-testid.js.map