/** Fixtures for the type-aware half of no-missing-validation-pipe. */
import { IsString } from 'class-validator';
import { ApiProperty } from './fake-swagger';

/** Declares a real class-validator rule. */
export class ValidatedDto {
  @IsString()
  name!: string;
}

/** Declares nothing — a ValidationPipe has nothing to enforce here. */
export class BareDto {
  name!: string;
}

/** Documented but not validated: @ApiProperty describes, it does not enforce. */
export class DocumentedOnlyDto {
  @ApiProperty()
  name!: string;
}

/** Extends a base class, which may carry the rules this does not. */
export class DerivedDto extends ValidatedDto {
  extra!: string;
}

/** Not a class at all — no runtime shape for a pipe to enforce. */
export interface PlainShape {
  name: string;
}

/** A bare decorator reference rather than a call. */
export class BareDecoratorDto {
  @bareRule
  name!: string;
}

/** Stands in for a decorator used without parentheses. */
export function bareRule(_target: object, _key: string): void {}

/**
 * Carries a member that cannot hold a decorator at all — an index signature.
 * Exercises the branch where `canHaveDecorators` is false.
 */
export class IndexSignatureDto {
  [key: string]: unknown;
}

/** A type alias, which resolves through `aliasSymbol` rather than a class. */
export type AliasedShape = { name: string };

/** A union of two DTOs: no single class to resolve, so the rule abstains. */
export type EitherDto = ValidatedDto | BareDto;
