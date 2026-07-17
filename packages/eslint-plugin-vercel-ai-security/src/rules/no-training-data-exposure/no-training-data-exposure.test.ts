/**
 * @fileoverview Tests for no-training-data-exposure rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noTrainingDataExposure } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-training-data-exposure', noTrainingDataExposure, {
  valid: [
    // Training disabled
    {
      code: `
        const config = {
          training: false,
        };
      `,
    },
    // No training flag
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: userInput,
        });
      `,
    },
    // Non-training endpoint
    {
      code: `
        fetch('https://api.openai.com/v1/completions');
      `,
    },
    // Training in variable name only
    {
      code: `
        const trainingComplete = true;
      `,
    },
  ],

  invalid: [
    // Training enabled
    {
      code: `
        const config = {
          training: true,
        };
      `,
      errors: [{ messageId: 'trainingDataExposure' }],
    },
    // Allow training flag
    {
      code: `
        const options = {
          allowTraining: true,
        };
      `,
      errors: [{ messageId: 'trainingDataExposure' }],
    },
    // Finetune endpoint
    {
      code: `
        fetch('https://api.openai.com/v1/fine-tune');
      `,
      errors: [{ messageId: 'trainingDataExposure' }],
    },
    // Training endpoint
    {
      code: `
        const url = '/api/train/model';
      `,
      errors: [{ messageId: 'trainingDataExposure' }],
    },
    // Feedback endpoint
    {
      code: `
        fetch('https://api.example.com/feedback');
      `,
      errors: [{ messageId: 'trainingDataExposure' }],
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// Coverage-gap fixtures: key shapes for the Property listener
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-training-data-exposure (coverage gaps)', noTrainingDataExposure, {
  valid: [
    // computed key with a call expression resolves keyName to null
    { code: `const cfg = { [getKey()]: true };` },
    // training flag disabled — value is not `true`
    { code: `const cfg = { allowTraining: false };` },
    // training key with a non-boolean literal value
    { code: `const cfg = { trainingMode: 'off' };` },
  ],
  invalid: [
    // string-literal key resolves via String(key.value) and reports
    {
      code: `const cfg = { 'training': true };`,
      errors: [{ messageId: 'trainingDataExposure' }],
    },
  ],
});
