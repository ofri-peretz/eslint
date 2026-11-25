import { exec } from 'node:child_process';
import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';

class TransferDto {
  to!: string;
  amount!: number;
}

// PLANT nestjs: an admin controller with no @UseGuards (not flagged; see plants.json).
@Controller('admin')
export class AccountsController {
  // PLANT nestjs: a DTO body with no ValidationPipe.
  @Post('transfer')
  transfer(@Body() dto: TransferDto) {
    return { ok: true, to: dto.to };
  }

  @Delete('users/:id')
  remove() {
    return { removed: true };
  }

  @Get('ping')
  ping(@Query('host') host: string) {
    // PLANT node: command built from a request value.
    exec('ping -c 1 ' + host);
    return 'sent';
  }
}
