/**
 * ESLint Rule: no-invalid-html-attribute
 * Prevent invalid HTML attributes
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noInvalidHtmlAttribute';

const INVALID_HTML_ATTRIBUTES = new Set([
  'accept-charset', // Should be acceptCharset
  'accesskey', // Should be accessKey
  'allowfullscreen', // Should be allowFullScreen
  'allowtransparency', // Should be allowTransparency (deprecated)
  'bgcolor', // Should be backgroundColor
  'cellpadding', // Should be cellPadding
  'cellspacing', // Should be cellSpacing
  'charset', // Should be charSet
  'class', // Should be className
  'colspan', // Should be colSpan
  'contenteditable', // Should be contentEditable
  'contextmenu', // Should be contextMenu
  'crossorigin', // Should be crossOrigin
  'datetime', // Should be dateTime
  'enctype', // Should be encType
  'for', // Should be htmlFor
  'formaction', // Should be formAction
  'formenctype', // Should be formEncType
  'formmethod', // Should be formMethod
  'formnovalidate', // Should be formNoValidate
  'formtarget', // Should be formTarget
  'frameborder', // Should be frameBorder
  'hreflang', // Should be hrefLang
  'http-equiv', // Should be httpEquiv
  'inputmode', // Should be inputMode
  'maxlength', // Should be maxLength
  'minlength', // Should be minLength
  'novalidate', // Should be noValidate
  'readonly', // Should be readOnly
  'rowspan', // Should be rowSpan
  'spellcheck', // Should be spellCheck
  'srcdoc', // Should be srcDoc
  'srclang', // Should be srcLang
  'srcset', // Should be srcSet
  'tabindex', // Should be tabIndex
  'usemap', // Should be useMap
]);

type RuleOptions = [];

export const noInvalidHtmlAttribute = createRule<RuleOptions, MessageIds>({
  name: 'no-invalid-html-attribute',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent invalid HTML attributes',
    },
    messages: {
      noInvalidHtmlAttribute: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Invalid HTML Attribute',
        description: 'Invalid HTML attribute detected',
        severity: 'MEDIUM',
        fix: 'Use camelCase React attribute instead',
        documentationLink: 'https://react.dev/reference/react-dom/components/common#html-attributes',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type === 'JSXIdentifier') {
          const attrName = node.name.name;
          if (INVALID_HTML_ATTRIBUTES.has(attrName)) {
            context.report({
              node: node.name,
              messageId: 'noInvalidHtmlAttribute',
            });
          }
        }
      },
    };
  },
});
