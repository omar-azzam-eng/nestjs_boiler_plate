import { Body, Controller, Get, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../auth/decorators/auth.decorator';
import { UserResponseDTO } from './dtos/response.dto';
import type { AuthUser } from '../auth/auth.model';
import { UpdateUserDTO } from './dtos/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Put()
  async updateMe(
    @Body()
    data: UpdateUserDTO,
    @User() { id }: AuthUser,
  ): Promise<UserResponseDTO> {
    const user = await this.usersService.updateUser(id, data);
    return new UserResponseDTO(user.id, user.email, user.name, user.phone);
  }

  @Get()
  async getMe(@User() { id }: AuthUser): Promise<UserResponseDTO> {
    const user = await this.usersService.getUserById(id);
    return new UserResponseDTO(user.id, user.email, user.name, user.phone);
  }
}
