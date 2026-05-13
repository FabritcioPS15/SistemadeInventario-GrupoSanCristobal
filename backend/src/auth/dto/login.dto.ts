import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '72562172', description: 'Email o DNI del usuario' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: '15042002', description: 'Contraseña del usuario' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
