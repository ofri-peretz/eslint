/** Stands in for @nestjs/swagger: documents a property, enforces nothing. */
export function ApiProperty(): PropertyDecorator {
  return () => {};
}
