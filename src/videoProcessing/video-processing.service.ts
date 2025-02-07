import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class VideoProcessingService {
  private readonly outputFolder = 'uploads/videos';

  constructor() {
    if (!fs.existsSync(this.outputFolder)) {
      fs.mkdirSync(this.outputFolder, { recursive: true });
    }
  }

  /**
   * Convert video to multiple formats and resolutions for streaming
   */
  async processVideo(
    inputFile: string,
  ): Promise<{ mp4: string[]; webm: string[]; hls: string }> {
    const fileName = path.basename(inputFile, path.extname(inputFile));
    const resolutions = ['1920x1080', '1280x720', '854x480', '640x360'];
    const mp4Files: string[] = [];
    const webmFiles: string[] = [];

    for (const resolution of resolutions) {
      const mp4Output = path.join(
        this.outputFolder,
        `${fileName}_${resolution}.mp4`,
      );
      const webmOutput = path.join(
        this.outputFolder,
        `${fileName}_${resolution}.webm`,
      );

      await this.convertToFormat(inputFile, mp4Output, 'libx264', resolution);
      mp4Files.push(mp4Output);

      await this.convertToFormat(
        inputFile,
        webmOutput,
        'libvpx-vp9',
        resolution,
      );
      webmFiles.push(webmOutput);
    }

    const hlsFolder = await this.createHLS(inputFile);

    return { mp4: mp4Files, webm: webmFiles, hls: hlsFolder };
  }

  /**
   * Convert video to a specific format and resolution
   */
  private async convertToFormat(
    inputFile: string,
    outputFile: string,
    codec: string,
    resolution: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .output(outputFile)
        .videoCodec(codec)
        .size(resolution)
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

  /**
   * Create HLS (HTTP Live Streaming) Segments
   */
  private async createHLS(inputFile: string): Promise<string> {
    const fileName = path.basename(inputFile, path.extname(inputFile));
    const hlsFolder = path.join(this.outputFolder, `${fileName}_hls`);

    if (!fs.existsSync(hlsFolder)) {
      fs.mkdirSync(hlsFolder, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .output(`${hlsFolder}/index.m3u8`)
        .outputOptions(['-hls_time 10', '-hls_list_size 0', '-f hls'])
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
