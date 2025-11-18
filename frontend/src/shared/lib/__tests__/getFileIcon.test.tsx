import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getFileIcon } from '../getFileIcon';

describe('getFileIcon', () => {
  it('should return PDF icon for PDF files', () => {
    const icon = getFileIcon('application/pdf', 'test.pdf');
    const { container } = render(icon);
    expect(container.querySelector('.text-red-500')).toBeInTheDocument();
  });

  it('should return Image icon for image files', () => {
    const icon = getFileIcon('image/png', 'test.png');
    const { container } = render(icon);
    expect(container.querySelector('.text-blue-500')).toBeInTheDocument();
  });

  it('should return Word icon for Word documents', () => {
    const icon = getFileIcon('application/msword', 'test.doc');
    const { container } = render(icon);
    expect(container.querySelector('.text-blue-600')).toBeInTheDocument();
  });

  it('should return Excel icon for Excel documents', () => {
    const icon = getFileIcon('application/vnd.ms-excel', 'test.xls');
    const { container } = render(icon);
    expect(container.querySelector('.text-green-600')).toBeInTheDocument();
  });

  it('should return PowerPoint icon for PowerPoint documents', () => {
    const icon = getFileIcon('application/vnd.ms-powerpoint', 'test.ppt');
    const { container } = render(icon);
    expect(container.querySelector('.text-orange-500')).toBeInTheDocument();
  });

  it('should return Text icon for text files', () => {
    const icon = getFileIcon('text/plain', 'test.txt');
    const { container } = render(icon);
    expect(container.querySelector('.text-gray-600')).toBeInTheDocument();
  });

  it('should return File icon for unknown file types', () => {
    const icon = getFileIcon('application/unknown', 'test.unknown');
    const { container } = render(icon);
    expect(container.querySelector('.text-gray-500')).toBeInTheDocument();
  });

  it('should detect file type by extension when mimeType is not recognized', () => {
    const icon = getFileIcon('application/octet-stream', 'test.pdf');
    const { container } = render(icon);
    expect(container.querySelector('.text-red-500')).toBeInTheDocument();
  });
});
