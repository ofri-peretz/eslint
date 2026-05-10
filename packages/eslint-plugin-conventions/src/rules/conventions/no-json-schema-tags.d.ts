/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * ESLint Rule: no-json-schema-tags
 * Detects JSON Schema keywords mistakenly used as JSDoc tags.
 *
 * Tags like @minimum, @maximum, @minLength, @maxLength are valid in
 * JSON Schema but have no meaning in JSDoc. When used in JSDoc, they
 * cause CI failures (e.g. DefinitelyTyped dtslint `check-tag-names`).
 *
 * Suggests moving constraint information into description text instead.
 *
 * @see https://json-schema.org/understanding-json-schema/reference
 * @see https://jsdoc.app/about-block-inline-tags
 */
import type { TSESLint } from '@interlace/eslint-devkit';
type MessageIds = 'jsonSchemaTag' | 'moveToDescription';
export interface Options {
    /** Additional custom tags to forbid. Default: [] */
    additionalForbiddenTags?: string[];
}
type RuleOptions = [Options?];
export declare const noJsonSchemaTags: TSESLint.RuleModule<MessageIds, RuleOptions, unknown, TSESLint.RuleListener> & {
    name: string;
};
export {};
