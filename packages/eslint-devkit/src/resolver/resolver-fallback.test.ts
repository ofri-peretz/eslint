/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { clearFallbackCache, resolveWithoutOxc } from './resolver-fallback';

let root: string;
const w = (rel: string, body = '') => {
  const p = join(root, rel);
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, body);
  return p;
};
const from = () => join(root, 'src/main.ts');

beforeAll(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'resolver-fallback-')));
  w(
    'package.json',
    '{"imports":{"#util":"./src/exact.ts","#sub/*":"./src/*.ts","#dep":{"import":"cond-root"},"#gone":"./nope.ts"}}',
  );
  w('badpkg/package.json', '{ nope');
  w('noimports/package.json', '{}');
  w('src/main.ts');
  w('src/lib/util.ts');
  w('src/lib/dir/index.ts');
  w('src/exact.ts');
  w('base/only.ts');
  w(
    'base/base.json',
    '{ /* c */ "compilerOptions": { "baseUrl": "../base" } }',
  );
  w(
    'tsconfig.json',
    `{
      // line comment
      "extends": "./base/base.json",
      "compilerOptions": {
        "baseUrl": ".",
        "paths": {
          "@lib/*": ["src/lib/*"],
          "@x/*-suffix": ["src/lib/*"],
          "@exact": ["src/exact.ts"],
          "@miss/*": ["nowhere/*"], /* trailing */
          "s\\"q": ["src/exact.ts"],
        },
      },
    }`,
  );
  w('ext/tsconfig.json', '{"extends":"../base/base.json"}');
  w('bad/tsconfig.json', '{ not json');
  w('open/tsconfig.json', '/* unterminated');
  w('noext/tsconfig.json', '{"extends":"../tsconfig","compilerOptions":{}}');
  w('loop/tsconfig.json', '{"extends":"./tsconfig.json"}');
  w(
    'nobase/tsconfig.json',
    '{"compilerOptions":{"paths":{"~/*":["../src/lib/*"]}}}',
  );
  w('nm/tsconfig.json', '{}');
  w('nm/node_modules/cjs/package.json', '{"name":"cjs","main":"main.js"}');
  w('nm/node_modules/cjs/main.js');
  w(
    'node_modules/esm-only/package.json',
    '{"exports":{".":{"import":"./dist/index.mjs"},"./sub/*":{"import":["./dist/*.mjs"]},"./other":{"nope":"./x.js"},"./arr":[{"nope":"x"},"./dist/index.mjs"],"./arrnone":[{"nope":"x"}],"./nul":null,"./cn":{"import":{"nope":"x"},"types":"./dist/index.mjs"},"./pat/*":{"nope":"x"}}}',
  );
  w('node_modules/esm-only/dist/index.mjs');
  w('node_modules/esm-only/dist/feat.mjs');
  w('node_modules/cond-root/package.json', '{"exports":{"import":"./i.mjs"}}');
  w('node_modules/cond-root/i.mjs');
  w('node_modules/str-exports/package.json', '{"exports":"./s.mjs"}');
  w('node_modules/str-exports/s.mjs');
  w('node_modules/types-only/package.json', '{"types":"./t.d.ts"}');
  w('node_modules/types-only/t.d.ts');
  w(
    'node_modules/module-field/package.json',
    '{"module":"./esm/index.js","exports":null}',
  );
  w('node_modules/module-field/esm/index.js');
  w(
    'node_modules/@sc/pkg/package.json',
    '{"main":"./lib/index.js","exports":null}',
  );
  w('node_modules/@sc/pkg/lib/index.js');
  w('node_modules/@sc/pkg/deep/file.js');
  w('node_modules/idx-only/index.js');
  w('node_modules/..weird/index.js');
  w('node_modules/@sc/pkg/deep/only.d.ts');
  w('node_modules/no-main2/package.json', '{"main":"./gone.js"}');
  w('node_modules/no-main2/index.d.ts');
  w('node_modules/no-main/package.json', '{"main":"./gone.js"}');
  w('node_modules/no-main/index.js');
  w('node_modules/empty-dir/readme.txt');
  w(
    'node_modules/typed-exports/package.json',
    '{"exports":{".":{"types":"./t.d.ts"}}}',
  );
  w('node_modules/typed-exports/t.d.ts');
  w(
    'node_modules/missing-target/package.json',
    '{"exports":{".":"./nope.js"}}',
  );
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('resolveWithoutOxc', () => {
  const ts = () => join(root, 'tsconfig.json');

  it('resolves tsconfig paths: wildcard, exact, infix, and index probing', () => {
    clearFallbackCache();
    expect(resolveWithoutOxc('@lib/util', from(), ts())).toBe(
      join(root, 'src/lib/util.ts'),
    );
    expect(resolveWithoutOxc('@lib/dir', from(), ts())).toBe(
      join(root, 'src/lib/dir/index.ts'),
    );
    expect(resolveWithoutOxc('@exact', from(), ts())).toBe(
      join(root, 'src/exact.ts'),
    );
    expect(resolveWithoutOxc('@x/util-suffix', from(), ts())).toBe(
      join(root, 'src/lib/util.ts'),
    );
    expect(resolveWithoutOxc('s"q', from(), ts())).toBe(
      join(root, 'src/exact.ts'),
    );
    expect(resolveWithoutOxc('@miss/a', from(), ts())).toBeNull();
    expect(resolveWithoutOxc('@lib', from(), ts())).toBeNull();
    expect(resolveWithoutOxc('@x/-sx', from(), ts())).toBeNull();
  });

  it('resolves via baseUrl, inherited baseUrl, and paths without baseUrl', () => {
    expect(resolveWithoutOxc('src/exact', from(), ts())).toBe(
      join(root, 'src/exact.ts'),
    );
    expect(
      resolveWithoutOxc('only', from(), join(root, 'ext/tsconfig.json')),
    ).toBe(join(root, 'base/only.ts'));
    expect(
      resolveWithoutOxc('~/util', from(), join(root, 'nobase/tsconfig.json')),
    ).toBe(join(root, 'src/lib/util.ts'));
    expect(
      resolveWithoutOxc('only', from(), join(root, 'noext/tsconfig.json')),
    ).toBeNull();
  });

  it('tolerates unreadable, malformed and cyclic tsconfigs', () => {
    expect(
      resolveWithoutOxc('x-nope', from(), join(root, 'missing/tsconfig.json')),
    ).toBeNull();
    expect(
      resolveWithoutOxc('x-nope', from(), join(root, 'bad/tsconfig.json')),
    ).toBeNull();
    expect(
      resolveWithoutOxc('x-nope', from(), join(root, 'open/tsconfig.json')),
    ).toBeNull();
    expect(
      resolveWithoutOxc('x-nope', from(), join(root, 'loop/tsconfig.json')),
    ).toBeNull();
  });

  it('resolves node_modules packages through Node, then package.json', () => {
    const f = join(root, 'nm/a.ts');
    expect(resolveWithoutOxc('cjs', f, null)).toBe(
      join(root, 'nm/node_modules/cjs/main.js'),
    );
    expect(resolveWithoutOxc('esm-only', from(), null)).toBe(
      join(root, 'node_modules/esm-only/dist/index.mjs'),
    );
    expect(resolveWithoutOxc('esm-only/sub/feat', from(), null)).toBe(
      join(root, 'node_modules/esm-only/dist/feat.mjs'),
    );
    expect(resolveWithoutOxc('esm-only/arr', from(), null)).toBe(
      join(root, 'node_modules/esm-only/dist/index.mjs'),
    );
    expect(resolveWithoutOxc('esm-only/other', from(), null)).toBeNull();
    expect(resolveWithoutOxc('esm-only/arrnone', from(), null)).toBeNull();
    expect(resolveWithoutOxc('esm-only/nul', from(), null)).toBeNull();
    expect(resolveWithoutOxc('esm-only/pat/a', from(), null)).toBeNull();
    expect(resolveWithoutOxc('esm-only/cn', from(), null)).toBe(
      join(root, 'node_modules/esm-only/dist/index.mjs'),
    );
    expect(resolveWithoutOxc('@sc/pkg/deep/only', from(), null)).toBe(
      join(root, 'node_modules/@sc/pkg/deep/only.d.ts'),
    );
    expect(resolveWithoutOxc('no-main2', from(), null)).toBe(
      join(root, 'node_modules/no-main2/index.d.ts'),
    );
    expect(resolveWithoutOxc('esm-only/unlisted', from(), null)).toBeNull();
    expect(resolveWithoutOxc('cond-root', from(), null)).toBe(
      join(root, 'node_modules/cond-root/i.mjs'),
    );
    expect(resolveWithoutOxc('str-exports', from(), null)).toBe(
      join(root, 'node_modules/str-exports/s.mjs'),
    );
    expect(resolveWithoutOxc('types-only', from(), null)).toBe(
      join(root, 'node_modules/types-only/t.d.ts'),
    );
    expect(resolveWithoutOxc('module-field', from(), null)).toBe(
      join(root, 'node_modules/module-field/esm/index.js'),
    );
    expect(resolveWithoutOxc('@sc/pkg', from(), null)).toBe(
      join(root, 'node_modules/@sc/pkg/lib/index.js'),
    );
    expect(resolveWithoutOxc('@sc/pkg/deep/file.js', from(), null)).toBe(
      join(root, 'node_modules/@sc/pkg/deep/file.js'),
    );
    expect(resolveWithoutOxc('idx-only', from(), null)).toBe(
      join(root, 'node_modules/idx-only/index.js'),
    );
    expect(resolveWithoutOxc('no-main', from(), null)).toBe(
      join(root, 'node_modules/no-main/index.js'),
    );
    expect(resolveWithoutOxc('typed-exports', from(), null)).toBe(
      join(root, 'node_modules/typed-exports/t.d.ts'),
    );
    expect(resolveWithoutOxc('missing-target', from(), null)).toBeNull();
    expect(resolveWithoutOxc('empty-dir', from(), null)).toBeNull();
    expect(
      resolveWithoutOxc('not-installed-anywhere-xyz', from(), null),
    ).toBeNull();
  });

  it('honours custom extensions, conditions and mainFields', () => {
    expect(
      resolveWithoutOxc('cond-root', from(), null, {
        conditionNames: ['custom'],
      }),
    ).toBeNull();
    expect(
      resolveWithoutOxc('module-field', from(), null, {
        mainFields: ['main'],
        extensions: ['.js'],
      }),
    ).toBeNull();
  });

  it('rejects malformed package names, #imports; accepts absolute paths', () => {
    expect(resolveWithoutOxc('#internal', from(), null)).toBeNull();
    expect(resolveWithoutOxc('#util', from(), null)).toBe(
      join(root, 'src/exact.ts'),
    );
    expect(resolveWithoutOxc('#sub/lib/util', from(), null)).toBe(
      join(root, 'src/lib/util.ts'),
    );
    expect(resolveWithoutOxc('#dep', from(), null)).toBe(
      join(root, 'node_modules/cond-root/i.mjs'),
    );
    expect(resolveWithoutOxc('#gone', from(), null)).toBeNull();
    expect(resolveWithoutOxc('#x', join(root, 'badpkg/a.ts'), null)).toBeNull();
    expect(
      resolveWithoutOxc('#x', join(root, 'noimports/a.ts'), null),
    ).toBeNull();
    expect(resolveWithoutOxc('#x', '/a.ts', null)).toBeNull();
    expect(resolveWithoutOxc('fs', from(), null)).toBeNull();
    expect(resolveWithoutOxc('node:path', from(), null)).toBeNull();
    expect(resolveWithoutOxc('./missing', from(), null)).toBeNull();
    expect(resolveWithoutOxc('./exact?raw', from(), null)).toBe(
      join(root, 'src/exact.ts') + '?raw',
    );
    expect(resolveWithoutOxc('./exact#frag', from(), null)).toBe(
      join(root, 'src/exact.ts') + '#frag',
    );
    expect(
      resolveWithoutOxc('./exact', from(), null, { extensions: ['.js'] }),
    ).toBeNull();
    expect(resolveWithoutOxc('..weird', from(), null)).toBe(
      join(root, 'node_modules/..weird/index.js'),
    );
    expect(resolveWithoutOxc('../missing', from(), null)).toBeNull();
    expect(resolveWithoutOxc('@/', from(), null)).toBeNull();
    expect(resolveWithoutOxc('/', '/x.ts', null)).toBeNull();
    expect(resolveWithoutOxc(join(root, 'src/exact'), from(), null)).toBe(
      join(root, 'src/exact.ts'),
    );
  });
});
