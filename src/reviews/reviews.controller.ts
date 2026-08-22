import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request as RequestDecorator,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

interface AuthenticatedRequest extends Request {
  user: User;
}

@UseGuards(JwtAuthGuard)
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('matches/:matchId/reviews')
  create(
    @RequestDecorator() request: AuthenticatedRequest,
    @Param('matchId', ParseIntPipe) matchId: number,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.create(
      request.user.id,
      matchId,
      createReviewDto,
    );
  }

  @Get('matches/:matchId/reviews')
  findByMatch(
    @RequestDecorator() request: AuthenticatedRequest,
    @Param('matchId', ParseIntPipe) matchId: number,
  ) {
    return this.reviewsService.findByMatch(request.user.id, matchId);
  }

  @Get('reviews/received')
  findReceived(@RequestDecorator() request: AuthenticatedRequest) {
    return this.reviewsService.findReceived(request.user.id);
  }
}
