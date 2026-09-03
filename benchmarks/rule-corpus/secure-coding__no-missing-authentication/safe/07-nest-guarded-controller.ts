/**
 * SAFE - The same admin surface as vulnerable/01, expressed as a NestJS
 * controller with a class-level guard. Authentication is declarative here, and
 * there is no express `app.get` call anywhere in the file.
 */
import { Controller, Get, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard)
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.findAll();
  }
}
