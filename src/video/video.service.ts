import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';
import { existsSync, createReadStream } from 'fs';
import { Request, Response } from 'express';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class VideoService {
  private readonly logger: Logger = new Logger(VideoService.name);

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

  handleDeleteVideo(fileName: string) {
    //logic to delete video

    return {
      message: `Video ${fileName} deleted successfully!`,
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
  streamVideo(fileName: string, req: Request, res: Response) {
    const videoPath = join(__dirname, '..', '..', 'uploads', fileName);
    if (!fs.existsSync(videoPath)) {
      throw new HttpException('Video not found', HttpStatus.NOT_FOUND);
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res
          .status(416)
          .send(
            'Requested range not satisfiable\n' + start + ' >= ' + fileSize,
          );
        return;
      }

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': 'video/mp4',
      });

      const stream = fs.createReadStream(videoPath, { start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });
      fs.createReadStream(videoPath).pipe(res);
    }
  }
}
