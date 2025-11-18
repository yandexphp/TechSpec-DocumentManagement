import { describe, expect, it, vi } from 'vitest';

import { getFileUrl } from '../getFileUrl';

vi.mock('../config/constants', async () => {
  const actual = await vi.importActual('../config/constants');
  return {
    ...actual,
    API_URL: '/api',
  };
});

describe('getFileUrl', () => {
  it('should return undefined for null filePath', () => {
    expect(getFileUrl(null)).toBeUndefined();
  });

  it('should return undefined for undefined filePath', () => {
    expect(getFileUrl(undefined)).toBeUndefined();
  });

  it('should return filePath as is if it starts with http://', () => {
    const url = 'http://example.com/file.pdf';
    expect(getFileUrl(url)).toBe(url);
  });

  it('should return filePath as is if it starts with https://', () => {
    const url = 'https://example.com/file.pdf';
    expect(getFileUrl(url)).toBe(url);
  });

  it('should encode file path correctly', () => {
    const filePath = 'documents/test file.pdf';
    const result = getFileUrl(filePath);
    expect(result).toBe('/api/storage/documents/test%20file.pdf');
  });

  it('should remove leading slash before encoding', () => {
    const filePath = '/documents/test.pdf';
    const result = getFileUrl(filePath);
    expect(result).toBe('/api/storage/documents/test.pdf');
  });

  it('should encode special characters in path', () => {
    const filePath = 'documents/test & file (1).pdf';
    const result = getFileUrl(filePath);
    expect(result).toBe('/api/storage/documents/test%20%26%20file%20(1).pdf');
  });

  it('should handle nested paths', () => {
    const filePath = 'user/123/documents/file.pdf';
    const result = getFileUrl(filePath);
    expect(result).toBe('/api/storage/user/123/documents/file.pdf');
  });
});
