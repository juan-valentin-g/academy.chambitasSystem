import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  const usersRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('persists a user active status change', async () => {
    const user = { id: 8, activo: true } as User;
    usersRepository.findOne.mockResolvedValue(user);
    usersRepository.save.mockImplementation(async (value) => value);

    await expect(service.updateStatus(8, false)).resolves.toMatchObject({
      id: 8,
      activo: false,
    });
    expect(usersRepository.save).toHaveBeenCalledWith(user);
  });
});
