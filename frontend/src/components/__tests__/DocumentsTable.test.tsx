import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DocumentDto } from '../../entities/document/model/types';
import { render, screen } from '../../test/utils';
import { DocumentsTable } from '../DocumentsTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru' },
  }),
}));

const mockDocuments: DocumentDto[] = [
  {
    id: '1',
    originalName: 'test.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    filePath: '/test.pdf',
    fileURL: 'http://example.com/test.pdf',
    createdAt: new Date().toISOString(),
    isPrivate: false,
    userId: 'user-1',
    authorNickname: 'test-user',
  },
];
describe('DocumentsTable', () => {
  it('should render documents table', async () => {
    render(
      <DocumentsTable
        documents={mockDocuments}
        onView={vi.fn()}
        onDownload={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    await waitFor(
      () => {
        expect(screen.getByText('Имя файла')).toBeInTheDocument();
        expect(screen.getByText('Размер')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });
});
