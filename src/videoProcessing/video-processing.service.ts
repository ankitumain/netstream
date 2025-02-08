import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { VideoGateway } from './video.gateway';

@Injectable()
export class VideoProcessingService {
  private readonly outputFolder = 'uploads/videos';

  constructor(private readonly videoGateway: VideoGateway) {
    if (!fs.existsSync(this.outputFolder)) {
      fs.mkdirSync(this.outputFolder, { recursive: true });
    }
  }

  async processVideo(inputFile: string, clientId: string): Promise<any> {
    const fileName = path.basename(inputFile, path.extname(inputFile));
    const resolutions = ['1920x1080', '1280x720', '854x480', '640x360'];
    const mp4Files: string[] = [];
    const webmFiles: string[] = [];

    const totalFiles = resolutions.length * 2 + 1; // MP4 + WEBM + HLS
    let completedFiles = 0;

    for (const resolution of resolutions) {
      const mp4Output = path.join(
        this.outputFolder,
        `${fileName}_${resolution}.mp4`,
      );
      const webmOutput = path.join(
        this.outputFolder,
        `${fileName}_${resolution}.webm`,
      );

      await this.convertToFormat(
        inputFile,
        mp4Output,
        'libx264',
        resolution,
        clientId,
      );
      mp4Files.push(mp4Output);
      completedFiles++;
      this.videoGateway.sendProgress(clientId, {
        type: 'progress',
        completedFiles,
        totalFiles,
      });

      const sourceWebM = webmFiles.length > 0 ? webmFiles[0] : inputFile;
      await this.convertToFormat(
        sourceWebM,
        webmOutput,
        'libvpx-vp9',
        resolution,
        clientId,
      );
      webmFiles.push(webmOutput);
      completedFiles++;
      this.videoGateway.sendProgress(clientId, {
        type: 'progress',
        completedFiles,
        totalFiles,
      });
    }

    const hlsFolder = await this.createHLS(inputFile, clientId);
    completedFiles++;
    this.videoGateway.sendProgress(clientId, {
      type: 'progress',
      completedFiles,
      totalFiles,
    });

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
    const fileName = path.basename(inputFile, path.extname(inputFile));
    const hlsFolder = path.join(this.outputFolder, `${fileName}_hls`);

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

  /**
   * Extract a thumbnail from the video
   */
  async extractThumbnail(inputFile: string): Promise<string> {
    const fileName = path.basename(inputFile, path.extname(inputFile));
    const thumbnailFile = path.join(
      this.outputFolder,
      `${fileName}_thumbnail.jpg`,
    );

    return new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .screenshots({
          timestamps: ['10%'],
          filename: `${fileName}_thumbnail.jpg`,
          folder: this.outputFolder,
          size: '320x240',
        })
        .on('end', () => {
          console.log(`✅ Thumbnail extracted: ${thumbnailFile}`);
          resolve(thumbnailFile);
        })
        .on('error', (err) => {
          console.error(`❌ Error extracting thumbnail: ${err.message}`);
          reject(
            new InternalServerErrorException('Thumbnail extraction failed'),
          );
        });
    });
  }
}
