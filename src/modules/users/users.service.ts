import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, QueryFailedError, Repository } from 'typeorm';
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
    const password = await UserEntity.hashPassword(data.password);
    const user = this.usersRepository.create({
      email: data.email,
      password: password,
      name: data.name,
      phone: data.phone,
      role: role,
    });
    try {
      const result = await this.usersRepository.insert(user);
      return result.identifiers[0].id as string;
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Email already exists');
      }

      throw new InternalServerErrorException('Failed to create user');
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
    const definedData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(definedData).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const updates = {
      ...definedData,
      ...(definedData.password
        ? {
            password: await UserEntity.hashPassword(
              definedData.password as string,
            ),
          }
        : {}),
    };

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No data provided for update');
    }

    const user = await this.getUserById(id);

    await this.usersRepository.update(user.id, updates);

    return this.getUserById(user.id);
  }
}
