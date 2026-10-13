import { BaseModel } from 'src/utils/base-model';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Exclude } from 'class-transformer';

export enum UserRoleEnum {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
}
@Entity('users')
export class UserEntity extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'enum', enum: UserRoleEnum, default: UserRoleEnum.CUSTOMER })
  role: UserRoleEnum;
  @Column({ unique: true })
  email: string;
  @Column()
  @Exclude({ toPlainOnly: true })
  password: string;
  @Column({ nullable: true })
  name: string;
  @Column({ nullable: true })
  phone: string;

  private async _hashPassword() {
    if (this.password) {
      this.password = await UserEntity.hashPassword(this.password);
    }
  }

  static async hashPassword(pass: string) {
    return await bcrypt.hash(pass, 10);
  }
}
