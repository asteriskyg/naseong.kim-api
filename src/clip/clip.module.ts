import { Module } from '@nestjs/common';
import { ClipService } from './clip.service';
import { HttpModule } from '@nestjs/axios';
import { ClipController } from './clip.controller';
import { AuthModule } from 'src/auth/auth.module';
import { TokenModule } from 'src/token/token.module';
import { MongoModule } from 'src/mongo/mongo.module';

@Module({
  imports: [HttpModule, AuthModule, TokenModule, MongoModule],
  controllers: [ClipController],
  providers: [ClipService],
  exports: [ClipService],
})
export class ClipModule {}
