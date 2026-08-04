/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

export type NoUnsafeQueryOptions = [];

export type NoUnscopedMutationOptions = [];

export interface AllDrizzleRulesOptions {
  'drizzle-security/no-unsafe-query': NoUnsafeQueryOptions;
  'drizzle-security/no-unscoped-mutation': NoUnscopedMutationOptions;
}
