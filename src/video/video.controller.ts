import {
  Controller,
  Post,
  Get,
  UploadedFile,
  Param,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from './multer-config';
import { VideoService } from './video.service';

@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    return this.videoService.handleVideoUpload(file);
  }

  @Get('download/:fileName')
  async downloadVideo(
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    return this.videoService.handleVideoDownload(fileName, res);
  }
}
