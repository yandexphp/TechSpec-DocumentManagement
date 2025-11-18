import { BroadcastChannel } from 'broadcast-channel';

import type { BroadcastEventType } from '../../entities/broadcast/model/types';
import type { BroadcastPayload } from '../types/broadcast-payload';

interface BroadcastMessage {
  type: BroadcastEventType;
  data?: BroadcastPayload;
}

class BroadcastService {
  private channel: BroadcastChannel<BroadcastMessage>;

  constructor() {
    this.channel = new BroadcastChannel('app-channel');
  }

  broadcast(type: BroadcastEventType, data?: BroadcastPayload): void {
    this.channel.postMessage({ type, data });
  }

  subscribe<T extends BroadcastEventType>(
    type: T,
    callback: (data?: BroadcastPayload) => void
  ): () => void {
    const handler = (message: BroadcastMessage) => {
      if (message.type === type) {
        callback(message.data);
      }
    };

    this.channel.addEventListener('message', handler);

    return () => {
      this.channel.removeEventListener('message', handler);
    };
  }
}

export const broadcastService = new BroadcastService();
