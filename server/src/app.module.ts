import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionEntity } from './entities/session.entity';
import { UserEntity } from './entities/user.entity';


@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      dropSchema: true,
      entities: [SessionEntity, UserEntity],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([SessionEntity, UserEntity]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
