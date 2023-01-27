import { Logger, OnModuleInit } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';

/* исключение, так как переменная нунжна до иньекции configService */
import { config } from 'dotenv';
import { TicTacToeService } from './tic-tac-toe.service';
import { AppService } from './app.service';
config();
const WS_PORT = +process.env.WS_PORT || 5555;

@WebSocketGateway(WS_PORT)
export class WsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  constructor(
    private readonly appService: AppService,
    private readonly ticTacToeService: TicTacToeService,

  ) {}

  async onModuleInit() {
    Logger.log(`WS_PORT ${WS_PORT}`);
  }

  public async handleConnection(client: Socket) {
    const clientId = client.id;
    Logger.log(`Client connected: ${clientId}`);
    await this.appService.createUser(clientId);
    await this.appService.addUsersToSession(clientId);
  }

  // TODO: add handlers for client events move, surrender, message


  public handleDisconnect(client: Socket) {
    Logger.log(`Client disconnected: ${client.id}`);
    // TODO: lose session
  }
}
