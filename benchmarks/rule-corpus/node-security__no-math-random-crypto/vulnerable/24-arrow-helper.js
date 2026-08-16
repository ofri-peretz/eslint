/**
 * VULNERABLE (wave 2, positive control) - arrow function bound to a
 * crypto-named const, with an intermediate local inside.
 */
'use strict';

const generateResetToken = () => {
  const bytes = Math.random().toString(36).slice(2);
  return `${bytes}${Date.now().toString(36)}`;
};

module.exports = { generateResetToken };
