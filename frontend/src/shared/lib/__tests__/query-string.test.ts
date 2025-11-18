import { describe, expect, it } from 'vitest';

import { parseQuery, stringifyQuery } from '../query-string';

describe('query-string', () => {
  describe('parseQuery', () => {
    it('should parse query string with string values', () => {
      const result = parseQuery<{ name: string }>('name=test');
      expect(result.name).toBe('test');
    });

    it('should parse query string with number values', () => {
      const result = parseQuery<{ page: number }>('page=1');
      expect(result.page).toBe(1);
    });

    it('should parse query string with boolean values', () => {
      const result = parseQuery<{ active: boolean }>('active=true');
      expect(result.active).toBe(true);
    });

    it('should parse query string with multiple parameters', () => {
      const result = parseQuery<{ name: string; page: number; active: boolean }>(
        'name=test&page=2&active=false'
      );
      expect(result.name).toBe('test');
      expect(result.page).toBe(2);
      expect(result.active).toBe(false);
    });

    it('should handle empty query string', () => {
      const result = parseQuery<Record<string, unknown>>('');
      expect(result).toEqual({});
    });
  });

  describe('stringifyQuery', () => {
    it('should stringify object with string values', () => {
      const result = stringifyQuery({ name: 'test' });
      expect(result).toBe('name=test');
    });

    it('should stringify object with number values', () => {
      const result = stringifyQuery({ page: 1 });
      expect(result).toBe('page=1');
    });

    it('should stringify object with boolean values', () => {
      const result = stringifyQuery({ active: true });
      expect(result).toBe('active=true');
    });

    it('should stringify object with multiple parameters', () => {
      const result = stringifyQuery({ name: 'test', page: 2, active: false });
      expect(result).toContain('name=test');
      expect(result).toContain('page=2');
      expect(result).toContain('active=false');
    });

    it('should skip null values', () => {
      const result = stringifyQuery({ name: 'test', value: null });
      expect(result).toBe('name=test');
    });

    it('should skip undefined values', () => {
      const result = stringifyQuery({ name: 'test', value: undefined });
      expect(result).toBe('name=test');
    });

    it('should skip empty string values', () => {
      const result = stringifyQuery({ name: 'test', value: '' });
      expect(result).toBe('name=test');
    });

    it('should handle empty object', () => {
      const result = stringifyQuery({});
      expect(result).toBe('');
    });
  });
});
