import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('stream')
  async stream() {
    return await this.appService.stream();
  }

  @Get('streamV2')
  async streamV2() {
    return await this.appService.streamV2();
  }
}
