import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CategoriesService } from './categories.service';

type MockRepository<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: MockRepository<Category>;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates and persists a category', async () => {
    const dto = {
      nombre: 'Plomeria',
      descripcion: 'Servicios de plomeria',
    };
    const category = { id: 1, ...dto } as Category;
    repository.create?.mockReturnValue(category);
    repository.save?.mockResolvedValue(category);

    await expect(service.create(dto)).resolves.toEqual(category);
    expect(repository.create).toHaveBeenCalledWith(dto);
    expect(repository.save).toHaveBeenCalledWith(category);
  });

  it('updates an existing category', async () => {
    const category = {
      id: 1,
      nombre: 'Plomeria',
      descripcion: 'Descripcion anterior',
    } as Category;
    repository.findOne?.mockResolvedValue(category);
    repository.save?.mockImplementation(async (value) => value);

    await expect(
      service.update(1, { descripcion: 'Descripcion nueva' }),
    ).resolves.toMatchObject({ descripcion: 'Descripcion nueva' });
  });

  it('removes an existing category', async () => {
    const category = { id: 1 } as Category;
    repository.findOne?.mockResolvedValue(category);

    await service.remove(1);

    expect(repository.remove).toHaveBeenCalledWith(category);
  });
});
