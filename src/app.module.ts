import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VideoModule } from './video/video.module';
import { VideoController } from './videoProcessing/video.controller';
import { VideoProcessingService } from './videoProcessing/video-processing.service';

@Module({
  imports: [VideoModule],
  controllers: [AppController, VideoController],
  providers: [AppService, VideoProcessingService],
})
export class AppModule {}
