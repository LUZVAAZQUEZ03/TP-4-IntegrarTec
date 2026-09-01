import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import type { AuthResult, PublicUser, TokenPair } from './auth.types';

const BCRYPT_ROUNDS = 12;

interface JwtPayload {
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

@Injectable()
export class AuthService {
  private readonly accessTtl: string;
  private readonly refreshTtl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.accessTtl = this.config.get<string>('JWT_ACCESS_TTL') ?? '15m';
    this.refreshTtl = this.config.get<string>('JWT_REFRESH_TTL') ?? '7d';
  }

  async register(dto: CreateUserDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('El email ya esta registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
      },
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role as 'USER' | 'ADMIN');
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return { user: this.toPublicUser(user), tokens };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role as 'USER' | 'ADMIN');
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return { user: this.toPublicUser(user), tokens };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, refreshTokenHash: true },
    });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role as 'USER' | 'ADMIN');
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario inexistente');
    }
    return this.toPublicUser(user);
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: 'USER' | 'ADMIN',
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: this.accessTtl as unknown as number,
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.refreshTtl as unknown as number,
    });

    return { accessToken, refreshToken };
  }

  private async persistRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  private toPublicUser(user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role as 'USER' | 'ADMIN',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

}
