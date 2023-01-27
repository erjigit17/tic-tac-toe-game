import { Logger, OnModuleInit } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';

/* исключение, так как переменная нунжна до иньекции configService */
import { config } from 'dotenv';
config();
const WS_PORT = +process.env.WS_PORT || 5555;

@WebSocketGateway(WS_PORT)
export class WsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  constructor(
  ) {}

  async onModuleInit() {
    Logger.log(`WS_PORT ${WS_PORT}`);
  }

  public async handleConnection(client: Socket) {
    const clientId = client.id;
    Logger.log(`Client connected: ${clientId}`);
  }

  public handleDisconnect(client: Socket) {}
}
