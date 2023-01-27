import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionEntity } from './entities/session.entity';
import { LessThan, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(SessionEntity) private readonly sessionRepository: Repository<SessionEntity>,
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
  ) {}

  async createUser(id: string) {
    // const user = new UserEntity();
    // user.id = id;
    // user.session = { id: sessionId };
    await this.userRepository.save({ id });
  }

  async addUsersToSession(gamerId: string) {
    // find session with less than 2 gamers, if not found create new session
    const session = await this.sessionRepository.findOne({ where: { gamersCount: LessThan(2) } });
    if (session) {
      await this.userRepository.update({ id: gamerId }, { session });
      await this.sessionRepository.update({ id: session.id }, { gamersCount: session.gamersCount + 1 });

      if (session.gamersCount === 1) { // start game if session has 2 gamers
        await this.startGameSession(session.id);
      }

    } else {
      const session = new SessionEntity();
      await this.sessionRepository.save(session);
      await this.addUsersToSession(gamerId);
    }
  }

  async startGameSession(sessionId: string) {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId }, relations: ['users'] });

    session.whoseTurn = Math.random() > 0.5 ? session.users[0].id : session.users[1].id;
    await this.sessionRepository.save(session);
  }

  async getHello() {
    await this.createUser('1');
    await this.addUsersToSession('1');
    await this.createUser('2');
    await this.addUsersToSession('2');

    return await this.sessionRepository.find({ relations: ['users'] });
  }
}
