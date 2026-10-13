import {
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class UpdateUserDTO {
  @IsStrongPassword()
  @IsOptional()
  password?: string;
  @IsString()
  @IsOptional()
  name?: string;
  @IsPhoneNumber('SY')
  @IsOptional()
  phone?: string;
}
