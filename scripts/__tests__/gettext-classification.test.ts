/**
 * Lock for the printed-source classification ratchet.
 *
 * The detector has to catch both shapes that have actually shipped defects:
 * classifying the `getText()` result inline, and classifying a variable that
 * was assigned from it earlier — the latter is how
 * `express-security/require-route-authentication` came to silence every route
 * in a file (#313), and how `no-xpath-injection` came to match identifiers and
 * comments as XPath.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { findClassifications } from '../audit-gettext-classification';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const BASELINE = join(REPO_ROOT, '.agent', 'gettext-classification-baseline.json');

describe('findClassifications', () => {
  it('catches an inline classification of the call result', () => {
    const hits = findClassifications(
      `const bad = context.sourceCode.getText(node).includes('http://');`,
    );
    expect(hits).toHaveLength(1);
  });

  it('catches a variable assigned from getText and classified later', () => {
    const hits = findClassifications(
      [
        'const text = sourceCode.getText(node);',
        'doSomethingUnrelated();',
        "if (text.startsWith('//')) return true;",
      ].join('\n'),
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.line).toBe(3);
  });

  it('catches a regex tested against the text variable', () => {
    const hits = findClassifications(
      ['const callText = sourceCode.getText(node);', 'if (/req\\./.test(callText)) return;'].join(
        '\n',
      ),
    );
    expect(hits).toHaveLength(1);
  });

  it('does not flag getText used for reporting or fixing', () => {
    const hits = findClassifications(
      [
        'const text = sourceCode.getText(node);',
        'context.report({ node, messageId: "x", data: { text } });',
        'return fixer.replaceText(node, text.toUpperCase());',
      ].join('\n'),
    );
    expect(hits).toEqual([]);
  });

  it('does not flag comments that merely mention the pattern', () => {
    const hits = findClassifications(
      [
        '// getText(node).includes("x") is the thing we must not do',
        ' * const t = getText(n); t.match(/y/)',
      ].join('\n'),
    );
    expect(hits).toEqual([]);
  });

  it('does not flag classification of something that is not printed source', () => {
    const hits = findClassifications(
      ['const value = node.value;', "if (value.includes('http://')) return;"].join('\n'),
    );
    expect(hits).toEqual([]);
  });
});

describe('baseline', () => {
  it('exists and only ever ratchets down', () => {
    expect(existsSync(BASELINE)).toBe(true);
    const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')) as {
      total: number;
      files: Record<string, number>;
    };
    // The number itself is not the point — that it cannot grow is. A change
    // that adds a site fails `npm run audit:gettext`, which runs in CI.
    expect(baseline.total).toBeGreaterThan(0);
    expect(Object.values(baseline.files).reduce((a, b) => a + b, 0)).toBe(baseline.total);
  });
});
