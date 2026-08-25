import { Test, TestingModule } from '@nestjs/testing';

import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  const reviewsService = {
    findReceived: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        {
          provide: ReviewsService,
          useValue: reviewsService,
        },
      ],
    }).compile();

    controller = module.get(ReviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('uses the authenticated user to list received reviews', async () => {
    reviewsService.findReceived.mockResolvedValue([]);

    await controller.findReceived({ user: { id: 8 } } as never);

    expect(reviewsService.findReceived).toHaveBeenCalledWith(8);
  });
});
