import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserRoleEnum } from '../users/entities/user.entity';
import type { AuthUser } from './auth.model';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private async generateToken(userId: string, role: UserRoleEnum) {
    const payload: AuthUser = { id: userId, role: role };
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: '1d',
      secret: this.configService.authConfig.tokenSecret,
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
      secret: this.configService.authConfig.refreshTokenSecret,
    });
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
    const user = await this.usersService.getUserByEmail(email);
    if (!(await bcrypt.compare(password, user.password))) {
      throw new NotFoundException('Your credentials are incorrect');
    }
    return await this.generateToken(user.id, user.role);
  }

  async refresh(id: string, role: UserRoleEnum) {
    return await this.generateToken(id, role);
  }
}
