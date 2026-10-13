import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserRoleEnum } from '../users/entities/user.entity';
import type { AuthTokenPayload } from './auth.model';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private async generateToken(userId: string, role: UserRoleEnum) {
    const accessPayload: AuthTokenPayload = {
      id: userId,
      role,
      tokenType: 'access',
    };

    const refreshPayload: AuthTokenPayload = {
      id: userId,
      role,
      tokenType: 'refresh',
    };

    const [token, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: '1d',
        secret: this.configService.authConfig.tokenSecret,
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: '7d',
        secret: this.configService.authConfig.refreshTokenSecret,
      }),
    ]);

    return { token, refreshToken };
  }

  async signup(email: string, password: string) {
    const userId = await this.usersService.createUser(
      {
        email,
        password,
      },
      UserRoleEnum.CUSTOMER,
    );
    return await this.generateToken(userId, UserRoleEnum.CUSTOMER);
  }
  async signIn(email: string, password: string) {
    let user;

    try {
      user = await this.usersService.getUserByEmail(email);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException('Invalid email or password');
      }

      throw error;
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateToken(user.id, user.role);
  }

  async refresh(id: string, role: UserRoleEnum) {
    const user = await this.usersService.getUserById(id);

    if (!user) {
      throw new UnauthorizedException();
    }
    return await this.generateToken(id, role);
  }
}
