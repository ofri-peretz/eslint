// A multer upload route with no limits.fileSize: multer has no default for it,
// so the route stores however many bytes the client sends.
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
export class AvatarController {
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: { size: number }) {
    return file.size;
  }
}
