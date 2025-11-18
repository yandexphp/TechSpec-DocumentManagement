import { Clear as ClearIcon, Upload as UploadIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Ring } from 'ldrs/react';
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import 'ldrs/react/Ring.css';

import { BroadcastEventType } from '../../../entities/broadcast/model/types';
import type { SortField, SortOrder } from '../../../entities/document/model/types';
import {
  SortField as SortFieldConst,
  SortOrder as SortOrderConst,
} from '../../../entities/document/model/types';
import { getErrorMessage } from '../../../entities/error/model/types';
import { useAuth } from '../../../features/auth/model/authContext';
import {
  useBulkDeleteDocuments,
  useBulkDownloadDocuments,
  useBulkUpdateDocumentsPrivacy,
  useDeleteDocument,
  useDocuments,
  useDownloadDocument,
  useUpdateDocumentPrivacy,
} from '../../../features/documents/hooks/useDocuments';
import { ROUTES } from '../../../shared/config/routes';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import { fadeIn, staggerChildren } from '../../../shared/lib/animations';
import { showToast } from '../../../shared/lib/toast';
import { cn } from '../../../shared/lib/utils';
import { broadcastService } from '../../../shared/services/broadcast.service';
import { websocketService } from '../../../shared/services/websocket.service';
import { DocumentsTable } from '../../../widgets/documents-table/ui/DocumentsTable';
import { LanguageSwitcher } from '../../../widgets/language-switcher/ui/LanguageSwitcher';
import { ThemeSwitcher } from '../../../widgets/theme-switcher/ui/ThemeSwitcher';
import { UploadDocumentModal } from '../../../widgets/upload-document-modal/ui/UploadDocumentModal';
import { UserProfile } from '../../../widgets/user-profile/ui/UserProfile';

function DocumentsPage() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const search = useSearch({ from: '/documents' });

  const [searchName, setSearchName] = useState(search.name || '');
  const [page, setPage] = useState(search.page || 1);
  const [limit, setLimit] = useState(search.limit || 30);
  const [filters, setFilters] = useState<{
    name?: string;
    mimeType?: string;
    isPrivate?: boolean;
    minSize?: number;
    maxSize?: number;
  }>({});
  const [onlyMine, setOnlyMine] = useState(search.onlyMine || false);
  const [sort, setSort] = useState<{ field: SortField; order: SortOrder }>({
    field: SortFieldConst.CREATED_AT,
    order: SortOrderConst.DESC,
  });
  const debouncedSearchName = useDebounce(searchName, 300);
  const { data: user } = useAuth();

  useEffect(() => {
    const urlOnlyMine = search.onlyMine ?? false;
    if (urlOnlyMine !== onlyMine) {
      setOnlyMine(urlOnlyMine);
    }
  }, [search.onlyMine, onlyMine]);

  const documentsFilters = useMemo(
    () => ({
      name: debouncedSearchName || filters.name || undefined,
      mimeType: filters.mimeType,
      isPrivate: filters.isPrivate,
      minSize: filters.minSize,
      maxSize: filters.maxSize,
      sortBy: sort.field,
      sortOrder: sort.order,
      page,
      limit,
      onlyMine,
    }),
    [
      debouncedSearchName,
      filters.name,
      filters.mimeType,
      filters.isPrivate,
      filters.minSize,
      filters.maxSize,
      sort.field,
      sort.order,
      page,
      limit,
      onlyMine,
    ]
  );

  const documentsQuery = useDocuments(documentsFilters);

  const { data, isLoading, error } = documentsQuery;
  const deleteMutation = useDeleteDocument();
  const downloadMutation = useDownloadDocument();
  const updatePrivacyMutation = useUpdateDocumentPrivacy();
  const bulkDownloadMutation = useBulkDownloadDocuments();
  const bulkDeleteMutation = useBulkDeleteDocuments();
  const bulkUpdatePrivacyMutation = useBulkUpdateDocumentsPrivacy();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (containerRef.current) {
      fadeIn(containerRef.current);
    }
  }, []);

  useEffect(() => {
    if (tableRef.current && data?.documents) {
      staggerChildren(tableRef.current);
    }
  }, [data]);

  useEffect(() => {
    const newSearch: { name?: string; page?: number; limit?: number; onlyMine?: boolean } = {};
    if (debouncedSearchName) {
      newSearch.name = debouncedSearchName;
    }
    if (page > 1) {
      newSearch.page = page;
    }
    if (limit !== 30) {
      newSearch.limit = limit;
    }
    newSearch.onlyMine = onlyMine;
    navigate({
      to: '/documents',
      search: newSearch,
      replace: true,
    });
  }, [debouncedSearchName, page, limit, onlyMine, navigate]);

  useEffect(() => {
    const unsubscribeUploaded = websocketService.on('document:uploaded', () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    });

    const unsubscribeDeleted = websocketService.on('document:deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    });

    const unsubscribeDocumentCreated = broadcastService.subscribe(
      BroadcastEventType.DOCUMENT_CREATED,
      (data) => {
        if (data && 'document' in data && data.document) {
          const documentName = data.document.originalName || t('Документ');
          showToast.info(t('Документ "{{name}}" создан в другой вкладке', { name: documentName }), {
            autoClose: 3000,
          });
        }
        queryClient.invalidateQueries({ queryKey: ['documents'] });
      }
    );

    const unsubscribeDocumentDeleted = broadcastService.subscribe(
      BroadcastEventType.DOCUMENT_DELETED,
      () => {
        showToast.info(t('Документ удален в другой вкладке'), {
          autoClose: 3000,
        });
        queryClient.invalidateQueries({ queryKey: ['documents'] });
      }
    );

    return () => {
      unsubscribeUploaded();
      unsubscribeDeleted();
      unsubscribeDocumentCreated();
      unsubscribeDocumentDeleted();
    };
  }, [queryClient, t]);

  const handleSearch = useCallback(() => {
    if (!searchName.trim()) {
      return;
    }
    setPage(1);

    void documentsQuery.refetch();
  }, [documentsQuery, searchName]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const handleView = useCallback(
    (id: string) => {
      navigate({ to: ROUTES.DOCUMENT_VIEW, params: { id } });
    },
    [navigate]
  );

  const handleDownload = useCallback(
    async (id: string, originalName: string) => {
      downloadMutation.mutate({ id, originalName });
    },
    [downloadMutation]
  );

  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const handleUpload = useCallback(() => {
    setUploadModalOpen(true);
  }, []);

  return (
    <Container ref={containerRef} maxWidth="lg" className={cn('mt-8 mb-8 transition-all')}>
      <Box className={cn('flex justify-between items-center mb-6')}>
        <Typography variant="h4" component="h1" className={cn('text-2xl font-bold')}>
          {t('Документы')}
        </Typography>
        <Box className={cn('flex items-center gap-2')}>
          <ThemeSwitcher />
          <LanguageSwitcher />
          <UserProfile />
        </Box>
      </Box>

      <Paper className={cn('p-3 mb-4')}>
        <Box className={cn('flex gap-2 items-center')}>
          <TextField
            size="small"
            label={t('Поиск по имени')}
            value={searchName}
            onChange={(e) => {
              setSearchName(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className={cn('flex-1')}
            slotProps={{
              input: {
                endAdornment: searchName ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSearchName('');
                        setPage(1);
                      }}
                      edge="end"
                      aria-label={t('Очистить поиск')}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={handleSearch}
            disabled={!searchName.trim()}
            sx={{ height: '40px' }}
          >
            {t('Поиск')}
          </Button>
          <FormControl size="small" className={cn('min-w-[140px]')}>
            <Select
              value={onlyMine ? 'mine' : 'all'}
              onChange={(e) => {
                setOnlyMine(e.target.value === 'mine');
                setPage(1);
              }}
            >
              <MenuItem value="all">{t('Все')}</MenuItem>
              <MenuItem value="mine">{t('Только мои')}</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            size="small"
            startIcon={<UploadIcon />}
            onClick={handleUpload}
            sx={{ height: '40px' }}
          >
            {t('Загрузить')}
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" className={cn('mb-4')}>
          {getErrorMessage(error)}
        </Alert>
      )}

      {isLoading ? (
        <Box className={cn('flex justify-center p-8')}>
          <Ring size="60" stroke="5" bgOpacity="0" speed="2" color="#1976d2" />
        </Box>
      ) : data ? (
        <>
          <Box className={cn('flex justify-between items-center mb-4')}>
            <Typography variant="body2" className={cn('text-gray-600 dark:text-gray-400')}>
              {t('Всего документов')}: {data.total}
            </Typography>
            <FormControl size="small" className={cn('min-w-[120px]')}>
              <Select
                value={limit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  setLimit(newLimit);
                  setPage(1);
                }}
              >
                <MenuItem value={30}>30</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
                <MenuItem value={150}>150</MenuItem>
                <MenuItem value={300}>300</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <div ref={tableRef}>
            <DocumentsTable
              documents={data.documents}
              currentUserId={user?.userId}
              onView={handleView}
              onDownload={handleDownload}
              onDelete={handleDelete}
              onUpdatePrivacy={(id, isPrivate) => {
                updatePrivacyMutation.mutate({ id, isPrivate });
              }}
              onFilterChange={setFilters}
              onSortChange={(field, order) => setSort({ field, order })}
              currentSort={sort}
              onBulkDownload={(ids) => {
                const docs = data.documents.filter((d) => ids.includes(d.id));
                bulkDownloadMutation.mutate({
                  ids,
                  documents: docs.map((d) => ({ id: d.id, originalName: d.originalName })),
                });
              }}
              onBulkDelete={(ids) => {
                bulkDeleteMutation.mutate(ids);
              }}
              onBulkUpdatePrivacy={(ids, isPrivate) => {
                bulkUpdatePrivacyMutation.mutate({ ids, isPrivate });
              }}
            />
          </div>
          {Math.ceil(data.total / limit) > 1 && (
            <Box className={cn('flex justify-center p-4')}>
              <Pagination
                count={Math.ceil(data.total / limit)}
                page={page}
                onChange={(_, value) => {
                  startTransition(() => setPage(value));
                }}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      ) : (
        <Box className={cn('p-8 text-center')}>
          <Typography>{t('Документы не найдены')}</Typography>
        </Box>
      )}
      <UploadDocumentModal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} />
    </Container>
  );
}

export default DocumentsPage;
