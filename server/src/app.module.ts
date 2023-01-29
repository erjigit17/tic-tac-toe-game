import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionEntity } from './entities/session.entity';
import { UserEntity } from './entities/user.entity';
import { RoundEntity } from './entities/roundEntity';
import { WsGateway } from './ws.gateway';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      dropSchema: true,
      entities: [SessionEntity, UserEntity, RoundEntity],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([SessionEntity, UserEntity, RoundEntity]),
  ],
  controllers: [AppController],
  providers: [AppService, WsGateway],
})
export class AppModule {}
