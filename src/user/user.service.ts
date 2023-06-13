import { Injectable } from '@nestjs/common';
import { User } from 'src/schemas/user.schema';
import { TokenService } from 'src/token/token.service';
import { MongoService } from 'src/mongo/mongo.service';

@Injectable()
export class UserService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly mongoService: MongoService,
  ) {}

  /**
   * DB에 새로운 유저를 추가합니다.
   * @param data 추가할 유저의 정보
   * @returns 추가한 유저의 정보
   */
  async create(data: User): Promise<User> {
    return (await this.mongoService.createUser(data)) as User;
  }

  /**
   * DB에서 유저 정보를 찾아 반환합니다.
   * @param twitchUserId
   * @param internal 내부적으로 사용할지 여부
   */
  async detail(
    twitchUserId: number | string,
    internal: boolean,
  ): Promise<User> {
    if (typeof twitchUserId === 'string') {
      const user = await this.tokenService.decodeJWT(twitchUserId);
      twitchUserId = user.aud;
    }
    if (!internal) internal = false;
    return (await this.mongoService.getUserDetail(
      twitchUserId,
      internal,
    )) as User;
  }

  /**
   * DB에서 유저를 찾고 정보를 갱신합니다.
   * @param twitchUserId
   * @param data 업데이트할 유저의 정보
   */
  async update(twitchUserId: number, data: User): Promise<User> {
    await this.mongoService.updateUserDetail(twitchUserId, data);
    return (await this.mongoService.getUserDetail(twitchUserId, false)) as User;
  }
}
