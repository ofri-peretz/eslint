/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Unit locks for the receiver-origin classifier. Every binding is named
 * `foo` / `bar` on purpose: the verdict comes from where a value is written,
 * never from what it is called.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  createOriginClassifier,
  eitherOrigin,
  isFunctionNode,
  isPathAlias,
  sourceMatches,
  writtenAnnotation,
} from './driver-origin';
import { loadModule, moduleEnv, parseModule, valueAt } from './value-follow';

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'devkit-origin-'));
afterAll(() => fs.rmSync(ROOT, { recursive: true, force: true }));

const classify = createOriginClassifier(['drv']);

let counter = 0;
/** The origin of the argument of the last `probe(…)` call in `code`. */
function origin(code: string, extra: Record<string, string> = {}): string {
  const dir = path.join(ROOT, `o${counter++}`);
  for (const [name, text] of Object.entries({ 'main.ts': code, ...extra })) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), text);
  }
  const module = loadModule(path.join(dir, 'main.ts'), parser);
  if (module === null) throw new Error(`unparseable: ${code}`);
  let arg: TSESTree.Node | undefined;
  const visit = (node: TSESTree.Node): void => {
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'probe'
    ) {
      arg = node.arguments[0];
    }
    for (const [key, child] of Object.entries(node)) {
      if (key === 'parent') continue;
      for (const c of Array.isArray(child) ? child : [child]) {
        if (c && typeof c === 'object' && typeof c.type === 'string') visit(c);
      }
    }
  };
  visit(module.ast);
  return classify(valueAt(arg as TSESTree.Node, moduleEnv(module, parser)));
}

/** The origin of the TYPE annotation on the last `let probeType: T;`. */
function typeOrigin(code: string): string {
  const module = parseModule(code, path.join(ROOT, 't.ts'), parser);
  if (module === null) throw new Error(`unparseable: ${code}`);
  const last = module.ast.body.at(-1) as TSESTree.VariableDeclaration;
  const annotation = writtenAnnotation(last.declarations[0].id)!;
  return classify.ofType(valueAt(annotation, moduleEnv(module, parser)));
}

describe('helpers', () => {
  it('recognises path aliases, package roots and function nodes', () => {
    expect(isPathAlias('@/lib/db')).toBe(true);
    expect(isPathAlias('~/db')).toBe(true);
    expect(isPathAlias('#db')).toBe(true);
    expect(isPathAlias('@prisma/client')).toBe(false);
    expect(sourceMatches('drv/sub', ['drv'])).toBe(true);
    expect(sourceMatches('drvx', ['drv'])).toBe(false);
    expect(eitherOrigin('foreign', 'unknown')).toBe('unknown');
    expect(eitherOrigin('foreign', 'foreign')).toBe('foreign');
    expect(eitherOrigin('unknown', 'ours')).toBe('ours');
    expect(isFunctionNode({ type: 'Literal' } as TSESTree.Node)).toBe(false);
  });
});

describe('createOriginClassifier — values', () => {
  it('traces imports and requires of the driver, under any name', () => {
    expect(origin("import foo from 'drv';\nprobe(foo);")).toBe('ours');
    expect(origin("import { a as foo } from 'drv/x';\nprobe(foo.b.c);")).toBe(
      'ours',
    );
    expect(
      origin("const foo = require('drv');\nprobe(foo('t').where());"),
    ).toBe('ours');
    expect(
      origin(
        "import foo from 'drv';\nconst bar = new foo();\nprobe(await bar);",
      ),
    ).toBe('ours');
    expect(
      origin("import foo from 'drv';\nconst bar = foo?.x;\nprobe(bar?.y);"),
    ).toBe('ours');
  });

  it('calls another package, a path alias and a lib global what they are', () => {
    expect(origin("import foo from 'other';\nprobe(foo);")).toBe('foreign');
    expect(origin("import foo from '@/db';\nprobe(foo);")).toBe('unknown');
    expect(origin('probe(Map);')).toBe('foreign');
    expect(origin('probe(globalThis.x);')).toBe('foreign');
    expect(origin('probe(undeclared);')).toBe('unknown');
    expect(origin('const foo = new Map();\nprobe(foo);')).toBe('foreign');
  });

  it('judges literals, functions, ternaries and logicals', () => {
    expect(origin('probe({});')).toBe('foreign');
    expect(origin('probe(`x`);')).toBe('foreign');
    expect(origin('probe(() => 1);')).toBe('foreign');
    expect(origin('function foo() {}\nprobe(foo);')).toBe('foreign');
    expect(origin("import foo from 'drv';\nprobe(bar ?? foo);")).toBe('ours');
    expect(origin("import foo from 'drv';\nprobe(bar ? foo : baz);")).toBe(
      'ours',
    );
    expect(origin('probe(bar || baz);')).toBe('unknown');
    expect(origin('probe(-1);')).toBe('unknown');
  });

  it('follows a local factory to what it returns', () => {
    expect(
      origin(
        "import foo from 'drv';\nfunction bar() { return foo(); }\nprobe(bar());",
      ),
    ).toBe('ours');
    expect(origin('function bar() { log(); }\nprobe(bar());')).toBe('unknown');
  });

  it('classes: ours when they extend the driver', () => {
    expect(
      origin(
        "import { Base } from 'drv';\nclass Foo extends Base {}\nprobe(Foo);",
      ),
    ).toBe('ours');
    expect(
      origin("import { Base } from 'drv';\nprobe(class extends Base {});"),
    ).toBe('ours');
    expect(origin('class Foo {}\nprobe(new Foo());')).toBe('foreign');
  });

  it('bindings: annotation first, then the single write, then any write', () => {
    expect(
      origin(
        "import type { T } from 'drv';\nconst foo: T = make();\nprobe(foo);",
      ),
    ).toBe('ours');
    expect(
      origin(
        "import type { T } from '@/x';\nconst foo: T = new Map();\nprobe(foo);",
      ),
    ).toBe('foreign');
    expect(
      origin(
        "import foo from 'drv';\nlet bar;\nbar = 1;\nbar = foo;\nprobe(bar);",
      ),
    ).toBe('ours');
    expect(origin('let bar;\nprobe(bar);')).toBe('unknown');
    expect(origin('try {} catch (foo) { probe(foo); }')).toBe('foreign');
  });

  it('parameters: annotation, or the callback of a driver call', () => {
    expect(
      origin(
        "import type { T } from 'drv';\nfunction f(foo: T) { probe(foo); }",
      ),
    ).toBe('ours');
    expect(
      origin(
        "import foo from 'drv';\nfoo.transaction(async (bar) => { probe(bar); });",
      ),
    ).toBe('ours');
    expect(origin('baz.transaction(async (bar) => { probe(bar); });')).toBe(
      'unknown',
    );
    expect(origin('[1].map((bar) => probe(bar));')).toBe('unknown');
    expect(origin('function f(bar) { probe(bar); }')).toBe('unknown');
    expect(origin('call(function (bar) { probe(bar); });')).toBe('unknown');
  });

  it('relative imports: judged where they are written, else by what the module loads', () => {
    const lib = {
      'db.ts':
        "import drv from 'drv';\nexport const foo = drv();\nexport const loose = {} as any;\nexport default drv;",
      'models.js':
        "const { S } = require('drv');\nconst db = {};\nfor (const m of []) db[m.name] = m;\nmodule.exports = db;",
      'plain.ts':
        'export const thing = new Map();\nexport const other = make();',
    };
    expect(origin("import { foo } from './db';\nprobe(foo);", lib)).toBe(
      'ours',
    );
    expect(origin("import bar from './db';\nprobe(bar);", lib)).toBe('ours');
    expect(origin("import * as bar from './db';\nprobe(bar.foo);", lib)).toBe(
      'ours',
    );
    expect(
      origin("const { User } = require('./models');\nprobe(User);", lib),
    ).toBe('ours');
    expect(origin("import { thing } from './plain';\nprobe(thing);", lib)).toBe(
      'foreign',
    );
    expect(origin("import { other } from './plain';\nprobe(other);", lib)).toBe(
      'unknown',
    );
    expect(origin("import { none } from './missing';\nprobe(none);", lib)).toBe(
      'unknown',
    );
    expect(origin("import * as bar from './plain';\nprobe(bar);", lib)).toBe(
      'unknown',
    );
  });

  it('this: fields, parameter properties, constructor writes, and inheritance', () => {
    expect(
      origin(
        "import { T } from 'drv';\nclass A { foo: T; m() { probe(this.foo); } }",
      ),
    ).toBe('ours');
    expect(
      origin(
        "import drv from 'drv';\nclass A { foo = drv(); m() { probe(this.foo); } }",
      ),
    ).toBe('ours');
    expect(origin('class A { foo; m() { probe(this.foo); } }')).toBe('unknown');
    expect(
      origin(
        "import { T } from 'drv';\nclass A { constructor(private foo: T) {} m() { probe(this.foo); } }",
      ),
    ).toBe('ours');
    expect(
      origin(
        "import { T } from 'drv';\nclass A { constructor(private foo: T = x) {} m() { probe(this.foo); } }",
      ),
    ).toBe('ours');
    expect(
      origin(
        'class A { constructor(private foo) {} m() { probe(this.foo); } }',
      ),
    ).toBe('unknown');
    expect(
      origin(
        'class A { constructor(private bar: X, baz) {} m() { probe(this.foo); } }',
      ),
    ).toBe('unknown');
    expect(
      origin(
        "import drv from 'drv';\nclass A { constructor() { log(); this.foo = drv(); } m() { probe(this.foo); } }",
      ),
    ).toBe('ours');
    expect(
      origin(
        'class A { constructor(); constructor(x?) {} m() { probe(this.foo); } }',
      ),
    ).toBe('unknown');
    expect(
      origin(
        "import { Base } from 'drv';\nclass A extends Base { m() { probe(this.user); } }",
      ),
    ).toBe('ours');
    expect(
      origin(
        "import { Base } from 'drv';\nclass A extends Base { m() { probe(this); } }",
      ),
    ).toBe('ours');
    expect(
      origin(
        'class A { [k] = 1; get x() { return 1; } m() { probe(this.foo); } }',
      ),
    ).toBe('unknown');
    expect(origin('function f() { probe(this.foo); }')).toBe('unknown');
  });

  it('stops at the depth bound and on cycles', () => {
    // Each classification step may follow up to MAX_FOLLOW_DEPTH aliases, so
    // the bound is reached only by a chain far longer than any real program's.
    const chain = Array.from(
      { length: 200 },
      (_, i) => `const a${i + 1} = a${i};`,
    ).join('\n');
    expect(origin(`import a0 from 'drv';\n${chain}\nprobe(a200);`)).toBe(
      'unknown',
    );
    expect(origin('let a = b;\nlet b = a;\na = b;\nprobe(a);')).toBe('unknown');
  });
});

describe('createOriginClassifier — types', () => {
  it('reads imported, aliased, interface, union and typeof types', () => {
    expect(
      typeOrigin(
        "import type { Knex } from 'drv';\nlet probeType: Knex.Transaction;",
      ),
    ).toBe('ours');
    expect(
      typeOrigin("import type { X } from 'other';\nlet probeType: X;"),
    ).toBe('foreign');
    expect(typeOrigin("import type { X } from '@/x';\nlet probeType: X;")).toBe(
      'unknown',
    );
    expect(
      typeOrigin(
        "import type { K } from 'drv';\ntype A = K;\nlet probeType: A;",
      ),
    ).toBe('ours');
    expect(
      typeOrigin(
        "import type { K } from 'drv';\ninterface I extends K {}\nlet probeType: I;",
      ),
    ).toBe('ours');
    expect(typeOrigin('interface I {}\nlet probeType: I;')).toBe('foreign');
    expect(
      typeOrigin("import type { K } from 'drv';\nlet probeType: K | null;"),
    ).toBe('ours');
    expect(typeOrigin('let probeType: string & {};')).toBe('foreign');
    expect(
      typeOrigin(
        "import drv from 'drv';\nconst db = drv();\nlet probeType: typeof db;",
      ),
    ).toBe('ours');
    expect(typeOrigin("let probeType: typeof import('drv');")).toBe('unknown');
    expect(typeOrigin('let probeType: Map<string, number>;')).toBe('foreign');
    expect(typeOrigin('let probeType: Undeclared;')).toBe('unknown');
    expect(
      typeOrigin(
        "import { Base } from 'drv';\nclass C extends Base {}\nlet probeType: C;",
      ),
    ).toBe('ours');
    expect(
      typeOrigin(
        'class C { m(x: typeof this.y) { return x; } }\nlet probeType: typeof this.y;',
      ),
    ).toBe('unknown');
  });

  it('follows a relative type import to its declaration', () => {
    const dir = path.join(ROOT, `t${counter++}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'svc.ts'),
      "import { Client } from 'drv';\nexport class Svc extends Client {}\nexport type Alias = Client;\n",
    );
    const file = path.join(dir, 'main.ts');
    const check = (code: string): string => {
      fs.writeFileSync(file, code);
      fs.utimesSync(file, new Date(), new Date(Date.now() + counter++ * 1000));
      const module = loadModule(file, parser)!;
      const last = module.ast.body.at(-1) as TSESTree.VariableDeclaration;
      return classify.ofType(
        valueAt(
          writtenAnnotation(last.declarations[0].id)!,
          moduleEnv(module, parser),
        ),
      );
    };
    expect(check("import { Svc } from './svc';\nlet probeType: Svc;")).toBe(
      'ours',
    );
    expect(
      check("import type { Alias } from './svc';\nlet probeType: Alias;"),
    ).toBe('ours');
    expect(check("import { Gone } from './svc';\nlet probeType: Gone;")).toBe(
      'unknown',
    );
    expect(check("import * as ns from './svc';\nlet probeType: ns.Svc;")).toBe(
      'unknown',
    );
    expect(check("import { X } from './missing';\nlet probeType: X;")).toBe(
      'unknown',
    );
  });
});
