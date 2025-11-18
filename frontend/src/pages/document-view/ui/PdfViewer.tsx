import { Box, IconButton, Typography } from '@mui/material';
import { Ring } from 'ldrs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Document, Page, pdfjs } from 'react-pdf';

import { cn } from '../../../shared/lib/utils';
import type { TNullable } from '../../../shared/types/nullable';
import 'ldrs/react/Ring.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileUrl: string;
}

export default function PdfViewer({ fileUrl }: PdfViewerProps) {
  const { t } = useTranslation();
  const [numPages, setNumPages] = useState<TNullable<number>>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };
  const goToPrevPage = () => {
    setPageNumber((p) => Math.max(1, p - 1));
  };
  const goToNextPage = () => {
    setPageNumber((p) => Math.min(numPages || 1, p + 1));
  };

  return (
    <Box className={cn('w-full')}>
      <Box className={cn('flex justify-center mb-4')}>
        <IconButton
          disabled={pageNumber <= 1}
          onClick={goToPrevPage}
          aria-label={t('Предыдущая страница')}
        >
          ←
        </IconButton>
        <Typography className={cn('mx-4 self-center')}>
          {t('Страница')} {pageNumber} {t('из')} {numPages || t('Неизвестная страница')}
        </Typography>
        <IconButton
          disabled={!!numPages && pageNumber >= numPages}
          onClick={goToNextPage}
          aria-label={t('Следующая страница')}
        >
          →
        </IconButton>
      </Box>
      <Box className={cn('flex justify-center')}>
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <Box className={cn('p-8 flex justify-center')}>
              <Ring size="60" stroke="5" bgOpacity="0" speed="2" color="#1976d2" />
            </Box>
          }
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            width={Math.min(800, window.innerWidth - 100)}
          />
        </Document>
      </Box>
    </Box>
  );
}
