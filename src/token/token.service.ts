import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface localToken {
  aud: number;
  iat: number;
  exp: number;
  scope: string | undefined;
}

@Injectable()
export class TokenService {
  constructor(private jwtService: JwtService) {}

  /**
   * JWT 토큰을 디코딩합니다.
   * @param token JWT 토큰
   */
  async decodeJWT(token: string): Promise<localToken> {
    return this.jwtService.decode(token) as localToken;
  }

  /**
   * 트위치 유저 ID를 이용해 액세스 토큰을 생성합니다.
   * @param twitchUserId
   * @returns JWT 액세스 토큰 (30분)
   */
  async generateAccessToken(twitchUserId: number): Promise<string> {
    const payload = { aud: twitchUserId };
    return this.jwtService.sign(payload, { expiresIn: '30m' });
  }

  /**
   * 트위치 유저 ID를 이용해 리프레시 토큰을 생성합니다.
   * @param twitchUserId
   * @returns JWT 리프레시 토큰 (14일)
   */
  async generateRefreshToken(twitchUserId: number): Promise<string> {
    const payload = {
      aud: twitchUserId,
      scope: 'refresh',
    };
    return this.jwtService.sign(payload, { expiresIn: '14d' });
  }

  /**
   * 트위치 유저 ID를 이용해 새로운 액세스 토큰과 리프레시 토큰을 생성합니다.
   * @param twitchUserId
   * @returns 액세스 토큰, 리프레시 토큰 (30분, 14일)
   */
  async generateNewAuthority(
    twitchUserId: number,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = await this.generateAccessToken(twitchUserId);
    const refreshToken = await this.generateRefreshToken(twitchUserId);
    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }
}
