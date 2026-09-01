import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Universidad', minLength: 1, maxLength: 60 })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @ApiPropertyOptional({ example: '#4F46E5' })
  @IsOptional()
  @IsString()
  @IsHexColor({ message: 'color debe ser un codigo hexadecimal (ej. #RRGGBB)' })
  color?: string;
}
