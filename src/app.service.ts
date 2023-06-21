import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth/auth.service';
import { MongoService } from './mongo/mongo.service';

@Injectable()
export class AppService {
  constructor(
    private readonly httpService: HttpService,
    private readonly authService: AuthService,
    private readonly mongoService: MongoService,
  ) {}

  /**
   * 방송 상태를 조회합니다.
   */
  async stream(): Promise<{ status: 'online' | 'offline' | 'unknown' }> {
    const user = await this.mongoService.getUserDetail(
      Number(process.env.TWITCH_DEVELOPER_ID),
      true,
    );
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `https://api.twitch.tv/helix/streams?user_id=${process.env.TWITCH_BROADCASTER_ID}`,
          {
            headers: {
              Authorization: `Bearer ${user.twitchAccessToken}`,
              'Client-ID': process.env.TWITCH_CLIENT_ID,
              'Accept-Encoding': 'gzip,deflate,compress',
            },
          },
        ),
      );

      const stream = response.data;
      if (!stream.data[0]) return { status: 'offline' };
      stream.data[0].status = 'online';
      return stream.data[0];
    } catch (e) {
      const error = e.response.data;
      if (error.status !== 401) return { status: 'unknown' };
    }

    try {
      await this.authService.refreshTwitchToken(user);
      return await this.stream();
    } catch (e) {
      return { status: 'unknown' };
    }
  }
}
