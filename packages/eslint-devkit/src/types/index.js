"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// Type utilities for ESLint rules
tslib_1.__exportStar(require("./type-utils"), exports);
// Module augmentation — adds meta.docs.cwe + cvss to RuleMetaDataDocs.
// Side-effect-only import; activates the declaration project-wide so
// every plugin's rule meta gains the Interlace fields.
require("./meta-augmentation");
