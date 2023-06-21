import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { AuthService } from 'src/auth/auth.service';
import { TokenService } from 'src/token/token.service';
import { MongoService } from 'src/mongo/mongo.service';
import { User } from 'src/schemas/user.schema';
import { Clip } from 'src/schemas/clip.schema';
import * as FormData from 'form-data';
import * as fs from 'fs';

@Injectable()
export class ClipService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly authService: AuthService,
    private readonly httpService: HttpService,
    private readonly mongoService: MongoService,
  ) {}

  /**
   * 최근 등록된 클립을 반환합니다.
   * @param offset 12개씩 건너뜁니다.
   * @returns 클립 리스트 (12개씩, offset만큼 건너뜁니다. 없으면 빈 배열)
   */
  async recent(offset: number) {
    if (!offset) offset = 0;
    return await this.mongoService.getRecentClip(offset);
  }

  /**
   * DB에서 해당 유저가 만든 클립을 반환합니다.
   * @param twitchUserId
   * @param offset
   * @returns 클립 리스트 (12개씩, offset만큼 건너뜁니다. 없으면 빈 배열)
   */
  async user(twitchUserId: number, offset: number) {
    if (!offset) offset = 0;
    return await this.mongoService.getRecentClipByUser(twitchUserId, offset);
  }

  /**
   * 클립의 상세 정보를 반환합니다.
   * @param id id===clipName
   * @returns 클립의 상세 정보를 반환합니다.
   */
  async detail(clipName: string) {
    return await this.mongoService.getClipDetail(clipName);
  }

  /**
   * 클립을 생성하고 DB에 저장합니다.
   * @param Authorization
   * @returns 생성한 클립의 정보를 반환합니다. (clipName, clipId, broadcastTitle)
   */
  async create(Authorization: string) {
    const object = await this.tokenService.decodeJWT(Authorization);
    const user = await this.mongoService.getUserDetail(object.aud, true);

    const clip = await (
      await firstValueFrom(
        this.httpService.get(`${process.env.CLOUDFLARE_WORKERS_URL}/getClip`, {
          headers: {
            Authorization: user.twitchAccessToken,
            creatorName: encodeURIComponent(user.displayName),
            'Accept-Encoding': 'gzip,deflate,compress',
          },
        }),
      )
    ).data;

    try {
      return await this.mongoService.createClip({
        contentId: clip.url.uid,
        contentName: clip.channelTitle,
        gameId: clip.gameId,
        gameName: clip.gameName,
        creatorId: user.twitchUserId,
        creatorName: user.displayName,
        streamStartedAt: clip.startedAt,
        clipCreatedAt: clip.url.created,
        clipDuration: 90,
        clipLastEdited: clip.url.created,
        clipName: clip.clipName,
      });
    } catch (e) {
      try {
        await this.authService.refreshTwitchToken(user);
      } catch (e) {
        return { error: 'refreshTokenExpired' };
      }
    }

    return await this.mongoService.createClip({
      contentId: clip.url.uid,
      contentName: clip.channelTitle,
      gameId: clip.gameId,
      gameName: clip.gameName,
      creatorId: user.twitchUserId,
      creatorName: user.displayName,
      streamStartedAt: clip.startedAt,
      clipCreatedAt: clip.url.created,
      clipDuration: 90,
      clipLastEdited: clip.url.created,
      clipName: clip.clipName,
    });
  }

  /**
   * DB에서 클립을 찾고 정보를 갱신합니다.
   * @param id 업데이트할 클립의 id (clipName)
   * @param data 업데이트할 클립의 정보
   * @returns 업데이트한 클립의 정보 (없는 클립인 경우 null)
   */
  async update(clipName: string, data: Clip) {
    return await this.mongoService.updateClip(clipName, data);
  }

  /**
   * DB와 Cloudflare Stream에서 클립을 삭제합니다.
   * @param id
   * @returns
   */
  async delete(clipName: string) {
    const clip = await this.mongoService.getClipDetail(clipName);
    if (!clip) return { status: 404 };

    const deleteResult = await this.mongoService.deleteClip(clip.clipName);
    if (!deleteResult.acknowledged || deleteResult.deletedCount === 0)
      return { status: 500 };

    try {
      await firstValueFrom(
        this.httpService.delete(
          `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${clip.contentId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
              'Accept-Encoding': 'gzip,deflate,compress',
            },
          },
        ),
      );
    } catch (e) {
      return { status: 500 };
    }

    return { status: 200 };
  }

  /**
   * 클립을 다운로드 합니다.
   * @param clipName
   * @returns 클립 다운로드 URL
   */
  async download(clipName: string) {
    const clip = await this.mongoService.getClipDetail(clipName);

    const streamInfo = await (
      await firstValueFrom(
        this.httpService.post(
          `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${clip.contentId}/downloads`,
          {},
          {
            headers: {
              Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
              'Accept-Encoding': 'gzip,deflate,compress',
            },
          },
        ),
      )
    ).data.result.default;
    return streamInfo;
  }

  /**
   * 클립을 자르고 DB에 저장합니다.
   * @param clipName 자를 클립의 id (clipName)
   * @param start
   * @param end
   * @returns 잘라낸 클립의 정보를 반환합니다. (clipName)
   */
  async trim(clipName: string, start: number, end: number) {
    if (end - start < 10) return { status: 400 };
    const clip = await this.mongoService.getClipDetail(clipName);

    try {
      const uid = await (
        await firstValueFrom(
          this.httpService.post(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/clip`,
            {
              clippedFromVideoUID: clip.contentId,
              startTimeSeconds: start,
              endTimeSeconds: end,
              meta: {
                name: clip.clipName,
                creatorName: clip.creatorName,
              },
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                'Accept-Encoding': 'gzip,deflate,compress',
              },
            },
          ),
        )
      ).data.result.uid;

      await this.mongoService.updateClip(clipName, {
        clipName: clip.clipName,
        contentId: uid,
        contentName: clip.contentName,
        gameId: clip.gameId,
        gameName: clip.gameName,
        streamStartedAt: clip.streamStartedAt,
        creatorId: clip.creatorId,
        creatorName: clip.creatorName,
        clipCreatedAt: clip.clipCreatedAt,
        clipDuration: end - start,
        clipLastEdited: new Date(),
      });

      this.httpService.get(`${process.env.CLOUDFLARE_WORKERS_URL}/deleteClip`, {
        headers: {
          newId: uid,
          id: clipName,
          'Accept-Encoding': 'gzip,deflate,compress',
        },
      });

      return { status: 200 };
    } catch (e) {
      console.log(e.response.data);
      return { status: 500 };
    }
  }

  /**
   * 유튜브에서 클립을 가져옵니다.
   * @param Authorization
   * @param url
   * @returns
   */
  async import(Authorization: string, url: string) {
    const DOCKER_URL = process.env.DOCKER_URL;

    if (!/https:\/\/(www\.)?youtube\.com\/clip\/(.*?)$/.test(url))
      return {
        status: 400,
        message: {
          message: '올바른 클립 URL이 아니에요.',
          description: '유튜브 클립 주소가 맞는지 확인해주세요.',
        },
      };

    const videoInfo = await (
      await firstValueFrom(
        this.httpService.get(`${DOCKER_URL}/extract_info?url=${url}`),
      )
    ).data;
    if (!videoInfo)
      return {
        status: 404,
        message: {
          message: '클립을 찾을 수 없어요.',
          description: '클립이 삭제되었거나, 주소가 잘못됐을 수 있어요.',
        },
      };
    if (
      videoInfo.channel_id !== 'UCxbWbdvNz3VCTVumDIc0XrA' &&
      videoInfo.channel_id !== 'UCfLvxrf3KoKpUG0bBHIZJ-g'
    )
      return {
        status: 403,
        message: {
          message: '클립을 가져올 수 없는 채널이에요.',
          description: '긴나성, 딥나성 클립만 가져올 수 있어요.',
        },
      };

    const validate = await this.mongoService.getClipDetail(videoInfo.id);
    if (validate)
      return {
        status: 200,
        message: {
          message: '이미 가져온 클립이에요.',
          id: validate.clipName,
        },
      };

    const jwt = await this.tokenService.decodeJWT(Authorization);
    const user = await this.mongoService.getUserDetail(jwt.aud, true);

    const clip = await this.mongoService.createClip({
      contentId: videoInfo.id,
      contentName: videoInfo.title,
      gameId: 999,
      gameName: 'YouTube Clip',
      streamStartedAt: videoInfo.release_timestamp
        ? (new Date(
            Number(`${videoInfo.release_timestamp}000`),
          ).toISOString() as unknown as Date)
        : (new Date().toISOString() as unknown as Date),
      creatorId: user.twitchUserId,
      creatorName: user.displayName,
      clipCreatedAt: new Date().toISOString() as unknown as Date,
      clipDuration: videoInfo.duration,
      clipLastEdited: new Date().toISOString() as unknown as Date,
      clipName: videoInfo.id,
    });

    this.extract(user, url, clip);
    return {
      status: 202,
      message: {
        message: '클립을 가져왔어요.',
        id: videoInfo.id,
      },
    };
  }

  /**
   * 유튜브에서 클립을 다운로드 하고 Stream에 업로드 합니다.
   * @param user
   * @param url
   * @param clip
   * @returns
   */
  async extract(user: User, url: string, clip: Clip) {
    const DOCKER_URL = process.env.DOCKER_URL;
    const video = await (
      await firstValueFrom(
        this.httpService.get(`${DOCKER_URL}/download?url=${url}`),
      )
    ).data;
    if (video.status_code !== 200)
      return console.log({
        status: 'Failed to fetch clip from YouTube.',
        url: url,
      });

    const redisIndex = video.downloads[0]._redis_id;

    while (true) {
      const startedJob = await (
        await firstValueFrom(this.httpService.get(`${DOCKER_URL}/queue`))
      ).data.started_job;
      if (!startedJob.find((x) => x.id === redisIndex)) break;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    const finishedJob = await (
      await firstValueFrom(this.httpService.get(`${DOCKER_URL}/queue`))
    ).data.finished_job;

    if (!finishedJob.find((x) => x.id === redisIndex)) {
      return console.log({
        status: 'Failed to find clip from finished_job.',
        url: url,
      });
    }

    const file = finishedJob.find((x) => x.id === redisIndex);
    const filename = file.job.meta.downloaded_files[0]?.filename;
    if (!filename) {
      return console.log({
        status: 'Failed to get filename from finished_job.',
        url: url,
      });
    }

    const form = new FormData();
    form.append('file', fs.readFileSync(`../ydl_api/${filename}`), redisIndex);

    const response = await (
      await firstValueFrom(
        this.httpService.post(
          `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream`,
          form,
          {
            headers: {
              ...form.getHeaders(),
              Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
              'Accept-Encoding': 'gzip,deflate,compress',
            },
          },
        ),
      )
    ).data;

    fs.unlink(`../ydl_api/${filename}`, (err) => {
      if (err) {
        console.log({ message: 'Failed to delete file.', err: err });
        return;
      }
    });

    await this.mongoService.updateClip(clip.clipName, {
      contentId: response.result.uid,
      contentName: clip.contentName,
      gameId: clip.gameId,
      gameName: clip.gameName,
      streamStartedAt: clip.streamStartedAt,
      creatorId: clip.creatorId,
      creatorName: clip.creatorName,
      clipCreatedAt: clip.clipCreatedAt,
      clipDuration: clip.clipDuration,
      clipLastEdited: clip.clipLastEdited,
      clipName: clip.clipName,
    });

    await firstValueFrom(
      this.httpService.post(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${response.result.uid}`,
        { creator: user.displayName },
        {
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Accept-Encoding': 'gzip,deflate,compress',
          },
        },
      ),
    );
  }
}
