import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { Application } from '../applications/entities/application.entity';
import { Job } from '../jobs/entities/job.entity';

import { Match } from './entities/match.entity';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Match,
      Application,
      Job,
    ]),
    AuthModule,
  ],

  controllers: [MatchesController],

  providers: [MatchesService],

  exports: [MatchesService],
})
export class MatchesModule {}