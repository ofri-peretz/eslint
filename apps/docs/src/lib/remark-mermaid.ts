/**
 * remark-mermaid — turns ```mermaid fenced blocks into `<Mermaid chart={…} />`
 * JSX so the Mermaid component bound in `mdx-components.tsx` actually runs.
 *
 * Used by:
 *   - apps/docs/source.config.ts        (static MDX under content/docs/**)
 *   - apps/docs/src/lib/mdx-compiler.tsx (RemoteMarkdown for remote rule docs)
 *
 * Without this plugin, fumadocs-mdx treats ```mermaid as a generic code fence
 * and renders the raw diagram source as a syntax-highlighted <pre><code>.
 *
 * We emit the prop as `chart={"…"}` (MDX attribute *expression*) and attach a
 * complete `data.estree` Program — without the estree, @mdx-js's recma stage
 * drops the expression and the compiled `_jsx(Mermaid, { chart: })` ends up
 * with an empty value, which Turbopack rejects with "Expression expected".
 * The estree is a one-statement Program holding a `Literal` whose `value` is
 * the raw chart string; MDX serializes that as a normal JS string literal,
 * so newlines, quotes, and `%%{init: …}%%` directives survive verbatim.
 */

import { visit } from 'unist-util-visit';
import type { Root, Code, RootContent } from 'mdast';

interface EstreeLiteral {
  type: 'Literal';
  value: string;
  raw: string;
}

interface EstreeProgram {
  type: 'Program';
  body: Array<{
    type: 'ExpressionStatement';
    expression: EstreeLiteral;
  }>;
  sourceType: 'module';
}

interface MdxJsxAttributeValueExpression {
  type: 'mdxJsxAttributeValueExpression';
  value: string;
  data: { estree: EstreeProgram };
}

interface MdxJsxAttribute {
  type: 'mdxJsxAttribute';
  name: string;
  value: string | MdxJsxAttributeValueExpression;
}

interface MdxJsxFlowElement {
  type: 'mdxJsxFlowElement';
  name: string;
  attributes: MdxJsxAttribute[];
  children: RootContent[];
}

function stringLiteralExpression(value: string): MdxJsxAttributeValueExpression {
  const raw = JSON.stringify(value);
  return {
    type: 'mdxJsxAttributeValueExpression',
    value: raw,
    data: {
      estree: {
        type: 'Program',
        sourceType: 'module',
        body: [
          {
            type: 'ExpressionStatement',
            expression: { type: 'Literal', value, raw },
          },
        ],
      },
    },
  };
}

export function remarkMermaid() {
  return (tree: Root) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'mermaid' || !parent || index === undefined) return;
      if (!node.value || node.value.trim() === '') return; // skip empty fences

      const replacement: MdxJsxFlowElement = {
        type: 'mdxJsxFlowElement',
        name: 'Mermaid',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'chart',
            value: stringLiteralExpression(node.value),
          },
        ],
        children: [],
      };
      // mdast-util-mdx-jsx augments the AST union; cast is the documented seam.
      (parent.children as unknown as MdxJsxFlowElement[])[index] = replacement;
    });
  };
}
