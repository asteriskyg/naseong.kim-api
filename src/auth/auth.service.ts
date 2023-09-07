import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TokenService } from 'src/token/token.service';
import { MongoService } from 'src/mongo/mongo.service';
import { User } from 'src/schemas/user.schema';

interface TwitchToken {
  access_token: string;
  refresh_token: string;
}

interface TwitchUserData {
  id: string;
  display_name: string;
  email: string;
  profile_image_url: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly httpService: HttpService,
    private readonly tokenService: TokenService,
    private readonly mongoService: MongoService,
  ) {}

  /**
   * 트위치에서 받은 코드를 이용해 로그인합니다.
   * @param code
   * @returns JWT 토큰 (access_token, refresh_token)
   */
  async login(code: string) {
    try {
      const getTwitchToken = await firstValueFrom(
        this.httpService.post('https://id.twitch.tv/oauth2/token', {
          client_id: process.env.TWITCH_CLIENT_ID,
          client_secret: process.env.TWITCH_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: `${process.env.API_URL}/auth/login`,
        }),
      );
      const twitchToken = getTwitchToken.data as TwitchToken;

      const getTwitchUserData = await firstValueFrom(
        this.httpService.get('https://api.twitch.tv/helix/users', {
          headers: {
            authorization: `Bearer ${twitchToken.access_token}`,
            'client-id': process.env.TWITCH_CLIENT_ID,
            'Accept-Encoding': 'gzip,deflate,compress',
          },
        }),
      );
      const twitchUserData = getTwitchUserData.data.data[0] as TwitchUserData;

      let follow = undefined;
      try {
        const getFollowData = await firstValueFrom(
          this.httpService.get(
            `https://api.twitch.tv/helix/users/follows?to_id=103991968&from_id=${twitchUserData.id}`,
            {
              headers: {
                Authorization: `Bearer ${twitchToken.access_token}`,
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Accept-Encoding': 'gzip,deflate,compress',
              },
            },
          ),
        );
        follow = getFollowData.data;
      } catch (e) {
        if (e.response.status === 404) {
          follow = undefined;
        }
      }

      let subscription = undefined;
      try {
        const getSubscriptionData = await firstValueFrom(
          this.httpService.get(
            `https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=103991968&user_id=${twitchUserData.id}`,
            {
              headers: {
                Authorization: `Bearer ${twitchToken.access_token}`,
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Accept-Encoding': 'gzip,deflate,compress',
              },
            },
          ),
        );
        subscription = getSubscriptionData.data;
      } catch (e) {
        if (e.response.status === 404) {
          subscription = undefined;
        }
      }

      const localToken = await this.tokenService.generateNewAuthority(
        Number(twitchUserData.id),
      );

      const user = await this.mongoService.getUserDetail(
        Number(twitchUserData.id),
        true,
      );

      if (user) {
        const refreshTokenArray = user.serviceRefreshToken;
        refreshTokenArray.push(localToken.refreshToken);

        await this.mongoService.updateUserDetail(Number(twitchUserData.id), {
          twitchUserId: Number(twitchUserData.id),
          displayName: twitchUserData.display_name,
          email: twitchUserData.email,
          profileImageUrl: twitchUserData.profile_image_url,
          twitchAccessToken: twitchToken.access_token,
          twitchRefreshToken: twitchToken.refresh_token,
          serviceRefreshToken: refreshTokenArray,
          follow: (follow?.data[0]?.followed_at as Date) || user.follow,
          subscription:
            (subscription?.data[0]?.tier as number) || user.subscription,
          registeredAt: user.registeredAt,
          profileBackgroundUrl: user.profileBackgroundUrl,
          userType: user.userType,
        });
      } else {
        let userType: string;
        twitchUserData.id === '103991968'
          ? (userType = 'streamer')
          : twitchUserData.id === '145827603'
          ? (userType = 'editor')
          : twitchUserData.id === '430356246'
          ? (userType = 'developer')
          : (userType = 'viewer');

        await this.mongoService.createUser({
          twitchUserId: Number(twitchUserData.id),
          displayName: twitchUserData.display_name,
          registeredAt: new Date(),
          email: twitchUserData.email,
          profileImageUrl: twitchUserData.profile_image_url,
          twitchAccessToken: twitchToken.access_token,
          twitchRefreshToken: twitchToken.refresh_token,
          serviceRefreshToken: [localToken.refreshToken],
          follow: (follow?.data[0]?.followed_at as Date) || undefined,
          subscription: (subscription?.data[0]?.tier as number) || undefined,
          userType: userType,
          profileBackgroundUrl: '',
        });
      }

      return {
        status: 200,
        Authorization: localToken.accessToken,
        Refresh: localToken.refreshToken,
      };
    } catch (e) {
      console.log(e);
      return { status: 500 };
    }
  }

  /**
   * 유저를 로그아웃 처리합니다.
   * @param Refresh
   * @returns
   */
  async logout(Refresh: string) {
    const jwt = await this.tokenService.decodeJWT(Refresh);
    return await this.mongoService.logoutUser(Refresh, jwt.aud);
  }

  /**
   * Refresh 쿠키를 이용하여 새로운 토큰을 발급합니다.
   * @param Refresh
   * @returns 새로운 토큰 (access_token, refresh_token)
   */
  async refresh(Refresh: string) {
    const jwt = await this.tokenService.decodeJWT(Refresh);
    if (!jwt.scope) return { status: 401, error: 'token scope missmatch' };

    const user = await this.mongoService.getUserDetail(jwt.aud, true);
    const token = await this.tokenService.generateNewAuthority(
      user.twitchUserId,
    );

    const newArray = user.serviceRefreshToken;
    newArray.push(token.refreshToken);

    await this.mongoService.updateUserDetail(user.twitchUserId, {
      twitchUserId: user.twitchUserId,
      displayName: user.displayName,
      registeredAt: user.registeredAt,
      email: user.email,
      profileImageUrl: user.profileImageUrl,
      twitchAccessToken: user.twitchAccessToken,
      twitchRefreshToken: user.twitchRefreshToken,
      serviceRefreshToken: newArray,
      profileBackgroundUrl: user.profileBackgroundUrl,
      follow: user.follow,
      subscription: user.subscription,
      userType: user.userType,
    });

    return {
      status: 200,
      Authorization: token.accessToken,
      Refresh: token.refreshToken,
    };
  }

  /**
   * 트위치 액세스 토큰을 갱신합니다.
   * @param user
   * @returns 실패시에만 에러 반환
   */
  async refreshTwitchToken(user: User) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://id.twitch.tv/oauth2/token',
          {
            client_id: process.env.TWITCH_CLIENT_ID,
            client_secret: process.env.TWITCH_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: user.twitchRefreshToken,
          },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept-Encoding': 'gzip,deflate,compress',
            },
          },
        ),
      );

      const token = response.data as TwitchToken;
      return await this.mongoService.updateUserDetail(user.twitchUserId, {
        twitchAccessToken: token.access_token,
        twitchRefreshToken: token.refresh_token,
        twitchUserId: user.twitchUserId,
        displayName: user.displayName,
        registeredAt: user.registeredAt,
        email: user.email,
        profileImageUrl: user.profileImageUrl,
        serviceRefreshToken: user.serviceRefreshToken,
        profileBackgroundUrl: user.profileBackgroundUrl,
        follow: user.follow,
        subscription: user.subscription,
        userType: user.userType,
      });
    } catch (e) {
      throw new Error();
    }
  }

  /**
   * 트위치 앱 엑세스 토큰을 발급합니다.
   * @returns 트위치 앱 액세스 토큰
   */
  async getTwitchAccessToken() {
    const response = await firstValueFrom(
      this.httpService.post(
        `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
      ),
    );

    if (response.status !== 200) return undefined;
    return response.data;
  }
}
