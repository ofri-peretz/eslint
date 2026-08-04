import { describe, expect, it } from 'vitest';

import { auditFindings, classifyFinding, shapeOf, type Finding } from '../audit-edge-ground-truth.ts';

const f = (over: Partial<Finding> = {}): Finding => ({
  rule: 'secure-coding/detect-object-injection',
  repo: 'three.js',
  file: 'src/x.js',
  line: 1,
  text: 'obj[ key ] = value;',
  ...over,
});

describe('edge ground truth: shapeOf', () => {
  it('erases identifiers so one class covers every member a single fix would resolve', () => {
    expect(shapeOf('animationToMorphTargets[ name ]')).toBe('obj[<ident>]');
    expect(shapeOf('this.files[ key ] = file;')).toBe('obj[<ident>]');
  });

  it('separates shapes that need different fixes', () => {
    expect(shapeOf('values[ valueStart + k ]')).toBe('obj[<arithmetic expr>]');
    expect(shapeOf('result[ dstOffset++ ]')).toBe('obj[<update expr>]');
    expect(shapeOf('indicesByUUID[ obj.uuid ]')).toBe('obj[<ident>.<field>]');
    expect(shapeOf('this.targetObject[ this.propertyName ]')).toBe('obj[this.<field>]');
    expect(shapeOf('arr[ 0 ]')).toBe('obj[<numeric literal>]');
    expect(shapeOf("obj[ 'name' ]")).toBe('obj[<string literal>]');
  });

  it('falls back to the callee for non-indexing findings', () => {
    expect(shapeOf('const s = new Set();')).toBe('Set(...)');
    expect(shapeOf('force = force || this.version !== other;')).toBe('other');
  });
});

describe('edge ground truth: classifyFinding', () => {
  it('scopes the class to the rule, so the same shape under two rules is triaged separately', () => {
    const a = classifyFinding(f({ rule: 'secure-coding/detect-object-injection' }));
    const b = classifyFinding(f({ rule: 'node-security/no-buffer-overread' }));
    expect(a).not.toBe(b);
  });
});

describe('edge ground truth: auditFindings', () => {
  it('reports an unlabelled class rather than assuming it is a false positive', () => {
    const r = auditFindings([f()], {});
    expect(r.unlabelled).toEqual(['secure-coding/detect-object-injection::obj[<ident>]']);
    expect(r.openFpClasses).toEqual([]);
  });

  it('leaves a TP class out of the work list — true findings are not defects to close', () => {
    const r = auditFindings([f()], {
      'secure-coding/detect-object-injection::obj[<ident>]': {
        verdict: 'TP',
        reason: 'proven crash on __proto__',
      },
    });
    expect(r.unlabelled).toEqual([]);
    expect(r.openFpClasses).toEqual([]);
  });

  it('keeps an FP class on the work list until it produces no findings', () => {
    const labels = {
      'secure-coding/detect-object-injection::obj[<ident>]': {
        verdict: 'FP' as const,
        reason: 'index arithmetic, provably numeric',
      },
    };
    const open = auditFindings([f(), f({ line: 2 })], labels);
    expect(open.openFpClasses).toEqual([
      {
        id: 'secure-coding/detect-object-injection::obj[<ident>]',
        count: 2,
        reason: 'index arithmetic, provably numeric',
      },
    ]);
    // Once the rule stops firing, the class disappears from the work list.
    expect(auditFindings([], labels).openFpClasses).toEqual([]);
  });

  it('orders classes by size so the biggest win is the first thing triaged', () => {
    const r = auditFindings(
      [f(), f({ line: 2 }), f({ text: 'arr[ i + 1 ]' })],
      {},
    );
    expect(r.classes[0].count).toBe(2);
    expect(r.totalFindings).toBe(3);
  });
});
