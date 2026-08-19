import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { JobsModule } from './jobs/jobs.module';
import { ApplicationsModule } from './applications/applications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', '12345678'),
        database: configService.get<string>('DB_DATABASE', 'trabajos_db'),
        autoLoadEntities: true,
        synchronize:
          configService.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
      }),
    }),

    UsersModule,
    AuthModule,
    CategoriesModule,
    JobsModule,
    ApplicationsModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
