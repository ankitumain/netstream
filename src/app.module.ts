import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VideoModule } from './video/video.module';
import { VideoController } from './videoProcessor/video-processor.controller';
import { VideoProcessingService } from './videoProcessor/video-processor.service';

@Module({
  imports: [VideoModule],
  controllers: [AppController, VideoController],
  providers: [AppService, VideoProcessingService],
})
export class AppModule {}
