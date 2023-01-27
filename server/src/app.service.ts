import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionEntity } from './entities/session.entity';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { RoundEntity } from './entities/roundEntity';
import { TicTacToeService } from './tic-tac-toe.service';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(SessionEntity) private readonly sessionRepository: Repository<SessionEntity>,
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoundEntity) private readonly roundRepository: Repository<RoundEntity>,
    private readonly ticTacToeService: TicTacToeService,
  ) {}

  async createUser(id: string) {
    await this.userRepository.save({ id });
  }

  async addUsersToSession(gamerId: string) {
    const session = await this.sessionRepository.findOne({ where: { isWaitingSecondGamer: true } });
    if (session) {
      await this.userRepository.update({ id: gamerId }, { session });
      await this.sessionRepository.update({ id: session.id }, { isWaitingSecondGamer: false });

      await this.startGameSession(session.id);
    } else {
      const session = new SessionEntity();
      const newSession = await this.sessionRepository.save(session);
      await this.userRepository.update({ id: gamerId }, { session: newSession });
    }
  }

  async startGameSession(sessionId: string) {
    let sessionWinner = null;
    const session = await this.sessionRepository.findOne({ where: { id: sessionId }, relations: ['users'] });

    if (!session) { throw new Error('Session not found')}
    if (session.users.length !== 2) { throw new Error('Session should have 2 gamers')}

    while (!sessionWinner) {
      await this.createNewRound(sessionId);
      sessionWinner = await this.checkSessionWinner(sessionId);
    }
    await this.sessionRepository.update({ id: sessionId }, { winner: sessionWinner });
  }

  // check if session has winner, three wins in a row or 10 wins
  async checkSessionWinner(sessionId: string) {
    // get all rounds for session and sort by createdAt
    const rounds = await this.roundRepository.find({
      where: {
        session: { id: sessionId },
      },
      order: { createdAt: 'ASC' }
    });
    const sessionWinners = rounds
      .filter(round => round.draw === false)
      .map(round => round.winnerId);

    // if one of the gamers has 3 wins in last 3 rounds, he is winner
    const lastThreeWinners = sessionWinners.slice(-3);
    if (lastThreeWinners[0] === lastThreeWinners[1] && lastThreeWinners[1] === lastThreeWinners[2]) {
      return lastThreeWinners[0];
    }

    // if one of sessionWinners the gamers has 10 wins, he is winner
    const [gamer1, gamer2] = [...new Set(sessionWinners)];
    if (sessionWinners.filter(winner => winner === gamer1).length === 10) {
      return gamer1;
    } else if (sessionWinners.filter(winner => winner === gamer2).length === 10) {
      return gamer2;
    }
  }


  async createNewRound(sessionId: string) {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId }, relations: ['users'] });
    if (!session) {throw new Error('Session not found')}
    if (session.users.length !== 2) { throw new Error('Session should have 2 gamers')}

    const round = new RoundEntity();
    round.session = session;
    round.whoWillStart = Math.random() >= 0.5 ? session.users[0].id : session.users[1].id;
    await this.roundRepository.save(round);

    const { draw, winnerId } = await this.ticTacToeService.createNewGame(round.id);
    await this.roundRepository.update({ id: round.id }, { draw, winnerId });
  }

  async getHello() {
    await this.createUser('1');
    await this.addUsersToSession('1');
    await this.createUser('2');
    await this.addUsersToSession('2');

    return await this.sessionRepository.find({ relations: ['users'] });
  }
}
