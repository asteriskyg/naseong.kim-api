import { Injectable } from '@nestjs/common';

@Injectable()
export class SocketService {
  async call() {
    return { hello: 'world' };
  }
}
