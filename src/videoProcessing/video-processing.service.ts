import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import * as AWS from 'aws-sdk';
import { VideoGateway } from './video.gateway';

const s3 = new AWS.S3();
const bucketName = process.env.S3_BUCKET || 'video-bucket';

@Injectable()
export class VideoProcessingService {
  private readonly tempFolder = '/tmp'; // Railway compatible

  constructor(private readonly videoGateway: VideoGateway) {}

  async processVideo(s3Key: string, clientId: string): Promise<any> {
    const fileName = path.basename(s3Key);
    const tempFilePath = path.join(this.tempFolder, fileName);

    // Download file from S3
    await this.downloadFromS3(s3Key, tempFilePath);

    const resolutions = ['1920x1080', '1280x720', '854x480', '640x360'];
    const mp4Files: string[] = [];
    const webmFiles: string[] = [];
    const totalFiles = resolutions.length * 2 + 1; // MP4 + WEBM + HLS
    let completedFiles = 0;

    for (const resolution of resolutions) {
      const mp4Output = path.join(
        this.tempFolder,
        `${fileName}_${resolution}.mp4`,
      );
      const webmOutput = path.join(
        this.tempFolder,
        `${fileName}_${resolution}.webm`,
      );

      await this.convertToFormat(
        tempFilePath,
        mp4Output,
        'libx264',
        resolution,
        clientId,
      );
      mp4Files.push(
        await this.uploadToS3(
          mp4Output,
          `processed/${fileName}_${resolution}.mp4`,
        ),
      );
      completedFiles++;
      this.videoGateway.sendProgress(clientId, {
        type: 'progress',
        completedFiles,
        totalFiles,
      });

      await this.convertToFormat(
        tempFilePath,
        webmOutput,
        'libvpx-vp9',
        resolution,
        clientId,
      );
      webmFiles.push(
        await this.uploadToS3(
          webmOutput,
          `processed/${fileName}_${resolution}.webm`,
        ),
      );
      completedFiles++;
      this.videoGateway.sendProgress(clientId, {
        type: 'progress',
        completedFiles,
        totalFiles,
      });
    }

    const hlsFolder = await this.createHLS(tempFilePath, clientId);
    completedFiles++;
    this.videoGateway.sendProgress(clientId, {
      type: 'progress',
      completedFiles,
      totalFiles,
    });

    // Cleanup temp file
    fs.unlinkSync(tempFilePath);

    return { mp4: mp4Files, webm: webmFiles, hls: hlsFolder };
  }

  private async convertToFormat(
    inputFile: string,
    outputFile: string,
    codec: string,
    resolution: string,
    clientId: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .output(outputFile)
        .videoCodec(codec)
        .size(resolution)
        .on('progress', (progressInfo) => {
          this.videoGateway.sendProgress(clientId, {
            type: 'file-progress',
            resolution,
            format: codec === 'libx264' ? 'MP4' : 'WEBM',
            progress: Math.round(progressInfo.percent || 0),
          });
        })
        .on('end', () => {
          console.log(
            `✅ Converted to ${codec} - ${resolution}: ${outputFile}`,
          );
          resolve(outputFile);
        })
        .on('error', (err) => {
          console.error(`❌ Error converting to ${codec}: ${err.message}`);
          reject(new InternalServerErrorException('Video conversion failed'));
        })
        .run();
    });
  }

  private async createHLS(
    inputFile: string,
    clientId: string,
  ): Promise<string> {
    const hlsFolder = path.join(this.tempFolder, 'hls');

    if (!fs.existsSync(hlsFolder)) {
      fs.mkdirSync(hlsFolder, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .output(`${hlsFolder}/index.m3u8`)
        .outputOptions(['-hls_time 10', '-hls_list_size 0', '-f hls'])
        .on('progress', (progressInfo) => {
          this.videoGateway.sendProgress(clientId, {
            type: 'file-progress',
            resolution: 'HLS',
            format: 'HLS',
            progress: Math.round(progressInfo.percent || 0),
          });
        })
        .on('end', () => {
          console.log(`✅ HLS stream created: ${hlsFolder}/index.m3u8`);
          resolve(hlsFolder);
        })
        .on('error', (err) => {
          console.error(`❌ Error creating HLS stream: ${err.message}`);
          reject(new InternalServerErrorException('HLS conversion failed'));
        })
        .run();
    });
  }

  private async downloadFromS3(
    s3Key: string,
    outputFile: string,
  ): Promise<void> {
    const params = { Bucket: bucketName, Key: s3Key };
    const s3Object = await s3.getObject(params).promise();
    fs.writeFileSync(outputFile, s3Object.Body as Buffer);
    console.log(`✅ File downloaded from S3: ${s3Key}`);
  }

  private async uploadToS3(filePath: string, s3Key: string): Promise<string> {
    const fileBuffer = fs.readFileSync(filePath);
    const uploadParams = {
      Bucket: bucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: 'video/mp4',
    };
    const s3Response = await s3.upload(uploadParams).promise();
    console.log(`✅ File uploaded to S3: ${s3Response.Location}`);
    return s3Response.Location;
  }
}
