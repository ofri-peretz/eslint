/**
 * NestJS Ecosystem Interface Compatibility Tests
 *
 * Verifies that NestJS packages export the decorators and interfaces our rules depend on.
 *
 * @sdk @nestjs/common, @nestjs/throttler, class-validator, class-transformer
 * @last-updated 2026-01-02
 */

import { describe, it, expect, beforeAll } from 'vitest';

let nestjsCommon: typeof import('@nestjs/common');
let classValidator: typeof import('class-validator');
let classTransformer: typeof import('class-transformer');

beforeAll(async () => {
  try {
    nestjsCommon = await import('@nestjs/common');
  } catch {
    console.warn('@nestjs/common not installed');
  }
  try {
    classValidator = await import('class-validator');
  } catch {
    console.warn('class-validator not installed');
  }
  try {
    classTransformer = await import('class-transformer');
  } catch {
    console.warn('class-transformer not installed');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// @NESTJS/COMMON DECORATORS
// Core decorators our rules check for
// ═══════════════════════════════════════════════════════════════════════════════

describe('@nestjs/common Interface Compatibility', () => {
  describe('Controller Decorators', () => {
    it('exports Controller decorator', () => {
      expect(nestjsCommon?.Controller).toBeDefined();
    });

    it('exports Get decorator', () => {
      expect(nestjsCommon?.Get).toBeDefined();
    });

    it('exports Post decorator', () => {
      expect(nestjsCommon?.Post).toBeDefined();
    });

    it('exports Put decorator', () => {
      expect(nestjsCommon?.Put).toBeDefined();
    });

    it('exports Delete decorator', () => {
      expect(nestjsCommon?.Delete).toBeDefined();
    });

    it('exports Patch decorator', () => {
      expect(nestjsCommon?.Patch).toBeDefined();
    });
  });

  describe('Security Decorators (Critical for Rules)', () => {
    it('exports UseGuards decorator', () => {
      // Rules check: require-guards
      expect(nestjsCommon?.UseGuards).toBeDefined();
    });

    it('exports UsePipes decorator', () => {
      // Rules check: require-validation-pipe
      expect(nestjsCommon?.UsePipes).toBeDefined();
    });

    it('exports UseInterceptors decorator', () => {
      expect(nestjsCommon?.UseInterceptors).toBeDefined();
    });

    it('exports SetMetadata decorator', () => {
      // Used for role-based access control
      expect(nestjsCommon?.SetMetadata).toBeDefined();
    });
  });

  describe('Pipes', () => {
    it('exports ValidationPipe', () => {
      // Rules check: require-validation-pipe
      expect(nestjsCommon?.ValidationPipe).toBeDefined();
    });

    it('exports ParseIntPipe', () => {
      expect(nestjsCommon?.ParseIntPipe).toBeDefined();
    });

    it('exports ParseUUIDPipe', () => {
      expect(nestjsCommon?.ParseUUIDPipe).toBeDefined();
    });
  });

  describe('Parameter Decorators', () => {
    it('exports Body decorator', () => {
      expect(nestjsCommon?.Body).toBeDefined();
    });

    it('exports Param decorator', () => {
      expect(nestjsCommon?.Param).toBeDefined();
    });

    it('exports Query decorator', () => {
      expect(nestjsCommon?.Query).toBeDefined();
    });

    it('exports Headers decorator', () => {
      expect(nestjsCommon?.Headers).toBeDefined();
    });
  });

  describe('Injectable Decorators', () => {
    it('exports Injectable decorator', () => {
      expect(nestjsCommon?.Injectable).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLASS-VALIDATOR
// Validation decorators our rules check for
// ═══════════════════════════════════════════════════════════════════════════════

describe('class-validator Interface Compatibility', () => {
  describe('Common Validators', () => {
    it('exports IsString decorator', () => {
      expect(classValidator?.IsString).toBeDefined();
    });

    it('exports IsNumber decorator', () => {
      expect(classValidator?.IsNumber).toBeDefined();
    });

    it('exports IsEmail decorator', () => {
      expect(classValidator?.IsEmail).toBeDefined();
    });

    it('exports IsNotEmpty decorator', () => {
      expect(classValidator?.IsNotEmpty).toBeDefined();
    });

    it('exports IsOptional decorator', () => {
      expect(classValidator?.IsOptional).toBeDefined();
    });

    it('exports ValidateNested decorator', () => {
      expect(classValidator?.ValidateNested).toBeDefined();
    });
  });

  describe('Security-Related Validators', () => {
    it('exports IsUUID decorator', () => {
      expect(classValidator?.IsUUID).toBeDefined();
    });

    it('exports Length decorator', () => {
      expect(classValidator?.Length).toBeDefined();
    });

    it('exports Matches decorator (regex validation)', () => {
      expect(classValidator?.Matches).toBeDefined();
    });
  });

  describe('Validation Function', () => {
    it('exports validate function', () => {
      expect(classValidator?.validate).toBeDefined();
      expect(typeof classValidator?.validate).toBe('function');
    });

    it('exports validateOrReject function', () => {
      expect(classValidator?.validateOrReject).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLASS-TRANSFORMER
// Transformation decorators our rules check for
// ═══════════════════════════════════════════════════════════════════════════════

describe('class-transformer Interface Compatibility', () => {
  describe('Core Decorators', () => {
    it('exports Exclude decorator', () => {
      // Rules check: require-exclude-decorator (for sensitive fields)
      expect(classTransformer?.Exclude).toBeDefined();
    });

    it('exports Expose decorator', () => {
      expect(classTransformer?.Expose).toBeDefined();
    });

    it('exports Transform decorator', () => {
      expect(classTransformer?.Transform).toBeDefined();
    });

    it('exports Type decorator', () => {
      expect(classTransformer?.Type).toBeDefined();
    });
  });

  describe('Transformation Functions', () => {
    it('exports plainToInstance function', () => {
      expect(classTransformer?.plainToInstance).toBeDefined();
      expect(typeof classTransformer?.plainToInstance).toBe('function');
    });

    it('exports instanceToPlain function', () => {
      expect(classTransformer?.instanceToPlain).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PACKAGE METADATA
// ═══════════════════════════════════════════════════════════════════════════════

describe('Package Metadata', () => {
  it('@nestjs/common has discoverable version', async () => {
    try {
      const pkgPath = require.resolve('@nestjs/common/package.json');
      const pkg = await import(pkgPath, { with: { type: 'json' } }).then(m => m.default);
      expect(pkg.version).toBeDefined();
      console.log(`📦 @nestjs/common version: ${pkg.version}`);
    } catch {
      console.log('📦 @nestjs/common not installed');
    }
  });

  it('class-validator has discoverable version', async () => {
    try {
      const pkgPath = require.resolve('class-validator/package.json');
      const pkg = await import(pkgPath, { with: { type: 'json' } }).then(m => m.default);
      expect(pkg.version).toBeDefined();
      console.log(`📦 class-validator version: ${pkg.version}`);
    } catch {
      console.log('📦 class-validator not installed');
    }
  });

  it('class-transformer has discoverable version', async () => {
    try {
      const pkgPath = require.resolve('class-transformer/package.json');
      const pkg = await import(pkgPath, { with: { type: 'json' } }).then(m => m.default);
      expect(pkg.version).toBeDefined();
      console.log(`📦 class-transformer version: ${pkg.version}`);
    } catch {
      console.log('📦 class-transformer not installed');
    }
  });
});
