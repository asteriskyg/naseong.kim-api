import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const whitelist = JSON.parse(process.env.API_CORS_WHITELIST);

  app.enableCors({
    origin: function (origin, callback) {
      if (!origin || whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  });
  app.use(cookieParser());
  await app.listen(process.env.NODE_PORT);

  console.log();
  console.log('=============== [ naseong.kim ] ===============');
  console.log();
  console.log(`[ ENV      ]: ${process.env.NODE_ENV}`);
  console.log(`[ HOST URL ]: ${process.env.HOST_URL}`);
  console.log(`[ API URL  ]: ${process.env.API_URL}`);
  console.log(`[ CORS     ]: ${whitelist}`);
  console.log();
  console.log('================================================');
}

bootstrap();
