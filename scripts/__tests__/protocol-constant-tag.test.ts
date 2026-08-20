/**
 * Tests for the `@protocol-constant` escape on `unconfigurable-vocabulary`.
 *
 * The check exists because a baked-in word list a consumer cannot tune is a
 * heuristic they must accept whole. But some lists are a fixed API surface —
 * Node's cipher factories, the Service Worker `Cache` write methods, a library's
 * call signature — and making THOSE configurable is worse than leaving them
 * alone: it lets a consumer delete the entries the rule exists to find, and for
 * a call-signature set it lets them re-assert the false positive the set was
 * created to close.
 *
 * The tag is therefore an escape with teeth, and every test below pins one of
 * the teeth. The failure mode being guarded against is a bare tag used as a
 * silencer, which is precisely what the check is for.
 */
import { describe, expect, it } from 'vitest';
import { blankStringContents, protocolConstantNames } from '../rule-audit';

/**
 * What the vocabulary check is allowed to count as a declaration.
 *
 * `stripComments` deliberately preserves strings, because word lists live in
 * them — so a declaration quoted INSIDE a string counted as a declaration.
 * `detect-object-injection` carries `good: 'const ALLOWED_KEYS = [...]'` as
 * documentation and was charged with a constant that does not exist, which is
 * unfixable by construction: there is nothing there to tag or configure.
 *
 * That was the audit deciding on printed source — the exact defect its own
 * `textual-matching` check reports on rules.
 */
describe('blankStringContents', () => {
  const VOCAB = /const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+)?=\s*(?:new Set\()?\[([^\]]{20,})\]/g;
  const names = (src: string) => [...blankStringContents(src).matchAll(VOCAB)].map((m) => m[1]);

  it('still sees a real declaration', () => {
    expect(names("const CIPHER_FACTORIES = ['createCipheriv', 'createDecipheriv', 'createHash'];"))
      .toEqual(['CIPHER_FACTORIES']);
  });

  it('does NOT see a declaration quoted inside a doc example', () => {
    expect(names("const meta = { good: 'const ALLOWED_KEYS = [\\'name\\', \\'email\\', \\'role\\']' };"))
      .toEqual([]);
  });

  it('does NOT see one inside a template literal', () => {
    expect(names('const meta = { good: `const ALLOWED_KEYS = [\'a\', \'b\', \'c\', \'d\']` };')).toEqual([]);
  });

  /** The entry count heuristic reads the delimiters, so they have to survive. */
  it('preserves quote delimiters so a real list still counts its entries', () => {
    const blanked = blankStringContents("const X = ['aaa', 'bbb', 'ccc'];");
    expect((blanked.match(/'/g) ?? []).length).toBe(6);
  });

  it('preserves length and line structure', () => {
    const src = "const A = 'one';\nconst B = 'two';";
    const blanked = blankStringContents(src);
    expect(blanked).toHaveLength(src.length);
    expect(blanked.split('\n')).toHaveLength(2);
  });
});

const REASON = 'the complete Node crypto factory surface, fixed by the runtime';

describe('protocolConstantNames', () => {
  it('accepts a tag carrying a substantive reason', () => {
    const names = protocolConstantNames(`
      /**
       * @protocol-constant ${REASON}
       */
      const CIPHER_FACTORIES = new Set(['createCipheriv', 'createDecipheriv']);
    `);
    expect([...names]).toEqual(['CIPHER_FACTORIES']);
  });

  it('rejects a bare tag — a silencer is what the check exists to surface', () => {
    const names = protocolConstantNames(`
      /**
       * @protocol-constant
       */
      const TERMS = new Set(['password', 'secret', 'token']);
    `);
    expect([...names]).toEqual([]);
  });

  it('rejects a reason too short to be a justification', () => {
    const names = protocolConstantNames(`
      /**
       * @protocol-constant it is fine
       */
      const TERMS = new Set(['password', 'secret', 'token']);
    `);
    expect([...names]).toEqual([]);
  });

  /**
   * The one that matters most. If a tag could reach past the declaration it sits
   * on, a single justified constant would silently cover every list below it —
   * a claim about one list becoming a claim about lists nobody reviewed.
   */
  it('does not let the tag drift onto the next constant down the file', () => {
    const names = protocolConstantNames(`
      /**
       * @protocol-constant ${REASON}
       */
      const CIPHER_FACTORIES = new Set(['createCipheriv', 'createDecipheriv']);

      const SECRET_TERMS = new Set(['password', 'secret', 'token']);
    `);
    expect(names.has('CIPHER_FACTORIES')).toBe(true);
    expect(names.has('SECRET_TERMS')).toBe(false);
  });

  it('does not match when a comment is separated from the declaration by code', () => {
    const names = protocolConstantNames(`
      /**
       * @protocol-constant ${REASON}
       */
      const FIRST = 1;
      const SECRET_TERMS = new Set(['password', 'secret', 'token']);
    `);
    expect(names.has('SECRET_TERMS')).toBe(false);
  });

  it('reads a reason wrapped across several comment lines', () => {
    const names = protocolConstantNames(`
      /**
       * @protocol-constant the Service Workers spec defines exactly three write
       * methods on Cache; a consumer shortening the set would blind the rule to
       * the write it removed.
       */
      const CACHE_WRITE_METHODS = new Set(['put', 'add', 'addAll']);
    `);
    expect([...names]).toEqual(['CACHE_WRITE_METHODS']);
  });

  it('stops the reason at the next JSDoc tag rather than swallowing it', () => {
    const names = protocolConstantNames(`
      /**
       * @protocol-constant x
       * @see https://example.invalid/some/long/url/that/is/not/a/justification
       */
      const TERMS = new Set(['password', 'secret', 'token']);
    `);
    expect([...names]).toEqual([]);
  });

  it('handles an exported declaration', () => {
    const names = protocolConstantNames(`
      /**
       * @protocol-constant ${REASON}
       */
      export const CIPHER_FACTORIES = new Set(['createCipheriv']);
    `);
    expect([...names]).toEqual(['CIPHER_FACTORIES']);
  });

  it('ignores an untagged constant', () => {
    const names = protocolConstantNames(`
      /** Ordinary explanation with no tag at all. */
      const TERMS = new Set(['password', 'secret', 'token']);
    `);
    expect([...names]).toEqual([]);
  });
});
