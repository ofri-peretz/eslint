/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The value-shape tests this rule decides with, pinned at their edges.
 *
 * Each is exported and pure, and each threshold below is one the rule's
 * documentation or comments state: 20 characters before a blob can be random,
 * an entropy bar of 3.5 bits, a fifth of the string in digits for an
 * identifier, a minority of vowel-less abbreviations in a phrase, and so on.
 * A fixture through the whole rule would pass for several reasons at once; at
 * the boundary only the function under test can decide it.
 */
import { describe, expect, it } from 'vitest';
import {
  isNaturalWordString,
  isPlaceholderValue,
  isPublishableKeyValue,
  isSecretShaped,
  isStyleToken,
  looksRandom,
} from './index';

const WORDS: ReadonlySet<string> = new Set(['changeme', 'your', 'xxx']);

describe('looksRandom — a dense alphanumeric blob', () => {
  it('needs twenty characters: nineteen random ones are not enough', () => {
    expect(looksRandom('aB3xY9zQ7mK1pL5vN8w')).toBe(false);
  });

  it('twenty random characters are enough', () => {
    expect(looksRandom('aB3xY9zQ7mK1pL5vN8wR')).toBe(true);
  });

  it('needs lowercase: uppercase and digits alone are an id, not a blob', () => {
    expect(looksRandom('X7KQ2M9PL4RT8VZN3HJ6WB5YC1DFG0SA')).toBe(false);
  });

  it('needs uppercase: lowercase and digits alone are not mixed case', () => {
    expect(looksRandom('x7kq2m9pl4rt8vzn3hj6wb5yc1dfg0sa')).toBe(false);
  });

  it('needs a digit: mixed-case letters alone are not a blob', () => {
    expect(looksRandom('XkQmPlRtVzNhJwByCdFgSaLe')).toBe(false);
  });

  it('a charset constant is maximal entropy and the opposite of a secret', () => {
    expect(
      looksRandom(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      ),
    ).toBe(false);
  });

  it('an ascending run of exactly five characters marks a charset', () => {
    expect(looksRandom('Kx7Qm2abcdeZp9Lw4Rt8Vn')).toBe(false);
  });

  it('an ascending run of four is chance, not a charset', () => {
    expect(looksRandom('Kx7Qm2abcdZp9Lw4Rt8Vn')).toBe(true);
  });

  it('a DEScending run is not a charset constant', () => {
    expect(looksRandom('Kx7Qm2edcbaZp9Lw4Rt8Vn')).toBe(true);
  });

  it('a repeating three-character cycle is low entropy, not random', () => {
    expect(looksRandom('aA1aA1aA1aA1aA1aA1aA1')).toBe(false);
  });

  it('the entropy bar is inclusive: exactly 3.5 bits per character is random', () => {
    // four characters x4 and eight x2: entropy is exactly 3.5.
    expect(looksRandom('QK77pQQzR9QabKX7z9ama37RpbXzam3z')).toBe(true);
  });
});

describe('isNaturalWordString — an identifier, not a key', () => {
  it('digits up to a fifth of the string are an ordinal', () => {
    expect(isNaturalWordString('userName12')).toBe(true);
  });

  it('a four-digit run is encoded data, not an ordinal', () => {
    expect(isNaturalWordString('releaseNotesFor2024Season')).toBe(false);
  });

  it('pieces under three letters are not judged for pronounceability', () => {
    expect(isNaturalWordString('nsDbPath')).toBe(true);
  });

  it('a vowel-less abbreviation of four letters inside a phrase is waived', () => {
    expect(isNaturalWordString('mtls_incompatible_client_auth')).toBe(true);
  });

  it('one abbreviation per real word is still a phrase', () => {
    expect(isNaturalWordString('mtls_auth')).toBe(true);
  });

  it('a vowel-less token longer than four letters is not an abbreviation', () => {
    expect(isNaturalWordString('build_strncmp_wrapper_function')).toBe(false);
  });

  it('one over-long vowel-less token sinks the phrase however many abbreviations sit beside it', () => {
    expect(isNaturalWordString('mtls_strncmp_client_auth_handler_value')).toBe(
      false,
    );
  });
});

describe('isSecretShaped — could this value be a secret at all', () => {
  it('a value shorter than minLength is not', () => {
    expect(isSecretShaped('aB3$', 8)).toBe(false);
  });

  it('a value with whitespace is prose, not a secret', () => {
    expect(isSecretShaped('Min. 8 chars & 1 digit!', 8)).toBe(false);
  });

  it('a symbol is a character class of its own', () => {
    expect(isSecretShaped('hunter~two', 8)).toBe(true);
  });

  it('separators are not symbols: a kebab-case word list is one class', () => {
    expect(isSecretShaped('qwhx-kzmv-btrp', 8)).toBe(false);
  });

  it('a single-class value of twenty characters is judged by entropy', () => {
    expect(isSecretShaped('qwhxkzmvbtrplnfdgcjs', 8)).toBe(true);
  });

  it('a single-class value of nineteen characters is not', () => {
    expect(isSecretShaped('qwhxkzmvbtrplnfdgcj', 8)).toBe(false);
  });

  it('a long single-class value with low entropy is not', () => {
    expect(isSecretShaped('12121212121212121212', 8)).toBe(false);
  });

  it('the single-class entropy bar is inclusive at 3.0 bits', () => {
    expect(isSecretShaped('012745630127456301274563', 8)).toBe(true);
  });

  it('an absolute URL with no userinfo is an address', () => {
    expect(isSecretShaped('https://api.example.com/v1/users', 8)).toBe(false);
  });

  it('a URL carrying userinfo carries the credential', () => {
    expect(isSecretShaped('https://admin:hunter2@db.example.com/app', 8)).toBe(
      true,
    );
  });

  it('a URL counts as an address only when the value starts with its scheme', () => {
    expect(isSecretShaped('<https://example.com/docs>', 8)).toBe(true);
  });

  it('a route rooted at a dynamic segment is a route', () => {
    expect(isSecretShaped('[locale]/settings/profile', 8)).toBe(false);
  });

  it('a path that ends in a double slash is still a path', () => {
    expect(isSecretShaped('/api/v1//', 8)).toBe(false);
  });

  it('a segment with a character no route carries is not a route', () => {
    expect(isSecretShaped('/api/v1/a!b', 8)).toBe(true);
  });

  it('a long segment of words is a route', () => {
    expect(isSecretShaped('/docs/getting-started-guide', 8)).toBe(false);
  });

  it('a long segment of uppercase and digits is an id, not generated', () => {
    expect(isSecretShaped('/v1/ABCDEF0123456789XYZ', 8)).toBe(false);
  });

  it('a long segment of lowercase and digits is an id, not generated', () => {
    expect(isSecretShaped('/v1/abcdef0123456789xyz', 8)).toBe(false);
  });

  it('a long mixed-case segment without digits is words, not generated', () => {
    expect(isSecretShaped('/v1/GettingStartedWithTheApi', 8)).toBe(false);
  });

  it('a generated segment of sixteen characters makes the path a secret', () => {
    expect(isSecretShaped('/v1/aB3xY9zQ7mK1pL5v', 8)).toBe(true);
  });

  it('a generated segment shorter than sixteen is tolerated in a multi-segment path', () => {
    expect(isSecretShaped('/v1/aB3x9', 8)).toBe(false);
    expect(isSecretShaped('/aB3x/files', 8)).toBe(false);
  });
});

describe('isStyleToken — CSS is written to be read', () => {
  it('a var() reference may have whitespace after the parenthesis', () => {
    expect(isStyleToken('var( --brand)')).toBe(true);
  });

  it('a bare custom-property name is a style token', () => {
    expect(isStyleToken('--brand-color')).toBe(true);
  });

  it('a custom-property name must start the value', () => {
    expect(isStyleToken('x--brand')).toBe(false);
  });

  it('a custom-property name must be the whole value', () => {
    expect(isStyleToken('--brand color')).toBe(false);
  });

  it('a custom-property name starts with a letter', () => {
    expect(isStyleToken('--9lives')).toBe(false);
  });

  it('a one-character arbitrary-value utility is a style token', () => {
    expect(isStyleToken('w-[32px]')).toBe(true);
  });

  it('an arbitrary-value utility must start the value', () => {
    expect(isStyleToken('#text-[red]')).toBe(false);
  });

  it('an arbitrary-value utility must be the whole value', () => {
    expect(isStyleToken('w-[32px]x')).toBe(false);
  });
});

describe('isPlaceholderValue — a self-evident stand-in', () => {
  it('surrounding whitespace does not hide a bracketed slot', () => {
    expect(isPlaceholderValue('  <API_SECRET>  ', WORDS)).toBe(true);
  });

  it('a bracketed slot of several characters is a template slot', () => {
    expect(isPlaceholderValue('<API_SECRET>', WORDS)).toBe(true);
  });

  it('a dunder sentinel is SCREAMING from its first letter', () => {
    expect(isPlaceholderValue('__secretKEY__', WORDS)).toBe(false);
  });

  it('a dunder sentinel needs three capitals, not one', () => {
    expect(isPlaceholderValue('__Ab1x9Kq__', WORDS)).toBe(false);
  });

  it('three repeats of one character are too short to be filler', () => {
    expect(isPlaceholderValue('zzz', WORDS)).toBe(false);
  });

  it('four repeats of one character are filler', () => {
    expect(isPlaceholderValue('zzzz', WORDS)).toBe(true);
  });

  it('a placeholder word is found inside camelCase', () => {
    expect(isPlaceholderValue('yourApiKey', WORDS)).toBe(true);
  });

  it('whitespace alone is not a placeholder', () => {
    expect(isPlaceholderValue('   ', WORDS)).toBe(false);
  });
});

describe('isPublishableKeyValue — published by its prefix', () => {
  it('a PostHog project key is publishable by value', () => {
    expect(isPublishableKeyValue('phc_YHtQ8fLmNvRw2XkPzB4dGjSaUeCiMoTr9')).toBe(
      true,
    );
  });

  it('a phc_ prefix on a short body is not a project key', () => {
    expect(isPublishableKeyValue('phc_short')).toBe(false);
  });

  it('a phc_ prefix on a body with punctuation is not a project key', () => {
    expect(isPublishableKeyValue('phc_!!!!!!!!!!!!!!!!!!!!!!')).toBe(false);
  });
});
