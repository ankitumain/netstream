import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';
import { existsSync, createReadStream } from 'fs';
import { Request, Response } from 'express';
import { NotFoundException } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VideoService {
  private s3: AWS.S3;

  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
  }

  async uploadFileToS3(file: Express.Multer.File): Promise<any> {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('S3 bucket name is not defined in environment variables');
    }

    const fileKey = `${uuidv4()}-${file.originalname}`;

    const params = {
      Bucket: bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      const data = await this.s3.upload(params).promise();
      return {
        message: 'File uploaded successfully',
        url: data.Location,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Error uploading file');
    }
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
