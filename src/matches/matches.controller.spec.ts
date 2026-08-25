import { Test, TestingModule } from '@nestjs/testing';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

describe('MatchesController', () => {
  let controller: MatchesController;
  const matchesService = {
    findMine: jest.fn(),
    findOne: jest.fn(),
    complete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchesController],
      providers: [
        {
          provide: MatchesService,
          useValue: matchesService,
        },
      ],
    }).compile();

    controller = module.get(MatchesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('uses the authenticated user when listing matches', async () => {
    matchesService.findMine.mockResolvedValue([]);

    await controller.findMine({ user: { id: 8 } } as never);

    expect(matchesService.findMine).toHaveBeenCalledWith(8);
  });

  it('uses the participant identity when completing a match', async () => {
    matchesService.complete.mockResolvedValue({ id: 30, estado: 'FINALIZADO' });

    await controller.complete({ user: { id: 8 } } as never, 30);

    expect(matchesService.complete).toHaveBeenCalledWith(8, 30);
  });
});
