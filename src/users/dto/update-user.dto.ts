import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'avatar debe ser una URL valida' })
  @MaxLength(2048)
  avatar?: string;
}
