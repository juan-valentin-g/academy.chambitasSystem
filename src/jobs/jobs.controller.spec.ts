import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

describe('JobsController', () => {
  let controller: JobsController;
  const jobsService = {
    findMine: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        {
          provide: JobsService,
          useValue: jobsService,
        },
      ],
    }).compile();

    controller = module.get(JobsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('uses the authenticated user for the owned jobs query', async () => {
    jobsService.findMine.mockResolvedValue([]);

    await controller.findMine({ user: { id: 7 } } as never);

    expect(jobsService.findMine).toHaveBeenCalledWith(7);
  });
});
