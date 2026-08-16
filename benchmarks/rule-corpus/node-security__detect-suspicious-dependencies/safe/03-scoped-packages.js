/**
 * SAFE - scoped specifiers. A scope is owned by whoever holds the npm org, so
 * `@nestjs/common` cannot be squatted the way a bare name can, and the sub-path
 * segments after the slash are file paths inside the package, not names.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Logger } from '@interlace/eslint-devkit';

export class AppModule {}

export const metadata = {
  imports: [TypeOrmModule.forRoot({ type: 'postgres' })],
  providers: [Logger],
  decorator: Module,
};
