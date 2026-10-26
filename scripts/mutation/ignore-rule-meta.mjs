/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Stryker ignorer: do not mutate a rule's `meta: { ... }` block.
 *
 * `meta` is docs URLs, CWE/CVSS, message templates and the options schema. A
 * mutant there (`docs: {}`, `hasSuggestions: true`, `schema: []`) cannot
 * change what the rule reports on any input, so its survival says nothing
 * about false positives or negatives — it only proves RuleTester does not
 * snapshot metadata. On the first pilot run these were 21 of 21 survivors in
 * jwt-security/require-max-age, burying the signal.
 *
 * `defaultOptions` is deliberately NOT ignored: a default the rule reads is
 * behaviour, and a surviving mutant there is a missing default-options case.
 * (One that survives because the rule never reads its options is a finding of
 * a different kind — an advertised option with no effect.)
 */

const keyName = (key) => key?.name ?? key?.value;

export const strykerPlugins = [
  // The shape `declareValuePlugin(PluginKind.Ignore, …)` returns, spelled out
  // so this file does not import @stryker-mutator/api, which is only a
  // transitive dependency of @stryker-mutator/core.
  {
    kind: 'Ignore',
    name: 'rule-meta',
    value: {
      shouldIgnore(path) {
        if (!path.isObjectProperty() || keyName(path.node.key) !== 'meta')
          return undefined;
        // Only the `meta` of a rule definition — an object that also carries
        // `create` or oxlint's `createOnce` — not some unrelated `{ meta }`
        // inside detection logic.
        const owner = path.parentPath;
        const isRule = owner.node.properties.some(
          (p) =>
            (p.type === 'ObjectMethod' || p.type === 'ObjectProperty') &&
            (keyName(p.key) === 'create' || keyName(p.key) === 'createOnce'),
        );
        return isRule
          ? 'Rule metadata (docs, messages, schema) cannot change a verdict'
          : undefined;
      },
    },
  },
];
