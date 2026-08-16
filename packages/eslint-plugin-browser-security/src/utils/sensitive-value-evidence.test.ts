/**
 * Tests for the storage & cookie evidence helpers.
 *
 * Every case here is a shape that was reproduced with `scripts/probe-rule.mts`
 * against the shipped rules before the helpers existed.
 */
import { describe, expect, it } from 'vitest';

import {
  BEARER_CREDENTIAL_TERMS,
  isJwtLiteral,
  namesBearerCredential,
  namesMeasurementOnly,
  namesNonBearerSecret,
  NON_BEARER_SECRET_TERMS,
  normalizeResourceKey,
} from './sensitive-value-evidence';

describe('vocabularies', () => {
  it('are disjoint — the partition depends on it', () => {
    const overlap = BEARER_CREDENTIAL_TERMS.filter((t) =>
      NON_BEARER_SECRET_TERMS.includes(t),
    );
    expect(overlap).toEqual([]);
  });

  it('matches whole words, not substrings', () => {
    // Reproduced false positives, one per line.
    expect(namesBearerCredential('article-author')).toBe(false); // auth ⊂ author
    expect(namesBearerCredential('tokenizer-config')).toBe(false); // token ⊂ tokenizer
    expect(namesBearerCredential('lastAccessed')).toBe(false);
    expect(namesNonBearerSecret('spinner-visible')).toBe(false); // pin ⊂ spinner
    expect(namesNonBearerSecret('creditLimit')).toBe(false); // credit ⊂ creditLimit

    // And the positive control for each.
    expect(namesBearerCredential('auth_state')).toBe(true);
    expect(namesBearerCredential('access_token')).toBe(true);
    expect(namesNonBearerSecret('creditCardNumber')).toBe(true);
    expect(namesNonBearerSecret('user_password')).toBe(true);
  });

  it('suppresses facts ABOUT a secret', () => {
    expect(namesMeasurementOnly('tokenCount')).toBe(true);
    expect(namesBearerCredential('tokenCount')).toBe(false);
    expect(namesNonBearerSecret('passwordLength')).toBe(false);
    expect(namesNonBearerSecret('password')).toBe(true);
  });

  it('accepts a replacement vocabulary', () => {
    expect(namesNonBearerSecret('dossier')).toBe(false);
    expect(namesNonBearerSecret('dossier', ['dossier'])).toBe(true);
    expect(namesNonBearerSecret('password', ['dossier'])).toBe(false);
  });
});

describe('normalizeResourceKey', () => {
  it('splits URL punctuation so path segments become words', () => {
    // `identifierWords` splits on _ - . and case boundaries but not on URL
    // punctuation, so without this `/api/me/credit-card` tokenises as
    // ['/api/me/credit', 'card'] and the phrase `credit card` never matches.
    expect(normalizeResourceKey('/api/me/credit-card')).toBe(
      '-api-me-credit-card',
    );
    expect(normalizeResourceKey('/api/session?token=1')).toBe(
      '-api-session-token-1',
    );
    // The predicates normalize internally, so a URL is judged by its segments.
    expect(namesNonBearerSecret('/api/me/credit-card')).toBe(true);
    expect(namesBearerCredential('/api/session?token=1')).toBe(true);
    expect(namesNonBearerSecret('/api/public/currency-rates')).toBe(false);
  });
});

describe('isJwtLiteral', () => {
  const JWT =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  it('accepts a real JWT', () => {
    expect(isJwtLiteral(JWT)).toBe(true);
  });

  it('rejects things that merely have three dotted parts', () => {
    expect(isJwtLiteral('a.b.c')).toBe(false);
    expect(isJwtLiteral('1.2.3')).toBe(false);
    expect(isJwtLiteral('com.example.app')).toBe(false);
    expect(isJwtLiteral('not-a-jwt')).toBe(false);
  });

  it('rejects a base64url header that is not a JOSE header', () => {
    // "notjsonatall" decodes to bytes that JSON.parse rejects.
    expect(isJwtLiteral('bm90anNvbmF0YWxs.eyJhIjoxfQ.sig')).toBe(false);
    // Valid JSON, but no `alg` claim — not a JOSE header.
    expect(isJwtLiteral('eyJhIjoxfQAA.eyJhIjoxfQ.sig')).toBe(false);
    // Valid JSON but not an object.
    expect(isJwtLiteral('MTIzNDU2Nzg.eyJhIjoxfQ.sig')).toBe(false);
  });
});

