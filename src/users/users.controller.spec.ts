import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = {
    update: jest.fn(),
    findAll: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns the authenticated profile', () => {
    const user = { id: 7, rol: UserRole.TRABAJADOR } as User;

    expect(controller.profile({ user } as never)).toBe(user);
  });

  it('updates only the authenticated profile', async () => {
    const user = { id: 7, rol: UserRole.TRABAJADOR } as User;
    const update = { nombre: 'Nombre actualizado' };
    usersService.update.mockResolvedValue({ ...user, ...update });

    await controller.updateProfile({ user } as never, update);

    expect(usersService.update).toHaveBeenCalledWith(user.id, update);
  });

  it('lists users through the administrator service operation', async () => {
    usersService.findAll.mockResolvedValue([]);

    await expect(controller.findAll()).resolves.toEqual([]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.findAll)).toEqual([
      UserRole.ADMIN,
    ]);
  });

  it('updates a user active status', async () => {
    usersService.updateStatus.mockResolvedValue({ id: 8, activo: false });

    await controller.updateStatus(8, { activo: false });

    expect(usersService.updateStatus).toHaveBeenCalledWith(8, false);
    expect(Reflect.getMetadata(ROLES_KEY, controller.updateStatus)).toEqual([
      UserRole.ADMIN,
    ]);
  });
});
