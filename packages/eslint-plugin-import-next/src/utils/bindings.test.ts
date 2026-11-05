import { describe, expect, it } from 'vitest';
import { parse } from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import { boundNames } from './bindings';

const declared = (code: string) =>
  (parse(code).body[0] as TSESTree.VariableDeclaration).declarations.flatMap(
    (d) => boundNames(d.id),
  );

describe('boundNames', () => {
  it('reads every binding a pattern declares', () => {
    expect(declared('const { a, b: [c, , d = 1], ...rest } = o;')).toEqual([
      'a',
      'c',
      'd',
      'rest',
    ]);
    expect(declared('const [e, ...f] = arr;')).toEqual(['e', 'f']);
  });

  it('declares nothing for a member-expression target', () => {
    const member = { type: 'MemberExpression' } as TSESTree.Node;
    expect(boundNames(member)).toEqual([]);
  });
});
