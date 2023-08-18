import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TokenModule } from './token/token.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ClipModule } from './clip/clip.module';
import { ContentModule } from './content/content.module';
import { MongoModule } from './mongo/mongo.module';
import { SocketModule } from './socket/socket.module';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forRoot(process.env.DATABASE_URL),
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}`,
      isGlobal: true,
    }),
    TokenModule,
    AuthModule,
    UserModule,
    SocketModule,
    ClipModule,
    ContentModule,
    MongoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
