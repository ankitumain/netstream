import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoProcessingService } from './video-processing.service';
import { diskStorage } from 'multer';

@Controller('video')
export class VideoProcessingController {
  constructor(
    private readonly videoProcessingService: VideoProcessingService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/temp',
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}-${file.originalname}`;
          cb(null, uniqueName);
        },
      }),
    }),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      console.error('❌ No file received!');
      return { message: 'No file received!' };
    }

    console.log(`✅ Uploaded file: ${file.path}`);

    const processedFiles = await this.videoProcessingService.processVideo(
      file.path,
    );
    const thumbnail = await this.videoProcessingService.extractThumbnail(
      file.path,
    );

    return {
      message: 'Video uploaded & processed!',
      processedFiles,
      thumbnail,
    };
  }
}
