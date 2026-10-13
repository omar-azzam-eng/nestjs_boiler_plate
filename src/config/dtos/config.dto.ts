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

class R2ConfigDTO {
  @IsString()
  accessKey: string;
  @IsString()
  secretAccessKey: string;
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  endpoint: string;
  @IsString()
  bucketName: string;
}

export class ConfigDTO {
  db: DBConfigDTO;
  auth: AuthConfigDTO;
  r2: R2ConfigDTO;
}
