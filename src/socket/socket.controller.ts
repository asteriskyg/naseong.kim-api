import { Controller, Get } from '@nestjs/common';
import { SocketService } from './socket.service';

@Controller('api/continue')
export class SocketController {
  constructor(private readonly socketService: SocketService) {}

  @Get('call')
  async sign() {
    return await this.socketService.call();
  }
}
