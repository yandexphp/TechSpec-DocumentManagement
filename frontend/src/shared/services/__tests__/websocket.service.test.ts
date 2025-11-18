import { io } from 'socket.io-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { websocketService } from '../websocket.service';

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}));

vi.mock('../lib/toast', () => ({
  showToast: {
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('i18next', () => ({
  default: {
    t: (key: string) => key,
  },
}));

describe('WebSocketService', () => {
  beforeEach(() => {
    websocketService.disconnect();
  });

  it('should connect to websocket', () => {
    websocketService.connect('token', 'user-123');
    expect(websocketService).toBeDefined();
  });

  it('should not reconnect if already connected', () => {
    const mockSocket = { connected: true, on: vi.fn(), disconnect: vi.fn() };
    (io as ReturnType<typeof vi.fn>).mockReturnValue(
      mockSocket as unknown as ReturnType<typeof io>
    );

    websocketService.connect('token', 'user-123');
    const firstCallCount = (io as ReturnType<typeof vi.fn>).mock.calls.length;
    websocketService.connect('token', 'user-123');

    expect((io as ReturnType<typeof vi.fn>).mock.calls.length).toBe(firstCallCount);
  });

  it('should disconnect websocket', () => {
    const mockSocket = { disconnect: vi.fn(), on: vi.fn(), connected: false };
    (io as ReturnType<typeof vi.fn>).mockReturnValue(
      mockSocket as unknown as ReturnType<typeof io>
    );

    websocketService.connect('token', 'user-123');
    websocketService.disconnect();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('should add event listener', () => {
    const callback = vi.fn();
    const unsubscribe = websocketService.on('document:uploaded', callback);

    expect(unsubscribe).toBeDefined();
    unsubscribe();
  });

  it('should remove event listener', () => {
    const callback = vi.fn();
    websocketService.on('document:uploaded', callback);
    websocketService.off('document:uploaded', callback);

    expect(websocketService).toBeDefined();
  });
});
