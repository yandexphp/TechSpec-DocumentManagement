import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Socket } from 'socket.io';

import { WebSocketGateway } from '../websocket.gateway';

describe('WebSocketGateway', () => {
  let gateway: WebSocketGateway;
  let mockServer: {
    to: jest.Mock;
    emit: jest.Mock;
  };
  let mockSocket: Partial<Socket>;
  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:5173'),
  };
  beforeEach(async () => {
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    mockSocket = {
      id: 'socket-123',
      handshake: {
        headers: {},
        time: new Date().toISOString(),
        address: '127.0.0.1',
        xdomain: false,
        secure: false,
        issued: Date.now(),
        url: '/',
        query: {},
        auth: {
          userId: 'user-123',
        },
      },
      disconnect: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSocketGateway,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();
    gateway = module.get<WebSocketGateway>(WebSocketGateway);
    gateway.server = mockServer as never;
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('handleConnection', () => {
    it('should accept connection with userId', () => {
      gateway.handleConnection(mockSocket as Socket);
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });
    it('should disconnect client without userId', () => {
      const socketWithoutAuth = {
        ...mockSocket,
        handshake: {
          ...mockSocket.handshake,
          auth: {},
        },
      };
      gateway.handleConnection(socketWithoutAuth as Socket);
      expect(socketWithoutAuth.disconnect).toHaveBeenCalled();
    });
  });
  describe('handleDisconnect', () => {
    it('should remove socket from userSockets', () => {
      const document = {
        id: 'doc-123',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: BigInt(1024),
        filePath: 'path/to/file',
        fileURL: 'http://example.com/file.pdf',
        isPrivate: false,
        createdAt: new Date(),
        deletedAt: null,
        userId: 'user-123',
      };
      gateway.handleConnection(mockSocket as Socket);
      gateway.notifyDocumentUploaded('user-123', document);
      expect(mockServer.emit).toHaveBeenCalledTimes(1);
      jest.clearAllMocks();
      gateway.handleDisconnect(mockSocket as Socket);
      gateway.notifyDocumentUploaded('user-123', document);
      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });
  describe('notifyDocumentUploaded', () => {
    it('should emit document:uploaded event to user sockets', () => {
      const document = {
        id: 'doc-123',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: BigInt(1024),
        filePath: 'path/to/file',
        fileURL: 'http://example.com/file.pdf',
        isPrivate: false,
        createdAt: new Date(),
        deletedAt: null,
        userId: 'user-123',
      };
      gateway.handleConnection(mockSocket as Socket);
      gateway.notifyDocumentUploaded('user-123', document);
      expect(mockServer.to).toHaveBeenCalledWith(['socket-123']);
      expect(mockServer.emit).toHaveBeenCalledWith('document:uploaded', {
        document: {
          ...document,
          size: 1024,
        },
      });
    });
    it('should not emit if user has no sockets', () => {
      const document = {
        id: 'doc-123',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: BigInt(1024),
        filePath: 'path/to/file',
        fileURL: 'http://example.com/file.pdf',
        isPrivate: false,
        createdAt: new Date(),
        deletedAt: null,
        userId: 'user-123',
      };
      gateway.notifyDocumentUploaded('user-123', document);
      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });
  describe('handlePing', () => {
    it('should return pong', () => {
      const result = gateway.handlePing(mockSocket as Socket);
      expect(result).toEqual({ event: 'pong', data: 'pong' });
    });
  });
});
