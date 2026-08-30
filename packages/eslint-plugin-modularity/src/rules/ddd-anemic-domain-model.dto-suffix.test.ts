/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The DTO exemption matches a SUFFIX, not a substring.
 *
 * `DTO`, `Dto`, `Data`, `Request`, `Response`, `Payload` describe a naming
 * convention that is positional: `OrderDto`, `CreateUserRequest`,
 * `LoginPayload`. `.includes()` turned each into a substring, and because this
 * is a SUPPRESSION every collision costs a real finding rather than adding
 * noise.
 *
 * Demonstrated against a live control rather than argued: the same anemic class
 * reports as `Person` and goes silent as `Requestor`, purely because
 * `Requestor` contains `Request`. A requestor is an actor, not a data carrier.
 *
 * Note the file path. This rule only fires inside a domain directory, which is
 * why it has zero findings on the pinned corpus — none of the eight
 * repositories uses that layout. A test outside `domain/` would be quiet for a
 * reason that has nothing to do with what it claims to check.
 */

import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { dddAnemicDomainModel } from './ddd-anemic-domain-model';

/** An anemic class: state, a getter, a setter, no behaviour. */
const anemic = (className: string): string =>
  `class ${className} {\n  constructor(v) { this.v = v; }\n  getV() { return this.v; }\n  setV(v) { this.v = v; }\n}`;

const reports = (className: string): number =>
  new Linter({ configType: 'flat' })
    .verify(
      anemic(className),
      [
        {
          files: ['**/*.ts'],
          languageOptions: { parser: tsParser as never, ecmaVersion: 2022, sourceType: 'module' },
          plugins: { m: { rules: { ddd: dddAnemicDomainModel as never } } },
          rules: { 'm/ddd': 'error' },
        },
      ],
      'domain/Subject.ts',
    )
    .filter((m) => m.ruleId === 'm/ddd').length;

describe('positive control', () => {
  it('reports an anemic domain class', () => {
    // Everything below is only meaningful because this fires.
    expect(reports('Person')).toBe(1);
  });
});

describe('genuine DTO suffixes stay exempt', () => {
  it.each(['OrderDto', 'OrderDTO', 'CreateUserRequest', 'UserResponse', 'LoginPayload', 'UserData'])(
    '%s',
    (name) => {
      expect(reports(name)).toBe(0);
    },
  );
});

describe('names that merely CONTAIN a pattern are still reported', () => {
  it('Requestor is an actor, not a Request', () => {
    expect(reports('Requestor')).toBe(1);
  });

  it('Responder is an actor, not a Response', () => {
    expect(reports('Responder')).toBe(1);
  });

  it('DataMapper carries Data but is not a DTO', () => {
    expect(reports('DataMapper')).toBe(1);
  });

  it('PayloadValidator carries Payload but is not a DTO', () => {
    expect(reports('PayloadValidator')).toBe(1);
  });
});
