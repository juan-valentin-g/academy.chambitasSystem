import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    create: jest.Mock;
    findByEmail: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };

  const baseUser: User = {
    id: 1,
    nombre: 'Usuario de prueba',
    email: 'usuario@example.com',
    password: 'hashed-password',
    telefono: null as unknown as string,
    rol: UserRole.TRABAJADOR,
    descripcion: null as unknown as string,
    foto: null as unknown as string,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registers a user and omits the password from the response', async () => {
    usersService.create.mockResolvedValue({ ...baseUser });

    const result = await service.register({
      nombre: baseUser.nombre,
      email: baseUser.email,
      password: 'secret123',
    });

    expect(usersService.create).toHaveBeenCalledWith({
      nombre: baseUser.nombre,
      email: baseUser.email,
      password: 'secret123',
    });
    expect(result.accessToken).toBe('jwt-token');
    expect(result.user).not.toHaveProperty('password');
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: baseUser.id,
      email: baseUser.email,
      rol: baseUser.rol,
    });
  });

  it('logs in when the credentials are valid', async () => {
    const password = 'secret123';
    const passwordHash = await bcrypt.hash(password, 4);
    usersService.findByEmail.mockResolvedValue({
      ...baseUser,
      password: passwordHash,
    });

    const result = await service.login({
      email: baseUser.email,
      password,
    });

    expect(result.accessToken).toBe('jwt-token');
    expect(result.user).not.toHaveProperty('password');
  });

  it('rejects invalid credentials without revealing the cause', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({
        email: baseUser.email,
        password: 'incorrect-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
