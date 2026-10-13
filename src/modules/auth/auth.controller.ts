import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { SignupDTO } from './dtos/signup.dto';
import { SigninDTO } from './dtos/signin.dto';
import { User } from './decorators/auth.decorator';
import { Refresh } from './decorators/refresh.decorator';
import type { AuthUser } from './auth.model';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('signup')
  async signup(@Body() data: SignupDTO) {
    const tokens = await this.authService.signup(data.email, data.password);
    return tokens;
  }

  @Public()
  @Get('health')
  health() {
    return {
      status: 'ok',
    };
  }

  @Public()
  @Post('signin')
  async signIn(@Body() data: SigninDTO) {
    const tokens = await this.authService.signIn(data.email, data.password);
    return tokens;
  }

  @Refresh()
  @Post('refresh')
  async refresh(@User() user: AuthUser) {
    const tokens = await this.authService.refresh(user.id, user.role);
    return tokens;
  }
}
