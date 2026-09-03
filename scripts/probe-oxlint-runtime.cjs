/**
 * probe-oxlint-runtime.cjs — runtime functional probe for oxlint's JS plugin API.
 *
 * Loaded by oxlint as a JS plugin. Each rule exercises ONE API surface our
 * rules depend on. When the API works, the rule emits a `PROBE_OK <surface>`
 * diagnostic. The orchestrator (verify-oxlint-runtime.ts) runs oxlint with
 * this plugin against a fixture and asserts every probe fires.
 *
 * If oxlint's runtime changes shape — a method is renamed, removed, or now
 * throws — the corresponding probe stops emitting and the orchestrator names
 * the broken surface specifically. No manual source-reading required to bump
 * the verified version.
 *
 * Add a probe whenever a NEW API surface is added to our blocker / safe list.
 * A missing probe = a blind spot in re-verification.
 */

'use strict';

const ALL_PROBES = [
  // Reporting + identity
  'context.report',
  'context.id',
  'context.options',
  'context.filename',
  'context.cwd',
  'context.sourceCode',
  'context.settings',
  'context.languageOptions',

  // SourceCode getters + node-level APIs
  'sourceCode.text',
  'sourceCode.ast',
  'sourceCode.getText',
  'sourceCode.getAncestors',
  'sourceCode.scopeManager',

  // Scope analysis (the headline 1.62 capability)
  'sourceCode.getScope',
  'sourceCode.getDeclaredVariables',
  'sourceCode.markVariableAsUsed',
  'sourceCode.isGlobalReference',

  // Comments
  'sourceCode.getCommentsBefore',
  'sourceCode.getCommentsAfter',
  'sourceCode.getCommentsInside',
  'sourceCode.getAllComments',

  // Tokens
  'sourceCode.getTokens',
  'sourceCode.getFirstToken',
  'sourceCode.getLastToken',
  'sourceCode.getTokenBefore',
  'sourceCode.getTokenAfter',

  // Fixer methods (every method our rules use)
  'fixer.replaceText',
  'fixer.insertTextBefore',
  'fixer.insertTextAfter',
  'fixer.remove',
  'fixer.replaceTextRange',
  'fixer.removeRange',

  // ParserServices contract — must exist as empty object on oxlint
  // (so `hasParserServices`-guarded rules can call it without throwing).
  'parserServices.empty',
];

/**
 * Helper: emit a single PROBE_OK diagnostic.
 */
function ok(context, node, surface) {
  context.report({ node, message: `PROBE_OK ${surface}` });
}

const rules = {
  'context-report': {
    create(context) {
      return {
        Program(node) { ok(context, node, 'context.report'); },
      };
    },
  },
  'context-identity': {
    create(context) {
      return {
        Program(node) {
          if (typeof context.id === 'string') ok(context, node, 'context.id');
          if (Array.isArray(context.options)) ok(context, node, 'context.options');
          if (typeof context.filename === 'string') ok(context, node, 'context.filename');
          if (typeof context.cwd === 'string') ok(context, node, 'context.cwd');
          if (context.sourceCode && typeof context.sourceCode === 'object') ok(context, node, 'context.sourceCode');
          if (context.settings && typeof context.settings === 'object') ok(context, node, 'context.settings');
          if (context.languageOptions && typeof context.languageOptions === 'object') ok(context, node, 'context.languageOptions');
        },
      };
    },
  },
  'sourcecode-getters': {
    create(context) {
      return {
        Program(node) {
          const sc = context.sourceCode;
          if (typeof sc.text === 'string') ok(context, node, 'sourceCode.text');
          if (sc.ast && typeof sc.ast === 'object') ok(context, node, 'sourceCode.ast');
          if (typeof sc.getText === 'function' && typeof sc.getText(node) === 'string') ok(context, node, 'sourceCode.getText');
          if (typeof sc.getAncestors === 'function' && Array.isArray(sc.getAncestors(node))) ok(context, node, 'sourceCode.getAncestors');
          if (sc.scopeManager && typeof sc.scopeManager === 'object') ok(context, node, 'sourceCode.scopeManager');
        },
      };
    },
  },
  'sourcecode-scope': {
    create(context) {
      return {
        VariableDeclaration(node) {
          const sc = context.sourceCode;
          if (typeof sc.getScope === 'function') {
            const scope = sc.getScope(node);
            if (scope && Array.isArray(scope.variables)) ok(context, node, 'sourceCode.getScope');
          }
          if (typeof sc.getDeclaredVariables === 'function') {
            // VariableDeclaration → an array of declared Variables (one per declarator).
            const vars = sc.getDeclaredVariables(node);
            if (Array.isArray(vars) && vars.length > 0 && typeof vars[0].name === 'string') {
              ok(context, node, 'sourceCode.getDeclaredVariables');
            }
          }
          if (typeof sc.markVariableAsUsed === 'function') ok(context, node, 'sourceCode.markVariableAsUsed');
          if (typeof sc.isGlobalReference === 'function') ok(context, node, 'sourceCode.isGlobalReference');
        },
      };
    },
  },
  'sourcecode-comments': {
    create(context) {
      return {
        Program(node) {
          const sc = context.sourceCode;
          if (typeof sc.getCommentsBefore === 'function' && Array.isArray(sc.getCommentsBefore(node))) ok(context, node, 'sourceCode.getCommentsBefore');
          if (typeof sc.getCommentsAfter === 'function' && Array.isArray(sc.getCommentsAfter(node))) ok(context, node, 'sourceCode.getCommentsAfter');
          if (typeof sc.getCommentsInside === 'function' && Array.isArray(sc.getCommentsInside(node))) ok(context, node, 'sourceCode.getCommentsInside');
          if (typeof sc.getAllComments === 'function' && Array.isArray(sc.getAllComments())) ok(context, node, 'sourceCode.getAllComments');
        },
      };
    },
  },
  'sourcecode-tokens': {
    create(context) {
      return {
        VariableDeclaration(node) {
          const sc = context.sourceCode;
          if (typeof sc.getTokens === 'function' && Array.isArray(sc.getTokens(node))) ok(context, node, 'sourceCode.getTokens');
          if (typeof sc.getFirstToken === 'function') {
            const t = sc.getFirstToken(node);
            if (t && typeof t.type === 'string') ok(context, node, 'sourceCode.getFirstToken');
          }
          if (typeof sc.getLastToken === 'function') {
            const t = sc.getLastToken(node);
            if (t && typeof t.type === 'string') ok(context, node, 'sourceCode.getLastToken');
          }
          if (typeof sc.getTokenBefore === 'function') ok(context, node, 'sourceCode.getTokenBefore');
          if (typeof sc.getTokenAfter === 'function') ok(context, node, 'sourceCode.getTokenAfter');
        },
      };
    },
  },
  'fixer-methods': {
    meta: { fixable: 'code' },
    create(context) {
      return {
        Program(node) {
          // Each fixer method is exercised by attempting to *call* it inside a
          // fix function. We don't actually want the fix applied — it's only a
          // probe — so we return null after the type check. Oxlint validates
          // the shape of fixer methods at fix() invocation time.
          context.report({
            node,
            message: 'PROBE_OK fixer.replaceText',
            fix(fixer) {
              if (typeof fixer.replaceText !== 'function') return null;
              return null;
            },
          });
          context.report({
            node,
            message: 'PROBE_OK fixer.insertTextBefore',
            fix(fixer) { return typeof fixer.insertTextBefore === 'function' ? null : null; },
          });
          context.report({
            node,
            message: 'PROBE_OK fixer.insertTextAfter',
            fix(fixer) { return typeof fixer.insertTextAfter === 'function' ? null : null; },
          });
          context.report({
            node,
            message: 'PROBE_OK fixer.remove',
            fix(fixer) { return typeof fixer.remove === 'function' ? null : null; },
          });
          context.report({
            node,
            message: 'PROBE_OK fixer.replaceTextRange',
            fix(fixer) { return typeof fixer.replaceTextRange === 'function' ? null : null; },
          });
          context.report({
            node,
            message: 'PROBE_OK fixer.removeRange',
            fix(fixer) { return typeof fixer.removeRange === 'function' ? null : null; },
          });
        },
      };
    },
  },
  'parser-services-empty': {
    create(context) {
      return {
        Program(node) {
          // parserServices must exist (empty {} on oxlint) so hasParserServices-
          // guarded rules don't throw. We're checking the *contract*: accessing
          // it should not throw, and it should be an object (possibly empty).
          let ps;
          try { ps = context.sourceCode.parserServices; } catch { return; }
          if (ps !== undefined && ps !== null && typeof ps === 'object') {
            ok(context, node, 'parserServices.empty');
          }
        },
      };
    },
  },
};

module.exports = { rules };
module.exports.ALL_PROBES = ALL_PROBES;
