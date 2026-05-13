import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async signIn(identifier: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { dni: identifier }
        ]
      }
    });
    
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Aquí deberíamos usar bcrypt para comparar contraseñas hasheadas.
    // Por ahora, para la migración inicial, compararemos directo o con el método que uses.
    if (user.password !== pass) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    const payload = { 
      sub: user.id, 
      dni: user.dni, 
      role: user.role,
      full_name: user.full_name 
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        dni: user.dni,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
      }
    };
  }
}
