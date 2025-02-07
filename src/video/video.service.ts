import { Injectable } from '@nestjs/common';

@Injectable()
export class VideoService {
  async handleVideoUpload(file: Express.Multer.File) {
    // Log file details
    console.log('File received:', file);

    // Here you can add logic to save the file to a database or cloud storage
    // For example, you could use AWS S3, Google Cloud Storage, etc.

    return {
      message: 'Video uploaded successfully!',
      fileName: file.originalname,
    };
  }
}
