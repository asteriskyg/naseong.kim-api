import { Module } from '@nestjs/common';
import { SocketService } from './socket.service';
import { SocketController } from './socket.controller';

@Module({
  imports: [],
  controllers: [SocketController],
  providers: [SocketService],
  exports: [SocketService],
})
export class SocketModule {}
