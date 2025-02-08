import {
  Controller,
  Post,
  Get,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { VideoProcessingService } from './video-processing.service';

@Controller('video')
export class VideoProcessingController {
  constructor(
    private readonly videoProcessingService: VideoProcessingService,
  ) {}

  @Post('process')
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
  async processVideo(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    try {
      const hlsFolder = await this.videoProcessingService.createHlsStream(
        file.path,
      );
      res.status(200).json({ message: 'HLS streams created', path: hlsFolder });
    } catch (error: unknown) {
      res.status(500).json({ message: (error as { message: string }).message });
    }
  }

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

  // ✅ New API endpoint to list available HLS videos
  @Get('list')
  async listVideos(@Res() res: Response) {
    try {
      const videoDir =
        '/Users/danial.rahimzadeh/repo/hackathon/netstream/uploads/videos';

      // Read all folders ending in "_hls"
      const videoFolders = fs
        .readdirSync(videoDir)
        .filter((folder) => folder.endsWith('_hls'));

      // Get only those with a valid "master.m3u8"
      const videos = videoFolders
        .map((folder) => {
          const masterFilePath = path.join(videoDir, folder, 'master.m3u8');
          if (fs.existsSync(masterFilePath)) {
            return {
              name: folder,
              path: `http://localhost:3000/videos/hls/${folder}/master.m3u8`, // Adjust based on serving
            };
          }
          return null;
        })
        .filter(Boolean);

      res.status(200).json(videos);
    } catch (error) {
      console.error('Error listing videos:', error);
      res.status(500).json({ message: 'Failed to fetch videos' });
    }
  }
}
