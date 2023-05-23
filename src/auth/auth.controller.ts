import { Controller, UseGuards, Query, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAccessGuard } from 'src/token/jwt-access.guard';
import { JwtRefreshGuard } from 'src/token/jwt-refresh.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  async auth(@Query('code') code: string, @Res() res: Response) {
    if (!code) return res.status(400).send();

    const token = await this.authService.login(code);
    if (token.status !== 200) return res.status(500).send();

    res.cookie('Authorization', token.Authorization, {
      domain: 'naseong.kim',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 30, // 30분
    });

    res.cookie('Refresh', token.Refresh, {
      domain: 'naseong.kim',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7 * 2, // 14일
    });

    return res.send();
  }

  @UseGuards(JwtAccessGuard)
  @Get('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    await this.authService.logout(req.cookies.Refresh);

    res.cookie('Authorization', 'REMOVED', {
      domain: 'naseong.kim',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 0,
    });

    res.cookie('Refresh', 'REMOVED', {
      domain: 'naseong.kim',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 0,
    });

    return res.send();
  }

  @UseGuards(JwtAccessGuard)
  @Get('access')
  getAccessToken() {
    return;
  }

  @UseGuards(JwtRefreshGuard)
  @Get('refresh')
  async getRefreshToken(@Req() req: Request, @Res() res: Response) {
    const token = await this.authService.refresh(req.cookies.Refresh);
    if (token.status !== 200) return res.status(401).send(token.error);

    res.cookie('Authorization', token.Authorization, {
      domain: 'naseong.kim',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 30, // 30분
    });

    res.cookie('Refresh', token.Refresh, {
      domain: 'naseong.kim',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7 * 2, // 14일
    });

    return res.send();
  }
}
