import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request as RequestDecorator,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { User } from '../users/entities/user.entity';

import { MatchesService } from './matches.service';

interface AuthenticatedRequest extends Request {
  user: User;
}

@UseGuards(JwtAuthGuard)
@Controller('matches')
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
  ) {}

  @Post('applications/:applicationId')
  create(
    @RequestDecorator()
    request: AuthenticatedRequest,

    @Param(
      'applicationId',
      ParseIntPipe,
    )
    applicationId: number,
  ) {
    return this.matchesService.createFromApplication(
      request.user.id,
      applicationId,
    );
  }

  @Get()
  findMine(
    @RequestDecorator()
    request: AuthenticatedRequest,
  ) {
    return this.matchesService.findMine(
      request.user.id,
    );
  }

  @Get(':id')
  findOne(
    @RequestDecorator()
    request: AuthenticatedRequest,

    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.matchesService.findOne(
      request.user.id,
      id,
    );
  }

  @Patch(':id/complete')
  complete(
    @RequestDecorator()
    request: AuthenticatedRequest,

    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.matchesService.complete(
      request.user.id,
      id,
    );
  }
}