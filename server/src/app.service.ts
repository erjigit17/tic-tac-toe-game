import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionEntity } from './entities/session.entity';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { RoundEntity } from './entities/roundEntity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(SessionEntity) private readonly sessionRepository: Repository<SessionEntity>,
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoundEntity) private readonly roundRepository: Repository<RoundEntity>,
  ) {}

  async createUser(id: string): Promise<string> {
    const user = new UserEntity();
    user.id = id;
    await this.userRepository.save(user);
    return user.id;
  }

  async addUsersToSession(gamerId: string): Promise<string> {
    const session = await this.sessionRepository.findOne({ where: { isWaitingSecondGamer: true } });
    if (session) {
      await this.userRepository.update({ id: gamerId }, { session });
      await this.sessionRepository.update({ id: session.id }, { isWaitingSecondGamer: false });
      await this.startGameSession(session.id);
      return session.id
    } else {
      const session = new SessionEntity();
      const newSession = await this.sessionRepository.save(session);
      await this.userRepository.update({ id: gamerId }, { session: newSession });
      return newSession.id;
    }
  }

  async startGameSession(sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId }, relations: ['users'] });

    if (!session) { throw new Error('Session not found')}
    if (session.users.length !== 2) { throw new Error('Session should have 2 gamers')}

    await this.createNewRound(sessionId);
  }

  // check if session has winner, three wins in a row or 10 wins
  async checkSessionWinner(sessionId: string): Promise<void> {
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
      await this.closeGameSession(sessionId, lastThreeWinners[0]);
    }

    // if one of sessionWinners the gamers has 10 wins, he is winner
    const [gamer1, gamer2] = [...new Set(sessionWinners)];
    if (sessionWinners.filter(winner => winner === gamer1).length === 10) {
      await this.closeGameSession(sessionId, gamer1);
    } else if (sessionWinners.filter(winner => winner === gamer2).length === 10) {
      await this.closeGameSession(sessionId, gamer2);
    }

    await this.createNewRound(sessionId);
  }

  async closeGameSession(sessionId: string, sessionWinner: string): Promise<void> {
    console.log('sessionWinner', sessionWinner);
    await this.sessionRepository.update({ id: sessionId }, { winner: sessionWinner });
  }

  // exit from session and lose session
  async exitFromSession(gamerId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: gamerId }, relations: ['session', 'session.rounds'] });
    if (!user) { throw new Error('User not found')}
    if (!user.session) { throw new Error('User is not in session')}
    if (user.session.winner) {
      console.log('Session is already finished');
      return;
    }
    const anotherGamer = await this.userRepository.findOne({ where: { session: { id: user.session.id } } });
    await this.closeGameSession(user.session.id, anotherGamer.id);
    // find dont finished round and finish it
    const round = user.session.rounds.find(round => !round.winnerId);
    if (round) {
      await this.finishRound(round.id, anotherGamer.id);
    }
  }

  async createNewRound(sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId }, relations: ['users'] });
    if (!session) {throw new Error('Session not found')}
    if (session.users.length !== 2) { throw new Error('Session should have 2 gamers')}
    let board: string[][] = [
      ['', '', ''],
      ['', '', ''],
      ['', '', '']
    ];
    let gamer: 'X'|'O' = 'X';

    const round = new RoundEntity();
    round.session = session;
    round.firstGamerId = Math.random() >= 0.5 ? session.users[0].id : session.users[1].id;
    round.secondGamerId = round.firstGamerId === session.users[0].id ? session.users[1].id : session.users[0].id;
    round.board = JSON.stringify(board);
    round.gamer = gamer;
    round.expiration = new Date(new Date().getTime() + 15_000)

    await this.roundRepository.save(round);
  }

  async action(gamerId: string, roundId: string, n: 1|2|3|4|5|6|7|8|9): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: gamerId }, relations: ['session', 'session.rounds'] });
    if (!user) { throw new Error('User not found')}
    const round = user.session.rounds.find(round => round.id === roundId);
    if (!round) { throw new Error('Round not found')}
    const board = JSON.parse(round.board);
    let gamer = round.gamer;
    if (gamer !== 'X' && gamer !== 'O') { throw new Error('Gamer should be X or O')}
    const gamer1Id = round.firstGamerId;
    const gamer2Id = round.secondGamerId;

    if (gamer === 'X' && gamerId !== gamer1Id) {
      throw new Error('Not your turn');
    }
    if (gamer === 'O' && gamerId !== gamer2Id) {
      throw new Error('Not your turn');
    }
    const emptyCells = this.emptyCells(board);
    if (!emptyCells.includes(n)) {
      throw new Error('Not valid turn');
    }
    let { row, col } = this.numToRowCol(n);

    board[row][col] = gamer;

    if (this.checkWinner(board)) {
      const winnerId = gamer === 'X' ? gamer1Id : gamer2Id;
      await this.finishRound(roundId, winnerId);
      return;
    }
    if (emptyCells.length === 1) {
      await this.finishRound(roundId, null, true);
      return;
    }
    gamer = gamer === 'X' ? 'O' : 'X';
    // save round
    round.board = JSON.stringify(board);
    round.gamer = gamer;
    round.expiration = new Date(new Date().getTime() + 15_000);
    await this.roundRepository.save(round);
  }


  printBoard(board: string[][]): void {
    const $ = (x: string) => x === '' ? ' ' : x;
    for (let i = 0; i < 3; i++) {
      console.log(`| ${$(board[i][0])} | ${$(board[i][1])} | ${$(board[i][2])} |`);
    }
    console.log('-------------');
  }

  public play(row: number, col: number, board: string[][], gamer: 'X'|'O'): boolean {
    if (board[row][col] === '') {
      board[row][col] = gamer;
      return true;
    }
    return false;
  }


  checkWinner(board: string[][]): boolean {
    // check rows
    for (let i = 0; i < 3; i++) {
      if (board[i][0] === board[i][1] && board[i][1] === board[i][2] && board[i][0] !== '') {
        console.log(`column ${i}0 ${i}1 ${i}2`);
        return true;
      }
    }
    // check columns
    for (let i = 0; i < 3; i++) {
      if (board[0][i] === board[1][i] && board[1][i] === board[2][i] && board[0][i] !== '') {
        console.log(`column 0${i} 1${i} 2${i}`);
        return true;
      }
    }
    // check diagonals
    if (board[0][0] === board[1][1] && board[1][1] === board[2][2] && board[0][0] !== '') {
      console.log('diagonal 00 11 22');
      return true;
    }
    if (board[0][2] === board[1][1] && board[1][1] === board[2][0] && board[0][2] !== ''){
      console.log('diagonal 02 11 20');
      return true;
    }
  }

  emptyCells(board: string[][]): number[] {
    let empty = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[i][j] === '') {
          empty.push(i * 3 + j + 1);
        }
      }
    }
    return empty;
  }

  numToRowCol(num: number): { row: number; col: number } {
    num -= 1;
    let row = Math.floor(num / 3);
    let col = num % 3;
    return { row, col };
  }


  async finishRound(roundId: string, winnerId?: string, draw?: boolean): Promise<void> {
    const round = await this.roundRepository.findOne({ where: { id: roundId }, relations: ['session'] });
    if (!round) { throw new Error('Round not found')}
    const sessionId = round.session.id;

    await this.roundRepository
      .createQueryBuilder('round')
      .update(RoundEntity)
      .set({ winnerId, draw, isFinished: true })
      .where('id = :id', { id: roundId })
      // .returning('sessionId')
      .execute();

    // OUTPUT or RETURNING clause only supported by Microsoft SQL Server or PostgreSQL or MariaDB databases.
    // const sessionId = round.raw[0].sessionId;

    await this.checkSessionWinner(sessionId);
  }

  async surrenderRound(gamerId: string, roundId: string): Promise<void> {
    const round = await this.roundRepository.findOne({ where: { id: roundId }, relations: ['session'] });
    if (!round) { throw new Error('Round not found')}
    if (round.winnerId) { throw new Error('Round is already finished')}
    if (round.firstGamerId !== gamerId && round.secondGamerId !== gamerId) { throw new Error('Gamer is not in this round')}
    const {firstGamerId, secondGamerId} = round;
    const winnerId = firstGamerId === gamerId ? secondGamerId : firstGamerId;

    await this.finishRound(round.id, winnerId);

    await this.checkSessionWinner(round.session.id);
  }

  async getStatus(userId: string) {
    const score: string[] = []
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['session', 'session.rounds', 'session.users'] });
    if (!user) { throw new Error('User not found')}
    if (!user.session) { throw new Error('User is not in session')}
    // if user single player send 'please wait for opponent'
    if (user.session.users.length === 1) {
      return { status: 'waiting for opponent'};
    }
    if (user.session.rounds.length === 0) {
      return { status: 'waiting for starting round'};
    }

    // fil score array with winner id for each round or 'draw' if round is draw
    user.session.rounds.forEach(round => {
      if (round.draw) {
        score.push('draw');
      } else {
        score.push(round.winnerId);
      }
    });

    let currentRound = null;
    if (!user.session.winner) {
      currentRound = user.session.rounds.find(round => !round.winnerId);
    }
    return { score, currentRound }
  }

  async getOpponentId(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['session', 'session.users'] });
    if (!user) { throw new Error('User not found')}
    if (!user.session) { throw new Error('User is not in session')}
    return user.session.users.find(gamer => gamer.id !== userId).id;
  }

  async getGameSessions(): Promise<SessionEntity[]> {
    return await this.sessionRepository.find({ relations: ['users', 'rounds'] });
  }
}
