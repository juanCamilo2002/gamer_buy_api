import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) { }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });

    if (existing) {
      throw new UnauthorizedException('Email already in use')
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed
      }
    });

    return user;
  }

  async validateUser(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    const user = await this.validateUser(dto)

    const accessToken = this.signToken(
      { sub: user.id, role: user.role, email: user.email },
      'JWT_ACCESS_SECRET',
      'JWT_ACCESS_EXPIRES_IN',
    )
    const refreshToken = this.signToken(
      { sub: user.id, role: user.role, email: user.email },
      'JWT_REFRESH_SECRET',
      'JWT_REFRESH_EXPIRES_IN',
    )

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: refreshTokenHash,
        userId: user.id,
        userAgent,
        ip,
        expiresAt,
      },
    })

    return {
      accessToken,
      refreshToken,
    }
  }

  async refresh(refreshToken: string, userAgent?: string, ip?: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const sessions = await this.prisma.refreshToken.findMany({
        where: {
          userId: payload.sub,
          revoked: false
        }
      });

      let matchedSession: typeof sessions[number] | null = null;

      for (const session of sessions) {
        const isMatch = await bcrypt.compare(refreshToken, session.tokenHash)
        if (isMatch) {
          matchedSession = session
          break;
        }
      }

      if (!matchedSession) {
        throw new UnauthorizedException('Invalid refresh token')
      }

      if (matchedSession.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired')
      }

      await this.prisma.refreshToken.update({
        where: { id: matchedSession.id },
        data: { revoked: true }
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub }
      });

      if (!user) {
        throw new UnauthorizedException('User not found')
      }

      const newAccessToken = this.signToken(
        { sub: user.id, role: user.role, email: user.email },
        'JWT_ACCESS_SECRET',
        'JWT_ACCESS_EXPIRES_IN',
      )
      const newRefreshToken = this.signToken(
        { sub: user.id, role: user.role, email: user.email },
        'JWT_REFRESH_SECRET',
        'JWT_REFRESH_EXPIRES_IN',
      )

      const newHash = await bcrypt.hash(newRefreshToken, 10);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.prisma.refreshToken.create({
        data: {
          tokenHash: newHash,
          userId: user.id,
          userAgent,
          ip,
          expiresAt
        }
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      }
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }

  async logout(refreshToken: string) {
    const sessions = await this.prisma.refreshToken.findMany({
      where: { revoked: false },
    });

    for (const session of sessions) {
      const isMatch = await bcrypt.compare(refreshToken, session.tokenHash);
      if (isMatch) {
        await this.prisma.refreshToken.update({
          where: { id: session.id },
          data: { revoked: true }
        });
        break;
      }
    }

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false
      },
      data: { revoked: true }
    });

    return { message: 'Logged out from all sessions successfully' };
  }

  private signToken(
    payload: any,
    secretKey: string,
    expiresKey: string,
  ) {
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>(secretKey),
      expiresIn: this.configService.getOrThrow<string>(expiresKey) as JwtSignOptions['expiresIn'],
    })
  }
}
