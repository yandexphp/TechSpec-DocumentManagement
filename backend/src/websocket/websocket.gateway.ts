import { Injectable, Logger } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway as WebSocketGatewayDecorator,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Document } from '@prisma/client';
import type { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGatewayDecorator({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WebSocketGateway.name);
  @WebSocketServer()
  server: Server;
  private readonly userSockets = new Map<string, Set<string>>();
  handleConnection(client: Socket) {
    const userId = client.handshake.auth?.userId;
    if (!userId) {
      this.logger.warn(`Client ${client.id} connected without userId`);
      client.disconnect();
      return;
    }
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)?.add(client.id);
    this.logger.log(`Client ${client.id} connected for user ${userId}`);
  }
  handleDisconnect(client: Socket) {
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
        this.logger.log(`Client ${client.id} disconnected for user ${userId}`);
        break;
      }
    }
  }
  notifyDocumentUploaded(userId: string, document: Document) {
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.size > 0) {
      this.server.to(Array.from(sockets)).emit('document:uploaded', {
        document: {
          ...document,
          size: Number(document.size),
        },
      });
      this.logger.log(`Notified user ${userId} about document ${document.id} upload`);
    }
  }
  @SubscribeMessage('ping')
  handlePing(_client: Socket) {
    return { event: 'pong', data: 'pong' };
  }
}
