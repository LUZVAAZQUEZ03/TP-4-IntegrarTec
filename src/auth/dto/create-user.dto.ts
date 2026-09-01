import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Ada Lovelace', minLength: 2, maxLength: 80 })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 'ada@planify.dev', maxLength: 254 })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    example: 'Planify2026!',
    minLength: 8,
    maxLength: 128,
    description: 'Contrasena entre 8 y 128 caracteres. Se guarda hasheada con bcrypt.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
