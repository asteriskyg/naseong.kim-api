import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './auth.controller';
import { TokenModule } from 'src/token/token.module';
import { MongoModule } from 'src/mongo/mongo.module';

@Module({
  imports: [HttpModule, TokenModule, MongoModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
