import { Logger, OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect, SubscribeMessage,
  WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { config } from 'dotenv';
import { AppService } from './app.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { RoundEntity } from './entities/roundEntity';
import { Repository } from 'typeorm';

/* исключение, так как переменная нунжна до иньекции configService */
config();
const WS_PORT = +process.env.WS_PORT || 5555;

@WebSocketGateway(WS_PORT)
export class WsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  constructor(
    private readonly appService: AppService,
    @InjectRepository(RoundEntity) private readonly roundRepository: Repository<RoundEntity>,
  ) {}

  // server
  @WebSocketServer()
  server: Server;

  async onModuleInit() {
    Logger.log(`WS_PORT ${WS_PORT}`);
  }

  public async handleConnection(client: Socket) {
    const clientId = client.id;
    Logger.log(`Client connected: ${clientId}`);
    const userId = await this.appService.createUser(clientId)
    await this.emitToClient(clientId, 'init', {message: `user created`, userId});
    await this.appService.addUsersToSession(clientId);
  }

  @SubscribeMessage('move')
  async onMove(
    @MessageBody() body: {roundId: string, to: 1|2|3|4|5|6|7|8|9},
    @ConnectedSocket() client: Socket): Promise<void> {
    const move = body;
    const clientId = client.id;
    await this.appService.action(clientId, move.roundId, move.to);
    const status = await this.appService.getStatus(clientId);
    await this.emitToClient(clientId, 'status', status);
  }

  @SubscribeMessage('surrender')
  async onSurrender(
    @MessageBody() payload: {roundId: string},
    @ConnectedSocket() client: Socket): Promise<void> {
    const { roundId } = payload;
    const clientId = client.id;
    await this.appService.surrenderRound(clientId, roundId);
  }

  @SubscribeMessage('exit')
  async onExit(
    @MessageBody() payload: string,
    @ConnectedSocket() client: Socket): Promise<void> {
    Logger.log(`exit event from client: ${client.id}`);
    await this.appService.exitFromSession(client.id);
  }

  public async handleDisconnect(client: Socket) {
    Logger.log(`Client disconnected: ${client.id}`);
    // await this.appService.exitFromSession(client.id);
  }

  @SubscribeMessage('message')
  async onMessage(
    @MessageBody() message: string,
    @ConnectedSocket() client: Socket): Promise<void> {
    const clientId = client.id;
    const opponentId = await this.appService.getOpponentId(clientId);
    if (opponentId) {
      await this.emitToClient(opponentId, 'message', message);
    }
  }

  @SubscribeMessage('get_status')
  async onGetStatus(
    @MessageBody() payload: string,
    @ConnectedSocket() client: Socket): Promise<void> {
    const clientId = client.id;
    console.log('get_status from', client.id);
    const status = await this.appService.getStatus(clientId);
    await this.emitToClient(clientId, 'status', status);
  }

  async emitToClient(clientId: string, event: string, data: any) {
    this.server.to(clientId).emit(event, data);
  }

  @Cron(CronExpression.EVERY_SECOND)
  async handleCron() {
    // check rounds for expired, if date more then now
    const activeRounds = await this.roundRepository
      .createQueryBuilder("round")
      .where("round.isFinished = :isFinished", { isFinished: false })
      .andWhere("round.expiration > :currentTime", { currentTime: new Date() })
      // sql lite not support date
      .getMany();


    if (activeRounds.length) {
      // use surrenderRound method and emit to client 'round_expired you lose' or 'round_expired you win'
      for (const round of activeRounds) {
        const {firstGamerId, secondGamerId} = round;
        const status = await this.appService.getStatus(firstGamerId);


        await this.emitToClient(firstGamerId, 'status', status);
        await this.emitToClient(secondGamerId, 'status', status);
        // define is round expired
        const isExpired = new Date(round.expiration) < new Date();
        if (isExpired) {
          // define who is loser by round.gamer and round.firstGamerId (gamer == 'X') round.secondGamerId (gamer == 'O')
          const loserId = round.gamer === 'X' ? round.firstGamerId : round.secondGamerId;
          const winnerId = round.gamer === 'X' ? round.secondGamerId : round.firstGamerId;
          await this.appService.surrenderRound(loserId, round.id);
          await this.emitToClient(winnerId, 'message', 'Time is up, you win');
          await this.emitToClient(loserId, 'message', 'Time is up, you lose');
        }
      }
    }
  }
}
