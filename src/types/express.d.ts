import { UserEntity } from 'src/modules/users/entities/user.entity';
import { Request } from 'express';

declare namespace Express {
  export interface Request {
    user?: Pick<UserEntity, 'id' | 'role'>;
  }
}

declare module 'express' {
  export interface Request {
    user?: Pick<UserEntity, 'id' | 'role'>;
  }
}

declare module 'express-serve-static-core' {
  export interface Request {
    user?: Pick<UserEntity, 'id' | 'role'>;
  }
}
