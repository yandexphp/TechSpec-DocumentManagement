import { ArrowBack as ArrowBackIcon, Download as DownloadIcon } from '@mui/icons-material';
import { Alert, Box, Container, IconButton, Paper, Typography } from '@mui/material';
import { useNavigate } from '@tanstack/react-router';
import { Ring } from 'ldrs/react';
import { lazy, Suspense, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import 'ldrs/react/Ring.css';

import { getErrorMessage } from '../../../entities/error/model/types';
import { documentsApi } from '../../../features/documents/api/documentsApi';
import { useDocument, useDownloadDocument } from '../../../features/documents/hooks/useDocuments';
import { ROUTES } from '../../../shared/config/routes';
import { fadeIn } from '../../../shared/lib/animations';
import { formatDate } from '../../../shared/lib/formatDate';
import { formatFileSize } from '../../../shared/lib/formatFileSize';
import { cn } from '../../../shared/lib/utils';
import { Image } from '../../../shared/ui/Image';

const PdfViewer = lazy(() => import('./PdfViewer').then((module) => ({ default: module.default })));

interface ViewDocumentPageProps {
  id: string;
}

function ViewDocumentPage({ id }: ViewDocumentPageProps) {
  const { t, i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: document, isLoading, error } = useDocument(id);
  const downloadMutation = useDownloadDocument();
  const navigate = useNavigate({ from: '/documents/$id' });

  useEffect(() => {
    if (containerRef.current) {
      fadeIn(containerRef.current);
    }
  }, []);

  const convertibleTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/msword',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ];

  const isImage = document?.mimeType.startsWith('image/') ?? false;
  const isPdf =
    document?.mimeType === 'application/pdf' ||
    (document?.mimeType ? convertibleTypes.includes(document.mimeType) : false);

  const fileUrl = document ? documentsApi.getFileUrl(document.id) : '';

  const handleDownload = () => {
    if (document) {
      downloadMutation.mutate({ id: document.id, originalName: document.originalName });
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" className={cn('mt-8 mb-8')}>
        <Box className={cn('flex justify-center p-8')}>
          <Ring size="60" stroke="5" bgOpacity="0" speed="2" color="#1976d2" />
        </Box>
      </Container>
    );
  }

  if (error || !document) {
    return (
      <Container maxWidth="lg" className={cn('mt-8 mb-8')}>
        <Alert severity="error" className={cn('bg-red-50 text-red-800')}>
          {getErrorMessage(error) || t('Документы не найдены')}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" className={cn('mt-8 mb-8')}>
      <Box className={cn('flex items-center mb-6')}>
        <IconButton onClick={() => navigate({ to: ROUTES.DOCUMENTS })} className={cn('mr-4')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" className={cn('flex-grow')}>
          {document.originalName}
        </Typography>
        <IconButton
          color="primary"
          onClick={handleDownload}
          title={t('Скачать')}
          className={cn('ml-4')}
        >
          <DownloadIcon />
        </IconButton>
      </Box>

      <Paper className={cn('p-4 mb-4')}>
        <Typography variant="body2" color="text.secondary" className={cn('text-gray-600')}>
          {t('Размер')}: {formatFileSize(document.size, t)} | {t('Дата загрузки')}:{' '}
          {formatDate(document.createdAt, t, i18n.language)}
        </Typography>
      </Paper>

      <Paper className={cn('p-4 flex justify-center items-center min-h-[600px] bg-gray-100')}>
        {isImage && (
          <Image
            src={fileUrl}
            alt={document.originalName}
            className={cn('max-w-full max-h-[80vh]')}
            objectFit="contain"
            loading="lazy"
            decoding="async"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          />
        )}

        {isPdf && (
          <Suspense
            fallback={
              <Box className={cn('p-8 flex justify-center')}>
                <Ring size="60" stroke="5" bgOpacity="0" speed="2" color="#1976d2" />
              </Box>
            }
          >
            <PdfViewer fileUrl={fileUrl} />
          </Suspense>
        )}

        {!isImage && !isPdf && <Typography>{t('Неподдерживаемый тип файла')}</Typography>}
      </Paper>
    </Container>
  );
}

export default ViewDocumentPage;
