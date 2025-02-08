/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoProcessingService } from './video-processing.service';
import { diskStorage } from 'multer';
import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();
const bucketName = 'video-bucket';

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
  async uploadVideo(@UploadedFile() file: Express.Multer.File, @Req() req) {
    if (!file) return { message: 'No file received!' };

    const fileName = `${Date.now()}-${file.originalname}`;
    const uploadParams = {
      Bucket: bucketName,
      Key: `uploads/${fileName}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const s3Response = await s3.upload(uploadParams).promise();
    console.log(`✅ Uploaded file: ${s3Response.Location}`);

    return { message: 'File uploaded to S3', fileUrl: s3Response.Location };
  }
}
