import {
  Controller,
  Post,
  Get,
  UploadedFile,
  Param,
  UseInterceptors,
  Res,
  Req,
  Delete,
} from '@nestjs/common';
import { Request } from 'express';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from './video.service';
import * as fs from 'fs';

@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    return this.videoService.uploadFileToS3(file);
  }

  @Delete('delete/:fileName')
  async deleteVideo(@Param('fileName') fileName: string) {
    return this.videoService.handleDeleteVideo(fileName);
  }

  @Get('download/:fileName')
  async downloadVideo(
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    return this.videoService.handleVideoDownload(fileName, res);
  }

  @Get('hls/:foldername/:filename')
  streamHlsVideo(
    @Param('foldername') foldername: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = this.videoService.getHlsFilePath(foldername, filename);

    if (fs.existsSync(filePath)) {
      const fileExtension = filename.split('.').pop();
      let contentType = 'application/octet-stream';

      if (fileExtension === 'm3u8') {
        contentType = 'application/vnd.apple.mpegurl';
      } else if (fileExtension === 'ts') {
        contentType = 'video/MP2T';
      }

      console.log(`Serving file with content type: ${contentType}`);
      res.setHeader('Content-Type', contentType);
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error(`Error sending file: ${err}`);
          if (!res.headersSent) {
            res.status(500).send('Internal Server Error');
          }
        }
      });
    } else {
      console.error('File not found');
      if (!res.headersSent) {
        res.status(404).send('File not found');
      }
    }
  }

  @Get('stream/:fileName')
  streamVideo(
    @Param('fileName') fileName: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.videoService.streamVideo(fileName, req, res);
  }
}
