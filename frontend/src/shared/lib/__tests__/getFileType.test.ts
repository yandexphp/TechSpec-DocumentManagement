import { describe, expect, it } from 'vitest';

import { getFileTypeLabel } from '../getFileType';

describe('getFileTypeLabel', () => {
  const t = (key: string) => {
    const translations: Record<string, string> = {
      'fileType.pdf': 'PDF',
      'fileType.png': 'PNG',
      'fileType.jpeg': 'JPEG',
      'fileType.jpg': 'JPG',
      'fileType.gif': 'GIF',
      'fileType.webp': 'WebP',
      'fileType.word': 'Word',
      'fileType.excel': 'Excel',
      'fileType.powerpoint': 'PowerPoint',
      'fileType.text': 'Text',
      'fileType.csv': 'CSV',
      'fileType.unknown': 'Unknown',
    };
    return translations[key] || key;
  };

  it('should return PDF for PDF files', () => {
    expect(getFileTypeLabel('application/pdf', t)).toBe('PDF');
  });

  it('should return PNG for PNG images', () => {
    expect(getFileTypeLabel('image/png', t)).toBe('PNG');
  });

  it('should return JPEG for JPEG images', () => {
    expect(getFileTypeLabel('image/jpeg', t)).toBe('JPEG');
  });

  it('should return JPG for JPG images', () => {
    expect(getFileTypeLabel('image/jpg', t)).toBe('JPG');
  });

  it('should return Word for Word documents', () => {
    expect(getFileTypeLabel('application/msword', t)).toBe('Word');
    expect(
      getFileTypeLabel('application/vnd.openxmlformats-officedocument.wordprocessingml.document', t)
    ).toBe('Word');
  });

  it('should return Excel for Excel documents', () => {
    expect(getFileTypeLabel('application/vnd.ms-excel', t)).toBe('Excel');
    expect(
      getFileTypeLabel('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', t)
    ).toBe('Excel');
  });

  it('should return PowerPoint for PowerPoint documents', () => {
    expect(getFileTypeLabel('application/vnd.ms-powerpoint', t)).toBe('PowerPoint');
    expect(
      getFileTypeLabel(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        t
      )
    ).toBe('PowerPoint');
  });

  it('should return Text for text files', () => {
    expect(getFileTypeLabel('text/plain', t)).toBe('Text');
  });

  it('should return CSV for CSV files', () => {
    expect(getFileTypeLabel('text/csv', t)).toBe('CSV');
  });

  it('should return fallback for unknown mime types', () => {
    expect(getFileTypeLabel('application/unknown', t)).toBe('UNKNOWN');
  });

  it('should return Unknown for invalid mime types', () => {
    expect(getFileTypeLabel('invalid', t)).toBe('Unknown');
  });
});
