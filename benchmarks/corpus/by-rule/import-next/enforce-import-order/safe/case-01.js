// import-next/enforce-import-order — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by import-next/enforce-import-order
/* eslint import-next/enforce-import-order: ["error", {"groups":["builtin","external","internal","parent","sibling"],"newlinesBetween":"never"}] */
import fs from 'fs';
import React from 'react';
import { Button } from '@/components';
import { utils } from '../utils';
import { helper } from './helper';
