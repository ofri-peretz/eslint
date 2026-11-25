/**
 * Text the import regexes must not read as edges: comments. And the cache's
 * `ignoreTarget`, which drops an edge whose target the caller does not treat
 * as a module (eslint-plugin-import's `import/extensions` and `import/ignore`).
 */
import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  blankComments,
  createFileSystemCache,
  getFileImports,
} from './dependency-analysis';

const IMPORT = "import { a } from './a';";

describe('blankComments', () => {
  it('returns text with no comment marker untouched', () => {
    const text = `${IMPORT}\nexport const x = 1;\n`;
    expect(blankComments(text)).toBe(text);
  });

  it('blanks a line comment and keeps the newline and the length', () => {
    const text = `// ${IMPORT}\nexport const x = 1;\n`;
    const out = blankComments(text);
    expect(out).toHaveLength(text.length);
    expect(out.trim()).toBe('export const x = 1;');
  });

  it('blanks a line comment that ends the file with no newline', () => {
    expect(blankComments(`x // ${IMPORT}`).trim()).toBe('x');
  });

  it('blanks a block comment across lines and keeps every newline', () => {
    const text = `/**\n * ${IMPORT}\n */\nexport const x = 1;`;
    const out = blankComments(text);
    expect(out.split('\n')).toHaveLength(text.split('\n').length);
    expect(out).not.toContain('import');
  });

  it('an unterminated block comment hides the rest of the file', () => {
    expect(blankComments(`${IMPORT}\n/* ${IMPORT}\n`)).toBe(
      `${IMPORT}\n${' '.repeat(IMPORT.length + 3)}\n`,
    );
  });

  describe('where a comment cannot start', () => {
    it('inside a single-quoted string, with an escaped quote', () => {
      const text = "const u = 'it\\'s http://x'; // gone";
      expect(blankComments(text)).toBe("const u = 'it\\'s http://x';        ");
    });

    it('inside a double-quoted string', () => {
      const text = 'const u = "http://x"; // gone';
      expect(blankComments(text)).toBe('const u = "http://x";        ');
    });

    it('an unterminated string ends at the newline, not at the file', () => {
      const text = "const s = 'don't\n// gone\nx";
      expect(blankComments(text)).toBe("const s = 'don't\n       \nx");
    });

    it('inside a template literal', () => {
      const text = 'const g = `src/**/*.ts`; // gone';
      expect(blankComments(text)).toBe('const g = `src/**/*.ts`;        ');
    });

    it('inside a template literal with an escaped backtick', () => {
      const text = 'const g = `a\\`//b`; // gone';
      expect(blankComments(text)).toBe('const g = `a\\`//b`;        ');
    });

    it('a template hole is code: a comment in it is blanked, a brace in it is balanced', () => {
      const text = 'const g = `a${ {k: 1}.k /* c */ }//b`; // gone';
      expect(blankComments(text)).toBe(
        'const g = `a${ {k: 1}.k         }//b`;        ',
      );
    });

    it('a template inside a template hole', () => {
      const text = 'const g = `a${ `//${x}` }//b`; // gone';
      expect(blankComments(text)).toBe(
        'const g = `a${ `//${x}` }//b`;        ',
      );
    });

    it('an unterminated template ends at the end of the file', () => {
      expect(blankComments('x = `a // b')).toBe('x = `a // b');
    });

    it('inside a regular expression with a quote, after `=`', () => {
      const text = "const r = /'/; // gone";
      expect(blankComments(text)).toBe("const r = /'/;        ");
    });

    it('inside a regular expression with a slash in a class and an escaped slash', () => {
      const text = 'const r = /[/]\\/\\*/g; // gone';
      expect(blankComments(text)).toBe('const r = /[/]\\/\\*/g;        ');
    });

    it('a regular expression after `return`', () => {
      const text = "return /'/.test(x); // gone";
      expect(blankComments(text)).toBe("return /'/.test(x);        ");
    });

    it('an unterminated regular expression ends at the newline', () => {
      const text = 'const r = /abc\n// gone';
      expect(blankComments(text)).toBe('const r = /abc\n       ');
    });
  });

  describe('where a slash is a division', () => {
    it('after an identifier', () => {
      expect(blankComments("a / b; const s = 'x'; // gone")).toBe(
        "a / b; const s = 'x';        ",
      );
    });

    it('after a closing parenthesis', () => {
      expect(blankComments('(a) / b; // gone')).toBe('(a) / b;        ');
    });

    it('after an identifier with $ and digits that is not a keyword', () => {
      expect(blankComments('$a1 / 2; // gone')).toBe('$a1 / 2;        ');
    });
  });
});

describe('FileSystemCache.ignoreTarget', () => {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'dependency-ignore-')),
  );
  afterAll(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(root, 'a.ts'),
    "import './view.svelte';\nimport './b';\n// import './c';\n",
  );
  for (const name of ['view.svelte', 'b.ts', 'c.ts'])
    fs.writeFileSync(path.join(root, name), 'export const x = 1;\n');

  const edges = (ignoreTarget?: (p: string) => boolean): string[] => {
    const cache = createFileSystemCache();
    if (ignoreTarget) cache.ignoreTarget = ignoreTarget;
    return getFileImports(path.join(root, 'a.ts'), {
      workspaceRoot: root,
      barrelExports: [],
      cache,
    }).map((e) => path.basename(e.path));
  };

  it('with none, every resolved target is an edge, and a commented one is not', () => {
    expect(edges()).toEqual(['view.svelte', 'b.ts']);
  });

  it('drops the edges it returns true for', () => {
    expect(edges((p) => p.endsWith('.svelte'))).toEqual(['b.ts']);
  });
});
