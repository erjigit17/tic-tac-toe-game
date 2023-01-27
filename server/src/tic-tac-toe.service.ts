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

  async createNewGame(roundId: string): Promise<{ winnerId: any; draw: boolean }> {
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
      winnerId = gameSummary.winner === 'X' ? gamer1Id : gamer2Id;
    }
    const draw = gameSummary?.draw;

    return { draw, winnerId };
  }

  async runGame(): Promise<{ winner?: string, draw: boolean }> {
    let board: string[][] = [
      ['', '', ''],
      ['', '', ''],
      ['', '', '']
    ];
    let gamer: 'X'|'O' = 'X'
    let gameIsOver = false;
    const gameSummary = {
      winner: undefined,
      draw: false,
    }
    while (!gameIsOver) {
      this.printBoard(board);
      let empty = this.emptyCells(board);
      if (empty.length === 0) {
        gameIsOver = true;
        gameSummary.draw = true;
        this.printBoard(board);
        console.log('Draw!');
      } else {
        let cell = this.randomEmptyCell(empty);
        if (cell) {
          let { row, col } = this.numToRowCol(cell);
          this.play(row, col, board, gamer);
          if (this.checkWinner(board)) {
            gameIsOver = true;
            gameSummary.winner = gamer;
            this.printBoard(board);
            console.log(`Winner is ${gamer}`);
          }
          gamer = gamer === 'X' ? 'O' : 'X';
        }
      }
    }
    return gameSummary;
  }

  printBoard(board: string[][]): void {
    const $ = (x: string) => x === '' ? ' ' : x;
    for (let i = 0; i < 3; i++) {
      console.log(`| ${$(board[i][0])} | ${$(board[i][1])} | ${$(board[i][2])} |`);
    }
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

  randomEmptyCell(arr: number[]): number | undefined {
    let randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
  }
}
