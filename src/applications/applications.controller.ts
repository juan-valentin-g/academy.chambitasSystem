import {
  Body,
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
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';

interface AuthenticatedRequest extends Request {
  user: User;
}

@UseGuards(JwtAuthGuard)
@Controller()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get('applications/my')
  findMine(@RequestDecorator() request: AuthenticatedRequest) {
    return this.applicationsService.findMine(request.user.id);
  }

  @Post('jobs/:jobId/applications')
  create(
    @RequestDecorator() request: AuthenticatedRequest,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Body() createApplicationDto: CreateApplicationDto,
  ) {
    return this.applicationsService.create(
      request.user.id,
      jobId,
      createApplicationDto,
    );
  }

  @Get('jobs/:jobId/applications')
  findByJob(
    @RequestDecorator() request: AuthenticatedRequest,
    @Param('jobId', ParseIntPipe) jobId: number,
  ) {
    return this.applicationsService.findByJob(request.user.id, jobId);
  }

  @Patch('applications/:id/accept')
  accept(
    @RequestDecorator() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.applicationsService.accept(request.user.id, id);
  }

  @Patch('applications/:id/reject')
  reject(
    @RequestDecorator() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.applicationsService.reject(request.user.id, id);
  }
}
