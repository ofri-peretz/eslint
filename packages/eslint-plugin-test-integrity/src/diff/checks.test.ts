/**
 * @fileoverview Tests for the changed-lines checks.
 *
 * The intent's success criterion is the planted case: a `toBe(3)` changed to
 * `toBeTruthy()` is reported with file and line. The traps: a stronger
 * matcher, a different subject, a `.not` matcher, an unranked matcher, and a
 * snapshot change whose commit message does give a reason.
 */

import { describe, expect, it } from 'vitest';

import {
  MATCHER_RANK,
  parseUnifiedDiff,
  unexplainedSnapshots,
  weakenedAssertions,
} from './checks';

const DIFF = `diff --git a/src/sum.test.ts b/src/sum.test.ts
index 1111111..2222222 100644
--- a/src/sum.test.ts
+++ b/src/sum.test.ts
@@ -12 +12 @@ describe('sum', () => {
-    expect(sum(1, 2)).toBe(3);
+    expect(sum(1, 2)).toBeTruthy();
@@ -20,2 +20,2 @@
-    expect(a).toEqual({ x: 1 });
-    expect(b).toMatchObject({});
+    expect(a).toStrictEqual({ x: 1 });
+    expect(c).toBeDefined();
diff --git a/src/gone.test.ts b/src/gone.test.ts
deleted file mode 100644
--- a/src/gone.test.ts
+++ /dev/null
@@ -1 +0,0 @@
-    expect(x).toBe(1);
`;

describe('parseUnifiedDiff', () => {
  it('reads files, hunks and line numbers on both sides', () => {
    const files = parseUnifiedDiff(DIFF);
    expect(files.map((f) => f.path)).toEqual(['src/sum.test.ts']);
    const [first, second] = files[0].hunks;
    expect(first.removed).toEqual([
      { line: 12, text: '    expect(sum(1, 2)).toBe(3);' },
    ]);
    expect(first.added).toEqual([
      { line: 12, text: '    expect(sum(1, 2)).toBeTruthy();' },
    ]);
    expect(second.added.map((l) => l.line)).toEqual([20, 21]);
  });

  it('ignores hunks before any file header and context outside hunks', () => {
    expect(parseUnifiedDiff('@@ -1 +1 @@\n-a\n+b\n')).toEqual([]);
    expect(parseUnifiedDiff('+++ b/x.ts\n+stray\n')).toEqual([
      { path: 'x.ts', hunks: [] },
    ]);
  });
});

describe('weakenedAssertions', () => {
  it('reports toBe → toBeTruthy on the same subject, with file and line', () => {
    const findings = weakenedAssertions(parseUnifiedDiff(DIFF));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      check: 'weakened-assertion',
      path: 'src/sum.test.ts',
      line: 12,
    });
    expect(findings[0].message).toContain('.toBe()');
    expect(findings[0].message).toContain('.toBeTruthy()');
  });

  it('does not report a stronger matcher, a new subject, .not, or an unranked matcher', () => {
    const diff = `+++ b/a.test.ts
@@ -1,4 +1,4 @@
-expect(a).toEqual(1);
-expect(b).toBe(1);
-expect(c).toBe(1);
-expect(d).toBe(1);
+expect(a).toBe(1);
+expect(b).not.toBeTruthy();
+expect(c).toHaveLength(1);
+expect(e).toBeTruthy();
`;
    expect(weakenedAssertions(parseUnifiedDiff(diff))).toEqual([]);
  });

  it('accepts an Assertion: line in a commit message of the range', () => {
    const files = parseUnifiedDiff(DIFF);
    expect(
      weakenedAssertions(
        files,
        'test: x\n\nAssertion: sum now returns a branded number\n',
      ),
    ).toEqual([]);
    expect(weakenedAssertions(files, 'Assertion:\n')).toHaveLength(1);
  });

  it('ignores whitespace inside the subject', () => {
    const diff = `+++ b/a.test.ts
@@ -1 +1 @@
-expect(sum(1,2)).toEqual(3);
+expect( sum(1, 2) ).toMatchObject(3);
`;
    expect(weakenedAssertions(parseUnifiedDiff(diff))).toHaveLength(1);
  });

  it('ranks the documented order', () => {
    expect(MATCHER_RANK['toBe']).toBeGreaterThan(MATCHER_RANK['toEqual']);
    expect(MATCHER_RANK['toEqual']).toBeGreaterThan(
      MATCHER_RANK['toMatchObject'],
    );
    expect(MATCHER_RANK['toMatchObject']).toBeGreaterThan(
      MATCHER_RANK['toBeTruthy'],
    );
    expect(MATCHER_RANK['toBeDefined']).toBe(MATCHER_RANK['toBeTruthy']);
  });
});

describe('unexplainedSnapshots', () => {
  const paths = ['src/a.ts', 'src/__snapshots__/a.test.ts.snap', 'x/y.snap'];

  it('reports each changed snapshot when no commit gives a reason', () => {
    const findings = unexplainedSnapshots(paths, 'feat(x): change output\n');
    expect(findings.map((f) => f.path)).toEqual([
      'src/__snapshots__/a.test.ts.snap',
      'x/y.snap',
    ]);
    expect(findings[0]).toMatchObject({
      check: 'unexplained-snapshot',
      line: 1,
    });
  });

  it('accepts a Snapshot: line in any commit of the range', () => {
    const messages =
      'feat(x): change output\n\nSnapshot: the header now includes the version\n';
    expect(unexplainedSnapshots(paths, messages)).toEqual([]);
  });

  it('does not accept an empty Snapshot: line', () => {
    expect(unexplainedSnapshots(paths, 'Snapshot:\n')).toHaveLength(2);
  });
});
