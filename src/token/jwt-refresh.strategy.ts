import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from './constants';
import { Request } from 'express';
import { MongoService } from '../mongo/mongo.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwtRefreshToken',
) {
  constructor(private readonly mongoService: MongoService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req.cookies.refresh || req.cookies.Refresh;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.cookies.refresh || req.cookies.Refresh;
    const twitchUserId = payload.aud;
    const user = await this.mongoService.getUserDetail(twitchUserId, true);
    const refreshTokenArray = user?.serviceRefreshToken;

    if (refreshTokenArray?.includes(refreshToken)) {
      return true;
    }
  }
}
