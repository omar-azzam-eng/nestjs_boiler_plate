import { IsEmail, IsStrongPassword } from 'class-validator';
export class SignupDTO {
  @IsEmail()
  email: string;
  @IsStrongPassword()
  password: string;
}
