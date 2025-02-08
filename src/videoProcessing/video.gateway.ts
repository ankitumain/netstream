/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'client-id'],
  },
  transports: ['websocket', 'polling'], // Ensure compatibility with all clients
  allowEIO3: true, // Support older clients
})
export class VideoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: any) {
    console.log(`✅ Client connected: ${client.id}`);
    client.emit('connected', { message: 'Connected to WebSocket server' });
  }

  handleDisconnect(client: any) {
    console.log(`❌ Client disconnected: ${client.id}`);
  }

  sendProgress(clientId: string, update: any) {
    this.server.to(clientId).emit('uploadProgress', update);
  }
}
