import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '72562172', description: 'DNI del usuario' })
  @IsString()
  @IsNotEmpty()
  dni: string;

  @ApiProperty({ example: '15042002', description: 'Contraseña del usuario' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
