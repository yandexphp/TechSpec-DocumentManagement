import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock('../services/websocket.service', () => ({
  websocketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
  },
}));

vi.mock('../services/broadcast.service', () => ({
  broadcastService: {
    subscribe: vi.fn(() => vi.fn()),
    broadcast: vi.fn(),
  },
  BroadcastEventType: {
    AUTH_LOGIN: 'AUTH_LOGIN',
    AUTH_LOGOUT: 'AUTH_LOGOUT',
    DOCUMENT_CREATED: 'DOCUMENT_CREATED',
  },
}));

vi.mock('@mui/icons-material', async () => {
  const React = await import('react');
  const createMockIcon = (name: string) => {
    return React.forwardRef((props: { className?: string }, ref: unknown) => {
      return React.createElement('div', {
        'data-testid': `icon-${name}`,
        className: props.className,
        ref,
      });
    });
  };

  return {
    Description: createMockIcon('Description'),
    Image: createMockIcon('Image'),
    Article: createMockIcon('Article'),
    TableChart: createMockIcon('TableChart'),
    Slideshow: createMockIcon('Slideshow'),
    TextFields: createMockIcon('TextFields'),
    InsertDriveFile: createMockIcon('InsertDriveFile'),
    LightMode: createMockIcon('LightMode'),
    DarkMode: createMockIcon('DarkMode'),
    Delete: createMockIcon('Delete'),
    Download: createMockIcon('Download'),
    Visibility: createMockIcon('Visibility'),
    VisibilityOff: createMockIcon('VisibilityOff'),
    KeyboardArrowDown: createMockIcon('KeyboardArrowDown'),
    AccountCircle: createMockIcon('AccountCircle'),
    Logout: createMockIcon('Logout'),
  };
});
