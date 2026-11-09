import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkProgramsModule } from './work-programs/work-programs.module';
import { DocumentsModule } from './documents/documents.module';
import { ProgressReportsModule } from './progress-reports/progress-reports.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { BudgetsModule } from './budgets/budgets.module';
import { KasModule } from './kas/kas.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExportsModule } from './exports/exports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    WorkProgramsModule,
    DocumentsModule,
    ProgressReportsModule,
    EvaluationsModule,
    BudgetsModule,
    KasModule,
    NotificationsModule,
    DashboardModule,
    ExportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
