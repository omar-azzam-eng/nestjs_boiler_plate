import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class CreateUserDTO {
  @IsEmail()
  email: string;
  @IsStrongPassword()
  password: string;
  @IsString()
  @IsOptional()
  name?: string;
  @IsPhoneNumber('SY')
  @IsOptional()
  phone?: string;
}
