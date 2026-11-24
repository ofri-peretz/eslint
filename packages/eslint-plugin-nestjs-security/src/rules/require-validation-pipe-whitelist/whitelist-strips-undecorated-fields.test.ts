/**
 * @fileoverview The fix text must warn that whitelist strips undecorated fields.
 *
 * `whitelist: true` keeps a property only when it carries a class-validator
 * decorator, so a DTO field that is declared but undecorated is removed too.
 * Following a bare "add whitelist: true" would have broken three of the ten
 * NestJS samples this rule flags (12, 22, 29). The message is the fix the user
 * acts on, so it has to say "decorate first".
 */
import { describe, expect, it } from 'vitest';
import { requireValidationPipeWhitelist } from './index';

describe('require-validation-pipe-whitelist message', () => {
  const message = requireValidationPipeWhitelist.meta.messages.missingWhitelist;

  it('tells the user to decorate DTO fields before turning whitelist on', () => {
    expect(message).toMatch(/undecorated/);
    expect(message).toMatch(/@Allow\(\)/);
  });

  it('does not claim only undeclared properties are stripped', () => {
    expect(message).not.toMatch(/never declared/);
  });
});
