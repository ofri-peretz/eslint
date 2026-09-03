import { compile } from '@mdx-js/mdx';
import { visit } from 'unist-util-visit';

function myPlugin() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      const replacement = {
        type: 'mdxJsxFlowElement',
        name: 'Mermaid',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'chart',
            value: {
              type: 'mdxJsxAttributeValueExpression',
              value: JSON.stringify(node.value),
              data: {
                estree: {
                  type: 'Program',
                  body: [
                    {
                      type: 'ExpressionStatement',
                      expression: {
                        type: 'Literal',
                        value: node.value,
                        raw: JSON.stringify(node.value)
                      }
                    }
                  ],
                  sourceType: 'module'
                }
              }
            }
          }
        ],
        children: []
      };
      parent.children[index] = replacement;
    });
  };
}

const res = await compile('```mermaid\ngraph TD\nA-->B\n```', {
  remarkPlugins: [myPlugin],
  jsx: true
});

console.log(String(res));
