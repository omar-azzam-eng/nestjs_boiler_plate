import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { PUBLIC_KEY } from '../decorators/public.decorator';
import { REFRESH_KEY } from '../decorators/refresh.decorator';
import type { AuthUser } from '../auth.model';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // checking if the endpoint is public
    const request = context.switchToHttp().getRequest<Request>();
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }

    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    let isRefresh = false;
    if (
      this.reflector.getAllAndOverride<boolean>(REFRESH_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      isRefresh = true;
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthUser>(token, {
        secret: !isRefresh
          ? this.configService.authConfig.tokenSecret
          : this.configService.authConfig.refreshTokenSecret,
      });
      request.user = {
        id: payload.id,
        role: payload.role,
      };
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
