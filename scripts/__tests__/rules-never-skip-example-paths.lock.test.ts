/**
 * @provenBy {"file":"packages/eslint-plugin-browser-security/src/rules/require-mime-type-validation/index.ts","find":"  'example',\n","replace":"  'src/fixtures/',\n"}
 */

/*
 * A rule never skips a file because its path names examples/ or fixtures/.
 *
 * Consumers' examples and fixtures are code people copy, so a rule reports
 * there at its normal severity. AGENTS.md carried this as prose under "two
 * rules no gate holds yet"; this lock holds it. The scan reads every string,
 * template and regex literal in rule sources through the TypeScript parser,
 * so a comment that cites `examples/mvc/db.js` as the case that surfaced a
 * bug is not a hit, and a literal such as '/fixtures/' or /examples\// is.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SEGMENT =
  /(?:^|[/\\])(?:examples?|fixtures?|__fixtures__)[/\\]|[/\\](?:examples?|fixtures?|__fixtures__)(?:$|[/\\])/i;

/**
 * The text to read as a path. A regex literal drops its `/` delimiters and
 * flags, unescapes `\/`, reads `[/]` as a slash, and treats `^` as a path
 * boundary. A regex segment then needs a slash after it (REGEX_SEGMENT), so
 * `/example/` and `/^example/i` are words and `/^fixtures\//` is a path.
 */
function pathText(node: ts.Node & { text: string }): string {
  if (!ts.isRegularExpressionLiteral(node)) return node.text;
  const body = node.text.slice(1, node.text.lastIndexOf('/'));
  return body
    .replace(/\\\//g, '/')
    .replace(/\[\/\]/g, '/')
    .replace(/\^/g, '/');
}

const REGEX_SEGMENT = /(?:^|\/)(?:examples?|fixtures?|__fixtures__)\//i;

/** Literals in `source` that name an examples or fixtures path segment. */
export function examplePathLiterals(
  source: string,
  file = 'rule.ts',
): string[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const hits: string[] = [];
  const visit = (node: ts.Node) => {
    const literal =
      ts.isStringLiteralLike(node) ||
      ts.isRegularExpressionLiteral(node) ||
      ts.isTemplateLiteralToken(node);
    const pattern = ts.isRegularExpressionLiteral(node)
      ? REGEX_SEGMENT
      : SEGMENT;
    if (literal && pattern.test(pathText(node))) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      hits.push(`${file}:${line} ${node.getText()}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return hits;
}

function ruleSources(): string[] {
  const walk = (dir: string): string[] =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((e) =>
        e.isDirectory()
          ? walk(path.join(dir, e.name))
          : [path.join(dir, e.name)],
      );
  return fs
    .readdirSync(path.join(ROOT, 'packages'))
    .filter((p) => p.startsWith('eslint-plugin-'))
    .map((p) => path.join(ROOT, 'packages', p, 'src', 'rules'))
    .filter((dir) => fs.existsSync(dir))
    .flatMap(walk)
    .filter(
      (f) =>
        f.endsWith('.ts') &&
        !/\.(test|spec)\.ts$/.test(f) &&
        !f.split(path.sep).includes('__tests__'),
    );
}

describe('the scanner', () => {
  it('flags a path literal that names examples/ or fixtures/', () => {
    expect(
      examplePathLiterals(`if (filename.includes('/fixtures/')) return;`),
    ).toHaveLength(1);
    expect(examplePathLiterals(`const skip = /\\/examples\\//;`)).toHaveLength(
      1,
    );
    expect(examplePathLiterals('const p = `src/examples/${x}`;')).toHaveLength(
      1,
    );
  });

  it('reads an anchored regex as a path and a bare-word regex as a word', () => {
    expect(
      examplePathLiterals(`if (/^fixtures\\//.test(filename)) return;`),
    ).toHaveLength(1);
    expect(examplePathLiterals(`const word = /example/;`)).toEqual([]);
    expect(examplePathLiterals(`const weak = /^example/i;`)).toEqual([]);
  });

  it('ignores comments and bare words', () => {
    expect(
      examplePathLiterals(
        `// examples/mvc/db.js surfaced this\nconst t = 'example';`,
      ),
    ).toEqual([]);
  });
});

describe('rule sources', () => {
  it('reads the rule tree', () => {
    expect(ruleSources().length).toBeGreaterThan(100);
  });

  it('no rule names an examples or fixtures path', () => {
    const hits = ruleSources().flatMap((f) =>
      examplePathLiterals(fs.readFileSync(f, 'utf8'), path.relative(ROOT, f)),
    );
    expect(
      hits,
      `a rule must report in examples/ and fixtures/ at its normal severity; remove the path check:\n  ${hits.join('\n  ')}`,
    ).toEqual([]);
  });
});
