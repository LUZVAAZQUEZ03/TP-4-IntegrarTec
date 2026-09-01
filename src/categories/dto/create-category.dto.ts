import {
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @IsHexColor({ message: 'color debe ser un codigo hexadecimal (ej. #RRGGBB)' })
  color?: string;
}
