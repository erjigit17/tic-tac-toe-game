import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionEntity } from './entities/session.entity';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { RoundEntity } from './entities/roundEntity';

@Injectable()
export class TicTacToeService {
  constructor(
    @InjectRepository(SessionEntity) private readonly sessionRepository: Repository<SessionEntity>,
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoundEntity) private readonly roundRepository: Repository<RoundEntity>,
  ) {}
  private board: string[][] = [
    ['', '', ''],
    ['', '', ''],
    ['', '', '']
  ];
  private playerX: string = 'X';
  private playerO: string = 'O';
  private gamer = this.playerX;

  async createNewGame(roundId: string): Promise<{ winnerId: any; draw: boolean }> {
    this.resetBoard();
    const round = await this.roundRepository.findOne({ where: { id: roundId }, relations: ['session', 'session.users'] });
    if (!round) { throw new Error('Round not found')}
    if (round.session.users.length !== 2) { throw new Error('Session should have 2 gamers')}

    const gamers = round.session.users;
    const gamer1Id = round.whoWillStart;
    const [gamer2] = gamers.filter(gamer => gamer.id !== gamer1Id);
    const gamer2Id = gamer2.id;

    const gameSummary = await this.runGame();
    let winnerId;
    if (gameSummary?.winner) {
      winnerId = gameSummary.winner === this.playerX ? gamer1Id : gamer2Id;
    }
    const draw = gameSummary?.draw;

    return { draw, winnerId };
  }

  async runGame(): Promise<{ winner?: string, draw: boolean }> {
    let gameIsOver = false;
    const gameSummary = {
      winner: undefined,
      draw: false,
    }
    while (!gameIsOver) {
      let empty = this.emptyCells();
      if (empty.length === 0) {
        gameIsOver = true;
        gameSummary.draw = true;
      } else {
        let cell = this.randomEmptyCell(empty);
        if (cell) {
          let { row, col } = this.numToRowCol(cell);
          this.play(row, col);
          if (this.checkWinner()) {
            gameIsOver = true;
            gameSummary.winner = this.gamer;
          }
        }
      }
    }

    return gameSummary;
  }

  public play(row: number, col: number): boolean {
    if (this.board[row][col] === '') {
      this.board[row][col] = this.gamer;
      // change gamer
      this.gamer = this.gamer === this.playerX ? this.playerO : this.playerX;
      return true;
    }
    return false;
  }


  checkWinner(): boolean {
    // check rows
    for (let i = 0; i < 3; i++) {
      if (this.board[i][0] === this.board[i][1] && this.board[i][1] === this.board[i][2] && this.board[i][0] !== '') {
        return true;
      }
    }
    // check columns
    for (let i = 0; i < 3; i++) {
      if (this.board[0][i] === this.board[1][i] && this.board[1][i] === this.board[2][i] && this.board[0][i] !== '') {
        return true;
      }
    }
    // check diagonals
    if (this.board[0][0] === this.board[1][1] && this.board[1][1] === this.board[2][2] && this.board[0][0] !== '') {
      return true;
    }
    return this.board[0][2] === this.board[1][1] && this.board[1][1] === this.board[2][0] && this.board[0][2] !== '';

  }

  emptyCells(): number[] {
    let empty = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (this.board[i][j] === '') {
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

  // reset board
  resetBoard(): void {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        this.board[i][j] = '';
      }
    }
  }

  randomEmptyCell(arr: number[]): number | undefined {
    let randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
  }
}
