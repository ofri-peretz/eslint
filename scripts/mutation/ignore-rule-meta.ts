/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Do not grade mutants in a rule's `meta: { ... }` block.
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
 *
 * Stryker did this with an ignorer plugin. oxmutate's ignore rules match calls
 * only, so the report is filtered here instead: those mutants are marked
 * `Ignored`, which every score already excludes.
 * ponytail: they still run; an oxmutate ignore-by-property rule would skip them.
 */

import ts from 'typescript';

interface Mutant {
  status: string;
  location: { start: { line: number; column: number } };
}
interface Report {
  files: Record<string, { source: string; mutants: Mutant[] }>;
}

const keyName = (p: ts.ObjectLiteralElementLike): string | undefined =>
  p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))
    ? p.name.text
    : undefined;

/** [start, end) offsets of every rule definition's `meta` property. */
function metaRanges(sf: ts.SourceFile): [number, number][] {
  const ranges: [number, number][] = [];
  const visit = (node: ts.Node): void => {
    // Only the `meta` of a rule definition — an object that also carries
    // `create` or oxlint's `createOnce` — not some unrelated `{ meta }`
    // inside detection logic.
    if (
      ts.isObjectLiteralExpression(node) &&
      node.properties.some((p) =>
        ['create', 'createOnce'].includes(keyName(p) ?? ''),
      )
    ) {
      for (const p of node.properties)
        if (keyName(p) === 'meta') ranges.push([p.getStart(sf), p.end]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return ranges;
}

/** Mark every mutant inside a rule's `meta` as Ignored, in place. */
export function ignoreRuleMeta<R extends Report>(report: R): R {
  for (const [file, { source, mutants }] of Object.entries(report.files)) {
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const ranges = metaRanges(sf);
    if (ranges.length === 0) continue;
    for (const m of mutants) {
      // The report's lines and columns are 1-based.
      const at = sf.getPositionOfLineAndCharacter(
        m.location.start.line - 1,
        m.location.start.column - 1,
      );
      if (ranges.some(([s, e]) => at >= s && at < e)) m.status = 'Ignored';
    }
  }
  return report;
}
