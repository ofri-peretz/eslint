import { describe, expect, it } from 'vitest';
import { ignoreRuleMeta } from '../mutation/ignore-rule-meta';

const source = [
  'export default createRule({',
  "  meta: { type: 'problem', schema: [] },",
  '  defaultOptions: [{ strict: true }],',
  '  create(context) {',
  '    const meta = { hasSuggestions: true };',
  '    return {};',
  '  },',
  '});',
].join('\n');

const at = (line: number, column: number, status = 'Survived') => ({
  status,
  location: { start: { line, column } },
});

describe('ignoreRuleMeta', () => {
  it("ignores only mutants inside a rule definition's meta", () => {
    const report = {
      files: {
        'src/rules/x.ts': {
          source,
          mutants: [
            at(2, 9), // { type: … } — the rule's meta
            at(2, 3), // the `meta` key itself
            at(3, 21), // defaultOptions: behaviour, still graded
            at(5, 18), // a `meta` object inside create(): not the rule's
            at(1, 1, 'Killed'),
          ],
        },
      },
    };
    expect(
      ignoreRuleMeta(report).files['src/rules/x.ts'].mutants.map(
        (m) => m.status,
      ),
    ).toEqual(['Ignored', 'Ignored', 'Survived', 'Survived', 'Killed']);
  });
});
