import { IsPort, IsString, IsUrl, MinLength } from 'class-validator';

class DBConfigDTO {
  @IsUrl()
  host: string;
  @IsPort()
  port: number;
  @IsString()
  user: string;
  @IsString()
  password: string;
  @IsString()
  database: string;
}

class AuthConfigDTO {
  @IsString()
  @MinLength(12)
  tokenSecret: string;
  @IsString()
  @MinLength(12)
  refreshTokenSecret: string;
}

export class ConfigDTO {
  db: DBConfigDTO;
  auth: AuthConfigDTO;
}
