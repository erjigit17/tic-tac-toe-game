import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionEntity } from './entities/session.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(SessionEntity) private readonly sessionRepository: Repository<SessionEntity>,
  ) {}

  async createGameSession(firstGamerId: string) {
    const session = new SessionEntity();
    session.firstGamerId = firstGamerId;
    await this.sessionRepository.save(session);
  }

  async startGameSession(sessionId: string, secondGamerId: string) {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId }});
    session.secondGamerId = secondGamerId;
    session.whoseTurn = Math.random() > 0.5 ? 1 : 2;
    await this.sessionRepository.save(session);
  }

  async getHello() {
    await this.createGameSession('1');
    const session = await this.sessionRepository.findOne({ where: { firstGamerId: '1' }});
    await this.startGameSession(session.id, '2');
    return await this.sessionRepository.find();
  }
}
