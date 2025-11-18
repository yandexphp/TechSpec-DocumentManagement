import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BroadcastEventType } from '../../../entities/broadcast/model/types';

vi.unmock('../broadcast.service');

const { mockPostMessage, MockBroadcastChannel } = vi.hoisted(() => {
  const mockPostMessage = vi.fn();
  const mockAddEventListener = vi.fn();
  const mockRemoveEventListener = vi.fn();

  class MockBroadcastChannel {
    postMessage = mockPostMessage;
    addEventListener = mockAddEventListener;
    removeEventListener = mockRemoveEventListener;
  }

  return { mockPostMessage, MockBroadcastChannel };
});

vi.mock('broadcast-channel', () => ({
  BroadcastChannel: MockBroadcastChannel,
}));

import { broadcastService } from '../broadcast.service';

describe('BroadcastService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should broadcast message', () => {
    mockPostMessage.mockClear();

    broadcastService.broadcast(BroadcastEventType.AUTH_LOGIN);

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: BroadcastEventType.AUTH_LOGIN,
      data: undefined,
    });
  });

  it('should subscribe to events', () => {
    const callback = vi.fn();
    const unsubscribe = broadcastService.subscribe(BroadcastEventType.AUTH_LOGIN, callback);

    expect(unsubscribe).toBeDefined();
    unsubscribe();
  });
});
