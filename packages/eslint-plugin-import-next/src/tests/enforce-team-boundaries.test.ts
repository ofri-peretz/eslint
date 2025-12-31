/**
 * Tests for enforce-team-boundaries
 * Prevents unauthorized cross-team imports in large codebases
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { enforceTeamBoundaries } from '../rules/enforce-team-boundaries';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const defaultOptions = {
  teams: [
    {
      team: 'platform',
      paths: ['src/platform/**', '@company/platform'],
      allowedDependencies: ['shared'],
      publicPackages: ['@company/platform-api'],
    },
    {
      team: 'payments',
      paths: ['src/payments/**', '@company/payments'],
      allowedDependencies: ['platform', 'shared'],
      publicPackages: ['@company/payments-sdk'],
    },
    {
      team: 'auth',
      paths: ['src/auth/**', '@company/auth'],
      allowedDependencies: ['shared'],
      publicPackages: ['@company/auth-sdk'],
    },
    {
      team: 'shared',
      paths: ['src/shared/**', '@company/shared'],
      allowedDependencies: [],
      publicPackages: ['@company/shared'],
    },
  ],
  sharedPaths: ['src/utils/**', '@company/shared/**'],
  allowExternalPackages: true,
};

ruleTester.run('enforce-team-boundaries', enforceTeamBoundaries, {
  valid: [
    // ✅ Same team import
    {
      code: `import { Button } from '../components/Button';`,
      filename: 'src/platform/features/Dashboard.tsx',
      options: [defaultOptions],
    },

    // ✅ Allowed dependency (payments can import from platform)
    {
      code: `import { Logger } from '@company/platform-api';`,
      filename: 'src/payments/checkout/Checkout.tsx',
      options: [defaultOptions],
    },

    // ✅ Shared path - anyone can import
    {
      code: `import { formatDate } from 'src/utils/date';`,
      filename: 'src/auth/login/Login.tsx',
      options: [defaultOptions],
    },

    // ✅ External package - always allowed
    {
      code: `import React from 'react';`,
      filename: 'src/platform/App.tsx',
      options: [defaultOptions],
    },

    // ✅ External scoped package - allowed
    {
      code: `import { motion } from 'framer-motion';`,
      filename: 'src/payments/animations/Fade.tsx',
      options: [defaultOptions],
    },

    // ✅ File not in any team - no restrictions
    {
      code: `import { anything } from 'src/platform/internal';`,
      filename: 'scripts/build.ts',
      options: [defaultOptions],
    },

    // ✅ Public package from another team
    {
      code: `import { useAuth } from '@company/auth-sdk';`,
      filename: 'src/platform/features/Settings.tsx',
      options: [defaultOptions],
    },

    // ✅ Shared team package
    {
      code: `import { debounce } from '@company/shared';`,
      filename: 'src/payments/hooks/useSearch.tsx',
      options: [defaultOptions],
    },
  ],

  invalid: [
    // ❌ Platform cannot import from auth (not in allowedDependencies)
    {
      code: `import { validateToken } from 'src/auth/utils/token';`,
      filename: 'src/platform/middleware/auth.ts',
      options: [defaultOptions],
      errors: [{ messageId: 'unauthorizedTeamImport' }],
    },

    // ❌ Auth cannot import from payments
    {
      code: `import { PaymentForm } from 'src/payments/components/PaymentForm';`,
      filename: 'src/auth/checkout/PremiumUpgrade.tsx',
      options: [defaultOptions],
      errors: [{ messageId: 'unauthorizedTeamImport' }],
    },

    // ❌ Platform cannot import from payments
    {
      code: `import { processPayment } from 'src/payments/services/payment';`,
      filename: 'src/platform/billing/Invoice.tsx',
      options: [defaultOptions],
      errors: [{ messageId: 'unauthorizedTeamImport' }],
    },

    // ❌ Auth cannot import platform (not in allowedDependencies)
    {
      code: `import { Analytics } from 'src/platform/analytics/tracker';`,
      filename: 'src/auth/tracking/events.ts',
      options: [defaultOptions],
      errors: [{ messageId: 'unauthorizedTeamImport' }],
    },

    // ❌ Shared cannot import from anyone
    {
      code: `import { UserService } from 'src/auth/services/user';`,
      filename: 'src/shared/helpers/auth.ts',
      options: [defaultOptions],
      errors: [{ messageId: 'unauthorizedTeamImport' }],
    },
  ],
});
