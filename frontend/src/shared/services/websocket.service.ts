import i18n from 'i18next';
import { io, type Socket } from 'socket.io-client';

import { WS_URL } from '../config/constants';
import { showToast } from '../lib/toast';
import type { TNullable } from '../types/nullable';
import type {
  DocumentDeletedEvent,
  DocumentUploadedEvent,
  WebSocketEventType,
} from '../types/websocket';

class WebSocketService {
  private socket: TNullable<Socket> = null;
  private listeners: Map<
    WebSocketEventType,
    Set<(data: DocumentUploadedEvent | DocumentDeletedEvent) => void>
  > = new Map();

  connect(_token: string, userId: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(WS_URL, {
      auth: {
        userId,
      },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {});

    this.socket.on('disconnect', () => {
      showToast.warning(i18n.t('WebSocket отключен'), { autoClose: 3000 });
    });

    this.socket.on('document:uploaded', (data: DocumentUploadedEvent) => {
      const documentName = data.document?.originalName || i18n.t('Документ');
      const message = i18n.t('Документ "{{name}}" успешно загружен через WebSocket', {
        name: documentName,
      });
      showToast.success(message, {
        autoClose: 4000,
      });

      const listeners = this.listeners.get('document:uploaded');
      if (listeners) {
        listeners.forEach((listener) => {
          listener(data);
        });
      }
    });

    this.socket.on('document:deleted', (data: DocumentDeletedEvent) => {
      const documentName = data.documentName || i18n.t('Документ');
      const message = i18n.t('Документ "{{name}}" удален через WebSocket', { name: documentName });
      showToast.info(message, {
        autoClose: 3000,
      });

      const listeners = this.listeners.get('document:deleted');
      if (listeners) {
        listeners.forEach((listener) => {
          listener(data);
        });
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  on<T extends WebSocketEventType>(
    event: T,
    callback: (
      data: T extends 'document:uploaded'
        ? DocumentUploadedEvent
        : T extends 'document:deleted'
          ? DocumentDeletedEvent
          : never
    ) => void
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners
      .get(event)
      ?.add(callback as (data: DocumentUploadedEvent | DocumentDeletedEvent) => void);

    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.delete(callback as (data: DocumentUploadedEvent | DocumentDeletedEvent) => void);
      }
    };
  }

  off<T extends WebSocketEventType>(
    event: T,
    callback: (
      data: T extends 'document:uploaded'
        ? DocumentUploadedEvent
        : T extends 'document:deleted'
          ? DocumentDeletedEvent
          : never
    ) => void
  ) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback as (data: DocumentUploadedEvent | DocumentDeletedEvent) => void);
    }
  }
}

export const websocketService = new WebSocketService();
