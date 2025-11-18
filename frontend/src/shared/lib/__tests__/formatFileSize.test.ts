import { describe, expect, it } from 'vitest';

import { formatFileSize } from '../formatFileSize';

describe('formatFileSize', () => {
  const t = (key: string) => key;

  it('should format bytes', () => {
    expect(formatFileSize(0, t)).toBe('0 байт');
  });

  it('should format KB', () => {
    expect(formatFileSize(1024, t)).toBe('1 кб');
  });

  it('should format MB', () => {
    expect(formatFileSize(1024 * 1024, t)).toBe('1 мб');
  });

  it('should format GB', () => {
    expect(formatFileSize(1024 * 1024 * 1024, t)).toBe('1 гб');
  });

  it('should round small sizes', () => {
    expect(formatFileSize(512, t)).toBe('512 байт');
  });
});
