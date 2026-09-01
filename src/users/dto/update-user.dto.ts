import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Ada Lovelace', minLength: 2, maxLength: 80 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 'https://cdn.planify.dev/avatars/ada.png' })
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'avatar debe ser una URL valida' })
  @MaxLength(2048)
  avatar?: string;
}
