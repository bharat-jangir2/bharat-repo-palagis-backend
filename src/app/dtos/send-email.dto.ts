import { IsArray, IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class SendEmailDto {
  @IsArray()
  @IsEmail({}, { each: true })
  @IsNotEmpty()
  emails: string[];

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsString()
  html?: string;
}
