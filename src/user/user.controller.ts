import {
  Controller,
  Get,
  Query,
  Res,
  Req,
  Post,
  UseGuards,
  Body,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { UserService } from './user.service';
import { User } from 'src/schemas/user.schema';
import { JwtAccessGuard } from 'src/token/jwt-access.guard';
import { TokenService } from 'src/token/token.service';

@Controller('api/user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  @Get('detail')
  async detail(
    @Req() req: Request,
    @Query('id') twitchUserId: string,
    @Res() res: Response,
  ) {
    if (!twitchUserId && !req.cookies.Authorization)
      return res.status(400).send();

    const user = await this.userService.detail(
      Number(twitchUserId) || req.cookies.Authorization,
      false,
    );

    if (!user) return res.status(404).send();
    return res.status(200).send(user);
  }

  @UseGuards(JwtAccessGuard)
  @Post('update')
  async update(@Req() req: Request, @Body('data') data: User) {
    const jwt = await this.tokenService.decodeJWT(req.cookies.Authorization);
    const user = await this.userService.update(jwt.aud, data);
    return user;
  }
}
