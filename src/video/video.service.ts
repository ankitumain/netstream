import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { existsSync, createReadStream } from 'fs';
import { Response } from 'express';
import { NotFoundException } from '@nestjs/common';

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
  async handleVideoDownload(fileName: string, res: Response) {
    const filePath = join(__dirname, '..', '..', 'uploads', fileName);

    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    const fileStream = createReadStream(filePath);
    res.set({
      'Content-Type': 'video/mp4', // Adjust the content type based on your file type
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    fileStream.pipe(res);

    return {
      message: 'Video downloaded successfully!',
      fileName,
    };
  }
}
