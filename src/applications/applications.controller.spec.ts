import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  const applicationsService = {
    findMine: jest.fn(),
    accept: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [
        {
          provide: ApplicationsService,
          useValue: applicationsService,
        },
      ],
    }).compile();

    controller = module.get(ApplicationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('uses the authenticated user to list sent applications', async () => {
    applicationsService.findMine.mockResolvedValue([]);

    await controller.findMine({ user: { id: 8 } } as never);

    expect(applicationsService.findMine).toHaveBeenCalledWith(8);
  });

  it('returns the match generated when an application is accepted', async () => {
    const match = { id: 30, applicationId: 20 };
    applicationsService.accept.mockResolvedValue(match);

    await expect(
      controller.accept({ user: { id: 5 } } as never, 20),
    ).resolves.toEqual(match);
    expect(applicationsService.accept).toHaveBeenCalledWith(5, 20);
  });
});
