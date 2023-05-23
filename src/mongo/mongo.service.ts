import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { Clip, ClipDocument } from 'src/schemas/clip.schema';

@Injectable()
export class MongoService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Clip.name) private clipModel: Model<ClipDocument>,
  ) {}

  /**
   * DB에 새로운 유저를 추가합니다.
   * @param data 추가할 유저의 정보
   * @returns 추가한 유저의 정보
   */
  async createUser(data: any): Promise<User> {
    return (await this.userModel.create(data)) as User;
  }

  /**
   * DB에서 유저 정보를 찾아 반환합니다.
   * @param twitchUserId
   * @param internal 내부적으로 사용할지 여부
   */
  async getUserDetail(twitchUserId: number, internal: boolean): Promise<User> {
    if (!internal) {
      return (await this.userModel
        .findOne(
          { twitchUserId: twitchUserId },
          {
            _id: 0,
            __v: 0,
            email: 0,
            serviceRefreshToken: 0,
            twitchAccessToken: 0,
            twitchRefreshToken: 0,
          },
        )
        .exec()) as User;
    } else {
      return (await this.userModel
        .findOne({ twitchUserId }, { _id: 0, __v: 0 })
        .exec()) as User;
    }
  }

  /**
   * DB에서 유저를 찾고 정보를 갱신합니다.
   * @param twitchUserId
   * @param data 업데이트할 유저의 정보
   */
  async updateUserDetail(twitchUserId: number, data: User): Promise<User> {
    return (await this.userModel
      .findOneAndUpdate({ twitchUserId }, data, {
        new: true,
      })
      .exec()) as User;
  }

  /**
   * DB에서 유저를 찾고 넘겨받은 리프레시 토큰을 제거합니다.
   * @param refreshToken
   * @param twitchUserId
   * @returns
   */
  async logoutUser(refreshToken: string, twitchUserId: number): Promise<User> {
    return await this.userModel
      .findOneAndUpdate(
        { twitchUserId },
        { $pull: { serviceRefreshToken: refreshToken } },
        { new: true },
      )
      .exec();
  }

  /**
   * 최근 등록된 클립을 반환합니다.
   * @param offset 12개씩 건너뜁니다.
   * @returns 최근 등록된 클립을 반환합니다.
   */
  async getRecentClip(offset: number): Promise<Clip[]> {
    const clipList = await this.clipModel
      .find({})
      .sort({ _id: -1 })
      .limit(12)
      .skip(offset * 12)
      .exec();

    return clipList as Clip[];
  }

  /**
   * DB에서 해당 유저가 만든 클립을 반환합니다.
   * @param twitchUserId
   * @param offset
   * @returns 클립 리스트 (12개씩, offset만큼 건너뜁니다. 없으면 빈 배열)
   */
  async getRecentClipByUser(
    twitchUserId: number,
    offset: number,
  ): Promise<Clip[]> {
    if (!offset) offset = 0;
    const clipList = await this.clipModel
      .find({ creatorId: twitchUserId })
      .sort({ _id: -1 })
      .limit(12)
      .skip(offset * 12)
      .exec();

    return clipList as Clip[];
  }

  /**
   * 클립의 상세 정보를 반환합니다.
   * @param clipName clipName
   * @returns 클립의 상세 정보를 반환합니다.
   */
  async getClipDetail(clipName: string): Promise<Clip> {
    return (await this.clipModel.findOne({ clipName }).exec()) as Clip;
  }

  /**
   * DB에 클립을 저장합니다.
   * @param data
   * @returns 생성한 클립의 정보를 반환합니다.
   */
  async createClip(data: Clip): Promise<Clip> {
    return await this.clipModel.create(data);
  }

  /**
   * DB에서 클립을 찾고 정보를 갱신합니다.
   * @param id 업데이트할 클립의 id (clipName)
   * @param data 업데이트할 클립의 정보
   * @returns 업데이트한 클립의 정보 (없는 유저인 경우 null)
   */
  async updateClip(clipName: string, data: Clip): Promise<Clip> {
    return (await this.clipModel
      .findOneAndUpdate({ clipName }, data, {
        new: true,
      })
      .exec()) as Clip;
  }

  /**
   * DB에서 클립을 삭제합니다.
   * @param clipName
   * @returns
   */
  async deleteClip(clipName: string) {
    return await this.clipModel.deleteOne({ clipName }).exec();
  }
}
