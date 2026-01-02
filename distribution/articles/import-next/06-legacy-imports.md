---
title: 'Legacy Import Warnings: Helping Teams Migrate Gradually'
published: false
description: 'Mark deprecated modules and let ESLint warn developers. Perfect for gradual monorepo migrations.'
tags: eslint, monorepo, migration, typescript
cover_image:
series: Monorepo Governance
---

> "Don't import from @company/legacy-utils. Use @company/utils instead."

How do you enforce this without breaking everyone?

## The Problem

Hard deprecation breaks everyone:

```javascript
// If we just delete the old package:
import { helper } from '@company/legacy-utils';
// 💥 Module not found! 500 files break!
```

## The Solution: Soft Deprecation

```javascript
// eslint.config.js
import importNext from 'eslint-plugin-import-next';

export default [
  {
    rules: {
      'import-next/no-legacy-imports': [
        'warn',
        {
          deprecated: {
            '@company/legacy-utils': {
              replacement: '@company/utils',
              deadline: '2025-03-01',
              message: 'Legacy utils will be removed in Q2 2025',
            },
            '@company/old-ui': {
              replacement: '@company/design-system',
              deadline: '2025-06-01',
            },
          },
        },
      ],
    },
  },
];
```

### Result

```bash
src/feature.ts
  5:1  warn  ⚠️ Legacy import: '@company/legacy-utils' is deprecated
             Replacement: @company/utils
             Deadline: 2025-03-01
             Message: Legacy utils will be removed in Q2 2025
```

## Escalation Schedule

```javascript
// Start with warnings
'import-next/no-legacy-imports': 'warn',

// After deadline passes
'import-next/no-legacy-imports': 'error',

// Or time-based config
const pastDeadline = new Date() > new Date('2025-03-01');
'import-next/no-legacy-imports': pastDeadline ? 'error' : 'warn',
```

## Migration Tracking

```bash
# Count remaining legacy imports
npx eslint . 2>&1 | grep "Legacy import" | wc -l

# Week 1: 847
# Week 2: 623
# Week 3: 412
# Week 4: 0 ✅
```

## ESLint Rule

```javascript
import importNext from 'eslint-plugin-import-next';

export default [
  {
    rules: {
      'import-next/no-legacy-imports': [
        'warn',
        {
          deprecated: {
            // Module → replacement mapping
          },
        },
      ],
    },
  },
];
```

## Quick Install


---

📦 [npm: eslint-plugin-import-next](https://www.npmjs.com/package/eslint-plugin-import-next)

---

🚀 **Got legacy code to migrate?**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
