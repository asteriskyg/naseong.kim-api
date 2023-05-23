import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import algoliasearch from 'algoliasearch';
import { Model } from 'mongoose';
import { Content, ContentDocument } from 'src/schemas/content.schema';

@Injectable()
export class ContentService {
  constructor(
    @InjectModel(Content.name) private contentModel: Model<ContentDocument>,
  ) {}

  /**
   * R2에 파일을 업로드하기 위한 URL을 반환합니다.
   * @param fileName
   * @returns 서명된 URL을 반환합니다.
   */
  async sign(file: string) {
    const S3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    });

    const signedUrl = await getSignedUrl(
      S3,
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: file,
      }),
      { expiresIn: 3600 },
    );

    return { signedUrl };
  }

  /**
   * DB에 새로운 컨텐츠를 추가합니다.
   * @param contentId
   * @param contentName
   * @param creatorName
   * @returns 추가한 컨텐츠의 정보를 반환합니다. (contentId, contentName, creatorName)
   */
  async create(contentId: string, contentName: string, creatorName: string) {
    const data = {
      contentId: contentId,
      contentName: contentName,
      creatorName: creatorName,
    };

    const content = (await this.contentModel.create(data)) as Content;
    return content;
  }

  /**
   * Algolia에 인덱스를 생성합니다.
   * @param contentId
   * @param contentName
   * @param creatorName
   * @returns 생성한 인덱스의 정보를 반환합니다. (contentId, contentName, creatorName)
   */
  async index(contentId: string, contentName: string, creatorName: string) {
    const client = algoliasearch(
      process.env.ALGOLIA_APP_ID,
      process.env.ALGOLIA_API_KEY,
    );
    const index = client.initIndex('contents');
    const record = {
      objectID: contentId,
      contentName: contentName,
      creatorName: creatorName,
    };
    index.saveObject(record).wait();
    return record;
  }

  /**
   * R2에 업로드된 파일 목록을 반환합니다.
   * @returns R2에 업로드된 파일 목록을 반환합니다.
   */
  async lists() {
    const S3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    });

    const imageList = await S3.send(
      new ListObjectsV2Command({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      }),
    );

    return imageList.Contents;
  }
}
