/**
 * `unconfigurable-vocabulary` must see a membership test however it is spelled.
 *
 * The check pairs two facts: a word list no option can override, and evidence
 * that the rule actually looks names up in it. The second half was a grep of
 * `create()` for `.has(` / `includes(` / `some(`.
 *
 * That made the finding disappear when the lookup moved behind a devkit helper.
 * Converting `DANGEROUS_PROPERTIES.has(propertyName(n) as string)` to
 * `namesOneOf(propertyName(n), DANGEROUS_PROPERTIES)` dropped the finding from
 * four browser-security rules in one commit, while their word lists stayed
 * exactly as unconfigurable as they had been — the helper-shaped evasion
 * CLAUDE.md records for the name-inference gate, arriving unbidden.
 *
 * A gate that goes quiet because the code was refactored hands you a green tick
 * for the change that hid the defect. So both spellings are pinned here, and
 * the `namesOneOf` case fails on the pre-fix detector.
 */
import { describe, expect, it } from 'vitest';
import { auditRule, type RuleFacts } from '../rule-audit';

/** A rule carrying one unconfigurable word list, looked up however `body` says. */
const ruleWith = (body: string): RuleFacts => ({
  plugin: 'browser-security',
  rule: 'no-example',
  source: '',
  code: `const DANGEROUS_PROPERTIES = ['innerHTML', 'outerHTML', 'srcdoc', 'action'];`,
  tests: '',
  testCode: '',
  // The list is declared at MODULE scope, not inside `create()`: a vocabulary
  // built per-invocation is already reachable from options, and the check
  // filters those out. Only the lookup goes in the create body.
  createBody: body,
  metaBlock: '',
  protocolConstants: new Set(),
  utils: [],
  validCases: 8,
  invalidCases: 8,
  cwe: 'CWE-79',
  corpusVulnerable: 0,
  nameDebt: null,
  siblings: [],
  partitionMatrices: [],
  selectors: ['AssignmentExpression'],
  hasDocPage: true,
});

const reportsVocabulary = (body: string): boolean =>
  auditRule(ruleWith(body)).some((f) => f.id === 'unconfigurable-vocabulary');

describe('unconfigurable-vocabulary sees every membership spelling', () => {
  it('sees the direct Set lookup', () => {
    expect(reportsVocabulary('DANGEROUS_PROPERTIES.has(name);')).toBe(true);
  });

  it('sees an array lookup', () => {
    expect(reportsVocabulary('DANGEROUS_PROPERTIES.includes(name);')).toBe(
      true,
    );
  });

  // The regression. Pre-fix this returned false: `namesOneOf(` contains none of
  // `.has(`, `includes(` or `some(`, so the rule read as not using the list at
  // all — and a list nothing looks up in is not a finding.
  it('sees the lookup written through the devkit helper', () => {
    expect(
      reportsVocabulary(
        'namesOneOf(propertyName(node), DANGEROUS_PROPERTIES);',
      ),
    ).toBe(true);
  });

  it('still declines a rule that declares the list and never looks in it', () => {
    // Not a silencer test: with no membership evidence there is nothing to say
    // the vocabulary decides a report, and charging it would be unfixable.
    expect(reportsVocabulary('return node.type === "Literal";')).toBe(false);
  });
});
