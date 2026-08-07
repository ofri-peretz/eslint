/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Defer every rule module behind a getter on a plugin entry's `rules` object.
 *
 * A plugin barrel `require`s all of its rules at load. ESLint only ever reads
 * `plugin.rules[id]` for the rules a config ENABLES, so everything else is
 * parse-and-compile cost for code that never runs. Measured on a 7-plugin /
 * 34-enabled-rule config: 184 rule modules loaded and 181 ms of plugin load,
 * against 34 modules and 8.5 ms once deferred — total ESLint wall time 211 ms
 * → 70 ms. On a preset that enables most of a plugin it is a wash (59 vs
 * 64 ms), never a loss.
 *
 * Applied to the ARTIFACT, not the source. Getters in `index.ts` would have to
 * call `require('./rules/x')`, and vitest runs the .ts directly — Node's
 * require cannot resolve an extensionless specifier to a .ts file, so every
 * rule lookup throws under test while working perfectly once compiled.
 *
 * Lives here rather than inline in build-package.ts so it can be unit-tested:
 * that script runs its build on import, so a test cannot load it.
 */

export interface LazifyResult {
  code: string;
  /** Number of rule entries turned into getters (not distinct modules). */
  deferred: number;
}

/** `const x_1 = require("./rules/y");` at module scope. */
const EAGER_IMPORT = /^const (\w+) = require\("(\.\/rules\/[^"]+)"\);\n/gm;

export function lazifyRuleBarrel(source: string): LazifyResult | null {
  const imports = [...source.matchAll(EAGER_IMPORT)];
  if (imports.length === 0) return null;
  const byVar = new Map(imports.map((m) => [m[1], m[2]]));

  const block = source.match(/^exports\.rules = \{$([\s\S]*?)^\};$/m);
  if (!block) return null;

  const deferred = new Set<string>();
  let getters = 0;
  const body = block[1].replace(
    /^(\s*)('[\w$/-]+'|"[\w$/-]+"|[\w$]+):\s*(\w+)\.(\w+),$/gm,
    (
      whole,
      indent: string,
      key: string,
      variable: string,
      exported: string,
    ) => {
      const from = byVar.get(variable);
      if (from === undefined) return whole;
      deferred.add(variable);
      getters++;
      return `${indent}get ${key}() { return require("${from}").${exported}; },`;
    },
  );
  if (getters === 0) return null;

  let code = source.replace(block[0], `exports.rules = {${body}\n};`);

  // Drop an eager require only once nothing else in the file mentions its
  // binding — `namespace_1.namespace` in a re-export, a config reaching a rule
  // directly, anything.
  //
  // The rewritten `rules` block deliberately stays IN SCOPE. Its getters name
  // modules (`require("./rules/x").y`), never the old binding, so they cannot
  // produce a false positive — while an entry that did NOT convert still reads
  // `x_1.y` right there in the block. That matters when the same binding is
  // both deferred by one entry and used by a non-converting one (an alias
  // assigned from a call, say): exclude the block and the binding reads as
  // unused, its require is deleted, and the plugin throws ReferenceError at
  // load. Only the eager import lines come out, since those name every binding
  // by definition. `__tests__/lazify-rule-barrel.test.ts` pins both directions.
  const rest = code.replace(EAGER_IMPORT, '');
  for (const variable of deferred) {
    if (new RegExp(`\\b${variable}\\b`).test(rest)) continue;
    code = code.replace(
      new RegExp(
        `^const ${variable} = require\\("\\./rules/[^"]+"\\);\\n`,
        'm',
      ),
      '',
    );
  }
  return { code, deferred: getters };
}
