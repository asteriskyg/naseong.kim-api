import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ContentService } from './content.service';
import { JwtAccessGuard } from 'src/token/jwt-access.guard';

@Controller('api/content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @UseGuards(JwtAccessGuard)
  @Get('sign')
  async sign(@Query('file') file: string, @Res() res: Response) {
    if (!file) return res.status(400).send();
    const signedUrl = await this.contentService.sign(file);
    return res.send(signedUrl);
  }

  @UseGuards(JwtAccessGuard)
  @Post('create')
  async create(
    @Body('contentId') contentId: string,
    @Body('contentName') contentName: string,
    @Body('creatorName') creatorName: string,
    @Res() res: Response,
  ) {
    if (!contentId || !contentName || !creatorName)
      return res.status(400).send();
    return await this.contentService.create(
      contentId,
      contentName,
      creatorName,
    );
  }

  async lists() {
    return await this.contentService.lists();
  }
}
