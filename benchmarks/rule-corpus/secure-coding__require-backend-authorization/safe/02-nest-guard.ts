/**
 * SAFE - A NestJS authorisation guard. Guards run inside the HTTP server
 * process; this file cannot be reached by a browser. It is the canonical
 * server-side enforcement point in the framework.
 */
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (request.user.role !== 'admin') {
      return false;
    }

    return true;
  }
}
