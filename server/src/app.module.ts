import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionEntity } from './entities/session.entity';


@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      dropSchema: true,
      entities: [SessionEntity],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([SessionEntity]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
