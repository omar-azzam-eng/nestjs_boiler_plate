import { UserRoleEnum } from '../users/entities/user.entity';

export interface AuthUser {
  id: string;
  role: UserRoleEnum;
}

export interface AuthTokenPayload extends AuthUser {
  tokenType: 'access' | 'refresh';
}
