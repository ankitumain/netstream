import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VideoModule } from './video/video.module';
import { VideoProcessingController } from './videoProcessing/video-processing.controller';
import { VideoProcessingService } from './videoProcessing/video-processing.service';

@Module({
  imports: [VideoModule],
  controllers: [AppController, VideoProcessingController],
  providers: [AppService, VideoProcessingService],
})
export class AppModule {}
