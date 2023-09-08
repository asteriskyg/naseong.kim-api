import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ClipService } from './clip.service';
import { JwtAccessGuard } from 'src/token/jwt-access.guard';
import { Clip } from 'src/schemas/clip.schema';

@Controller('api/clip')
export class ClipController {
  constructor(private readonly clipService: ClipService) {}

  @Get('recent')
  async getRecentClip(@Query('offset') offset: number) {
    return await this.clipService.recent(offset);
  }

  @Get('detail')
  async detail(@Query('id') clipName: string, @Res() res: Response) {
    if (!clipName) return res.status(400).send();

    const response = await this.clipService.detail(clipName);
    if (!response) return res.status(404).send();

    return res.send(response);
  }

  @Get('user')
  async clip(
    @Query('id') twitchUserId: string,
    @Query('offset') offset: string,
    @Res() res: Response,
  ) {
    if (!twitchUserId) return res.status(400).send();

    const clip = await this.clipService.user(
      Number(twitchUserId),
      Number(offset),
    );

    return res.send(clip);
  }

  @UseGuards(JwtAccessGuard)
  @Get('create')
  async create(@Req() req: Request, @Res() res: Response) {
    const response = await this.clipService.create(
      req.cookies.authorization || req.cookies.Authorization,
    );

    if (!response) return res.status(500).send();
    return res.send(response);
  }

  @UseGuards(JwtAccessGuard)
  @Get('download')
  async download(@Query('id') clipName: string, @Res() res: Response) {
    if (!clipName) return res.status(400).send();

    const response = await this.clipService.download(clipName);
    return res.send(response);
  }

  @UseGuards(JwtAccessGuard)
  @Delete('delete')
  async delete(@Query('id') clipName: string, @Res() res: Response) {
    if (!clipName) return res.status(400).send();

    const response = await this.clipService.delete(clipName);
    if (response.status !== 200) {
      return res.status(response.status).send();
    }

    return res.send();
  }

  @UseGuards(JwtAccessGuard)
  @Get('import')
  async import(
    @Req() req: Request,
    @Query('url') url: string,
    @Res() res: Response,
  ) {
    if (!url) return res.status(400).send();

    const response = await this.clipService.import(
      req.cookies.authorization || req.cookies.Authorization,
      url,
    );
    if (response.status !== 200) {
      return res.status(response.status).send(response.message);
    }

    return res.send(response.message);
  }

  @UseGuards(JwtAccessGuard)
  @Post('edit')
  async update(
    @Query('id') clipName: string,
    @Body('data') data: Clip,
    @Res() res: Response,
  ) {
    console.log(clipName, data);
    if (!clipName || !data) return res.status(400).send();
    return res.send(await this.clipService.update(clipName, data));
  }

  @UseGuards(JwtAccessGuard)
  @Post('trim')
  async trim(
    @Query('id') clipName: string,
    @Body('start') start: number,
    @Body('end') end: number,
    @Res() res: Response,
  ) {
    if (start > end) return res.status(400).send();

    const trim = await this.clipService.trim(clipName, start, end);
    if (trim.status !== 200) return res.status(trim.status).send();

    return res.send(clipName);
  }
}
