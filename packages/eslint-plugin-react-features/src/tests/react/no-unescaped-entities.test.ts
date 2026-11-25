import { RuleTester } from '@typescript-eslint/rule-tester';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnescapedEntities } from '../../rules/react/no-unescaped-entities';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

/** The four default entries, as upstream lists them: the character and what replaces it. */
const ALTERNATIVES: Record<string, string[]> = {
  '>': ['&gt;'],
  '"': ['&quot;', '&ldquo;', '&#34;', '&rdquo;'],
  "'": ['&apos;', '&lsquo;', '&#39;', '&rsquo;'],
  '}': ['&#125;'],
};

/** The error for the `char` at 1-based `column` of the one-line `code`, with every alternative as a suggestion. */
function at(code: string, char: string, column: number) {
  return {
    messageId: 'noUnescapedEntities' as const,
    line: 1,
    column,
    suggestions: ALTERNATIVES[char].map((alt) => ({
      messageId: 'replaceWithAlt' as const,
      data: { alt },
      output: code.slice(0, column - 1) + alt + code.slice(column),
    })),
  };
}

ruleTester.run('no-unescaped-entities', noUnescapedEntities, {
  valid: [
    {
      name: 'an escaped quote entity is what it should be',
      code: `<div>Use &quot;quotes&quot; and &#34;these&#34;</div>`,
    },
    {
      name: 'an escaped greater-than entity',
      code: `<div>5 &gt; 3</div>`,
    },
    // Valid - normal text
    {
      name: 'plain text',
      code: `<div>Hello World</div>`,
    },
    {
      name: 'escaped apostrophes and braces are what the rule asks for',
      code: `<div>It&apos;s &lsquo;fine&rsquo; &#39;here&#39; &#125;</div>`,
    },
    {
      name: 'apostrophes and quotes inside expression containers and attribute values',
      code: `<div title="it's">{"it's"}{'say "hi"'}</div>`,
    },
    // Valid - expression containers
    {
      name: 'less than in expression',
      code: `<div>{'a < b'}</div>`,
    },
    {
      name: 'greater than in expression',
      code: `<div>{'a > b'}</div>`,
    },
    {
      name: 'quote in expression',
      code: `<div>{'"Hello"'}</div>`,
    },
    // Valid - whitespace only
    {
      name: 'whitespace only',
      code: `<div>   </div>`,
    },
    {
      name: 'newlines only',
      code: `<div>
      </div>`,
    },
    // Valid - attributes with special characters
    {
      name: 'attribute with less than',
      code: `<input placeholder="a < b" />`,
    },
    {
      name: 'attribute with greater than',
      code: `<input placeholder="a > b" />`,
    },
    // Valid - no JSX text
    {
      name: 'no JSX text',
      code: `<div><span /></div>`,
    },
    {
      name: 'expression only',
      code: `<div>{variable}</div>`,
    },
    // Valid - other special characters
    {
      name: 'ampersand entity',
      code: `<div>Tom &amp; Jerry</div>`,
    },
    {
      name: 'non-breaking space',
      code: `<div>Hello&nbsp;World</div>`,
    },
  ],
  invalid: [
    // upstream no-unescaped-entities.js: the default `forbid` is `>`, `"`, `'`, `}`,
    // every occurrence is its own report, and each alternative is a suggestion.
    // `>` and `}` do not parse under the TypeScript parser: see the Linter block below.
    {
      name: 'unescaped double quote',
      code: `<div>He said "hello"</div>`,
      errors: [
        at(`<div>He said "hello"</div>`, '"', 14),
        at(`<div>He said "hello"</div>`, '"', 20),
      ],
    },
    {
      name: 'nested text with quotes',
      code: `<div><span>Say "hello"</span></div>`,
      errors: [
        at(`<div><span>Say "hello"</span></div>`, '"', 16),
        at(`<div><span>Say "hello"</span></div>`, '"', 22),
      ],
    },
    {
      name: 'multiple quotes',
      code: `<div>"A" and "B"</div>`,
      errors: [
        at(`<div>"A" and "B"</div>`, '"', 6),
        at(`<div>"A" and "B"</div>`, '"', 8),
        at(`<div>"A" and "B"</div>`, '"', 14),
        at(`<div>"A" and "B"</div>`, '"', 16),
      ],
    },
    {
      // upstream: `<script>window.foo = "bar"</script>` expects 2 errors
      name: 'two quotes in one text node are two reports',
      code: `<script>window.foo = "bar"</script>`,
      errors: [
        at(`<script>window.foo = "bar"</script>`, '"', 22),
        at(`<script>window.foo = "bar"</script>`, '"', 26),
      ],
    },
    {
      // upstream: `return <div>'</div>;`, the default set holds `'`
      name: 'FN: an apostrophe in text is reported',
      // @found react-bootstrap/react-bootstrap 2026-11-24 (drop-in comparison: upstream reports `it's`)
      code: `<div>It's a nice day</div>`,
      errors: [at(`<div>It's a nice day</div>`, "'", 8)],
    },
    {
      name: 'single quotes around a word are two reports',
      code: `<div>He said 'hello'</div>`,
      errors: [
        at(`<div>He said 'hello'</div>`, "'", 14),
        at(`<div>He said 'hello'</div>`, "'", 20),
      ],
    },
  ],
});

/**
 * `>` and `}` in JSX text are a syntax error under espree and under the
 * TypeScript parser; upstream tests them only where its babel parser allows
 * them (`allowsInvalidJSX`, tests/lib/rules/no-unescaped-entities.js). No such
 * parser is installed here, so this one stands in for it: it parses the text
 * with each stray `>` and `}` swapped for an ordinary character of the same
 * width, then gives the JSXText nodes back the source as written.
 */
const tolerant = {
  parseForESLint(code: string, options: Record<string, unknown>) {
    const safe = code
      .replace(/(?<=\s)>(?=\s)/g, '&')
      .replace(/(?<=\})\}/g, '&');
    const result = parser.parseForESLint(safe, options as never);
    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const n = node as {
        type?: string;
        range?: [number, number];
        raw?: string;
        value?: string;
      };
      if (n.type === 'JSXText' && n.range) {
        n.raw = code.slice(n.range[0], n.range[1]);
        n.value = n.raw;
      }
      for (const [key, child] of Object.entries(n)) {
        if (key === 'parent') continue;
        if (Array.isArray(child)) child.forEach(visit);
        else visit(child);
      }
    };
    visit(result.ast);
    return result;
  },
};

describe('no-unescaped-entities where the parser lets > and } into JSX text', () => {
  const lint = (code: string, options: unknown[] = []) =>
    new Linter({ configType: 'flat' }).verify(code, {
      files: ['**/*.js'],
      plugins: {
        x: { rules: { 'no-unescaped-entities': noUnescapedEntities } },
      },
      languageOptions: {
        parser: tolerant,
        ecmaVersion: 2018,
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      rules: { 'x/no-unescaped-entities': ['error', ...options] },
    } as unknown as Linter.Config);

  const fixed = (code: string, message: Linter.LintMessage) =>
    (message.suggestions ?? []).map(
      (s) =>
        code.slice(0, s.fix.range[0]) + s.fix.text + code.slice(s.fix.range[1]),
    );

  it('the default set holds `>`, with the one alternative upstream lists', () => {
    const code = '<div>a > b</div>';
    const messages = lint(code);
    expect(messages.map((m) => [m.line, m.column])).toEqual([[1, 8]]);
    expect(fixed(code, messages[0])).toEqual(['<div>a &gt; b</div>']);
  });

  it('the default set holds `}`, with the one alternative upstream lists', () => {
    // upstream: <div>{"Unbalanced braces - default parser"}}</div>
    const code = '<div>{"open"}}</div>';
    const messages = lint(code);
    expect(messages.map((m) => [m.line, m.column])).toEqual([[1, 14]]);
    expect(fixed(code, messages[0])).toEqual(['<div>{"open"}&#125;</div>']);
  });

  it('a character on a later line is reported on that line', () => {
    // upstream: "first line is ok / so is second / and here are some bad entities: >"
    const messages = lint('<div>first line is fine\n  and here: >\n</div>');
    expect(messages.map((m) => [m.line, m.column])).toEqual([[2, 13]]);
  });

  it('options replace the default set: `>` is allowed when only `&` is forbidden', () => {
    expect(lint('<div>a > b</div>', [{ forbid: ['&'] }])).toEqual([]);
  });
});
