import { IsEnum } from 'class-validator';
import { AccountStatus } from '../entities/driver.entity';

export class UpdateDriverStatusDto {
  @IsEnum(AccountStatus)
  accountStatus: AccountStatus;
}
