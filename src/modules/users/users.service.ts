import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { UserEntity, UserRoleEnum } from './entities/user.entity';
import { CreateUserDTO } from './dtos/create-user.dto';
import { UpdateUserDTO } from './dtos/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}

  async createUser(data: CreateUserDTO, role: UserRoleEnum): Promise<string> {
    const user = this.usersRepository.create({
      email: data.email,
      password: data.password,
      name: data.name,
      phone: data.phone,
      role: role,
    });
    try {
      const result = await this.usersRepository.insert(user);
      return result.identifiers[0].id as string;
    } catch {
      throw new HttpException('Failed to create user', 400);
    }
  }

  async getAllUsers(): Promise<UserEntity[]> {
    return await this.usersRepository.find({
      where: { deletedAt: IsNull() },
    });
  }

  async getUserById(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      where: { email, deletedAt: IsNull() },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await this.usersRepository.softDelete({ id, deletedAt: IsNull() });
  }

  async updateUser(id: string, data: UpdateUserDTO): Promise<UserEntity> {
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No data provided for update');
    }

    const user = await this.usersRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (data.password) {
      data.password = await UserEntity.hashPassword(data.password);
    }
    await this.usersRepository.update(id, data);
    return this.getUserById(id);
  }

  async getAdminUserIds(): Promise<string[]> {
    const adminIds = await this.usersRepository.find({
      where: { role: UserRoleEnum.ADMIN },
      select: { id: true },
    });
    return [...new Set(adminIds.map((adminId) => adminId.id))];
  }
}
