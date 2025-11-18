import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { DocumentDto, SortField, SortOrder } from '../../../entities/document/model/types';
import {
  SortField as SortFieldValues,
  SortOrder as SortOrderValues,
} from '../../../entities/document/model/types';
import { documentsApi } from '../../../features/documents/api/documentsApi';
import { fadeIn } from '../../../shared/lib/animations';
import { formatDate } from '../../../shared/lib/formatDate';
import { formatFileSize } from '../../../shared/lib/formatFileSize';
import { getFileIcon } from '../../../shared/lib/getFileIcon';
import { getFileTypeLabel } from '../../../shared/lib/getFileType';
import { cn } from '../../../shared/lib/utils';
import { useThemeStore } from '../../../shared/store/theme.store';

interface DocumentsTableProps {
  documents: DocumentDto[];
  currentUserId?: string;
  onView?: (id: string) => void;
  onDownload: (id: string, originalName: string) => void;
  onDelete: (id: string) => void;
  onUpdatePrivacy?: (id: string, isPrivate: boolean) => void;
  onFilterChange?: (filters: {
    name?: string;
    mimeType?: string;
    isPrivate?: boolean;
    minSize?: number;
    maxSize?: number;
  }) => void;
  onSortChange?: (sortBy: SortField, sortOrder: SortOrder) => void;
  currentSort?: { field: SortField; order: SortOrder };
  onBulkDownload?: (ids: string[]) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkUpdatePrivacy?: (ids: string[], isPrivate: boolean) => void;
}

export const DocumentsTable = memo(
  ({
    documents,
    currentUserId,
    onDownload,
    onDelete,
    onUpdatePrivacy,
    onSortChange,
    currentSort,
    onBulkDownload,
    onBulkDelete,
    onBulkUpdatePrivacy,
  }: DocumentsTableProps) => {
    const { t, i18n } = useTranslation();
    const { theme } = useThemeStore();
    const tableRef = useRef<HTMLDivElement>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
    const [pendingPrivacyChange, setPendingPrivacyChange] = useState<boolean | null>(null);
    const [actionMenuAnchor, setActionMenuAnchor] = useState<{ [key: string]: HTMLElement | null }>(
      {}
    );
    const [contextMenuAnchor, setContextMenuAnchor] = useState<{
      [key: string]: { el: HTMLElement; x: number; y: number } | null;
    }>({});
    const [singleDeleteDialogOpen, setSingleDeleteDialogOpen] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
    const [singlePrivacyDialogOpen, setSinglePrivacyDialogOpen] = useState(false);
    const [documentToChangePrivacy, setDocumentToChangePrivacy] = useState<{
      id: string;
      isPrivate: boolean;
    } | null>(null);

    useEffect(() => {
      if (tableRef.current) {
        fadeIn(tableRef.current);
      }
    }, []);

    const handleSort = (field: SortField) => {
      if (onSortChange) {
        const newOrder: SortOrder =
          currentSort?.field === field && currentSort?.order === SortOrderValues.ASC
            ? SortOrderValues.DESC
            : SortOrderValues.ASC;
        onSortChange(field, newOrder);
      }
    };

    const selectedIds = useMemo(() => {
      return Object.keys(rowSelection).filter((key) => rowSelection[key]);
    }, [rowSelection]);

    const selectedDocuments = useMemo(() => {
      return documents.filter((doc) => selectedIds.includes(doc.id));
    }, [documents, selectedIds]);

    const allSelectedAreMine = useMemo(() => {
      if (!currentUserId || selectedDocuments.length === 0) return false;
      return selectedDocuments.every((doc) => doc.userId === currentUserId);
    }, [selectedDocuments, currentUserId]);

    const hasMixedOwnership = useMemo(() => {
      if (!currentUserId || selectedDocuments.length === 0) return false;
      const mineCount = selectedDocuments.filter((doc) => doc.userId === currentUserId).length;
      return mineCount > 0 && mineCount < selectedDocuments.length;
    }, [selectedDocuments, currentUserId]);

    const isAllSelected = documents.length > 0 && selectedIds.length === documents.length;
    const isIndeterminate = selectedIds.length > 0 && selectedIds.length < documents.length;

    const handleSelectAll = () => {
      if (isAllSelected) {
        setRowSelection({});
      } else {
        const newSelection: Record<string, boolean> = {};
        documents.forEach((doc) => {
          newSelection[doc.id] = true;
        });
        setRowSelection(newSelection);
      }
    };

    const handleBulkDownload = () => {
      if (onBulkDownload && selectedIds.length > 0) {
        onBulkDownload(selectedIds);
      }
    };

    const handleBulkDelete = () => {
      if (onBulkDelete && selectedIds.length > 0) {
        setDeleteDialogOpen(true);
      }
    };

    const confirmBulkDelete = () => {
      if (onBulkDelete && selectedIds.length > 0) {
        onBulkDelete(selectedIds);
        setRowSelection({});
        setDeleteDialogOpen(false);
      }
    };

    const handleBulkPrivacyChange = (isPrivate: boolean) => {
      if (onBulkUpdatePrivacy && selectedIds.length > 0) {
        setPendingPrivacyChange(isPrivate);
        setPrivacyDialogOpen(true);
      }
    };

    const confirmBulkPrivacyChange = () => {
      if (onBulkUpdatePrivacy && selectedIds.length > 0 && pendingPrivacyChange !== null) {
        onBulkUpdatePrivacy(selectedIds, pendingPrivacyChange);
        setRowSelection({});
        setPrivacyDialogOpen(false);
        setPendingPrivacyChange(null);
      }
    };

    const getSortDirection = (field: SortField): 'asc' | 'desc' | false => {
      if (currentSort?.field === field) {
        return currentSort.order === SortOrderValues.ASC ? 'asc' : 'desc';
      }
      return false;
    };

    const handleSingleDelete = (id: string) => {
      setDocumentToDelete(id);
      setSingleDeleteDialogOpen(true);
    };

    const confirmSingleDelete = () => {
      if (documentToDelete && onDelete) {
        onDelete(documentToDelete);
        setSingleDeleteDialogOpen(false);
        setDocumentToDelete(null);
      }
    };

    const handleSinglePrivacyChange = (id: string, isPrivate: boolean) => {
      setDocumentToChangePrivacy({ id, isPrivate });
      setSinglePrivacyDialogOpen(true);
    };

    const confirmSinglePrivacyChange = () => {
      if (documentToChangePrivacy && onUpdatePrivacy) {
        onUpdatePrivacy(documentToChangePrivacy.id, documentToChangePrivacy.isPrivate);
        setSinglePrivacyDialogOpen(false);
        setDocumentToChangePrivacy(null);
      }
    };

    const handleView = (document: DocumentDto) => {
      const fileUrl = documentsApi.getFileUrl(document.id);

      window.open(fileUrl, '_blank');
    };

    return (
      <>
        {selectedIds.length > 0 && (
          <Paper
            sx={{
              mb: 2,
              borderRadius: 2,
              bgcolor: theme === 'dark' ? 'rgba(40, 46, 54, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              border: '1px solid',
              borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
              boxShadow:
                theme === 'dark'
                  ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                  : '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Toolbar
              sx={{
                bgcolor: 'transparent',
                minHeight: '48px',
                px: 2,
              }}
            >
              <Box className={cn('flex items-center justify-between w-full')}>
                <Box className={cn('flex items-center gap-2')}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
                    }}
                  >
                    {t('Выбрано')}: {selectedIds.length}
                  </Typography>
                </Box>
                <Box className={cn('flex items-center gap-2')}>
                  <Tooltip title={t('Скачать выбранные')}>
                    <IconButton
                      size="small"
                      onClick={handleBulkDownload}
                      sx={{
                        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                        '&:hover': {
                          bgcolor:
                            theme === 'dark'
                              ? 'rgba(59, 130, 246, 0.2)'
                              : 'rgba(59, 130, 246, 0.1)',
                        },
                      }}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {allSelectedAreMine && (
                    <>
                      <Tooltip title={t('Сделать приватными')}>
                        <IconButton
                          size="small"
                          onClick={() => handleBulkPrivacyChange(true)}
                          disabled={hasMixedOwnership}
                          sx={{
                            color:
                              theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                            '&:hover': {
                              bgcolor:
                                theme === 'dark'
                                  ? 'rgba(59, 130, 246, 0.2)'
                                  : 'rgba(59, 130, 246, 0.1)',
                            },
                          }}
                        >
                          <LockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('Сделать публичными')}>
                        <IconButton
                          size="small"
                          onClick={() => handleBulkPrivacyChange(false)}
                          disabled={hasMixedOwnership}
                          sx={{
                            color:
                              theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                            '&:hover': {
                              bgcolor:
                                theme === 'dark'
                                  ? 'rgba(59, 130, 246, 0.2)'
                                  : 'rgba(59, 130, 246, 0.1)',
                            },
                          }}
                        >
                          <LockOpenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('Удалить выбранные')}>
                        <IconButton
                          size="small"
                          onClick={handleBulkDelete}
                          disabled={hasMixedOwnership}
                          sx={{
                            color: theme === 'dark' ? 'rgb(248, 113, 113)' : 'rgb(239, 68, 68)',
                            '&:hover': {
                              bgcolor:
                                theme === 'dark'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : 'rgba(239, 68, 68, 0.1)',
                            },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  {hasMixedOwnership && (
                    <Tooltip title={t('Невозможно выполнить действие: выбраны чужие файлы')}>
                      <span>
                        <IconButton size="small" disabled sx={{ opacity: 0.5 }}>
                          <LockIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </Toolbar>
          </Paper>
        )}
        <TableContainer
          ref={tableContainerRef}
          component={Paper}
          sx={{
            borderRadius: 2,
            boxShadow:
              theme === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.1)',
            border: '1px solid',
            borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            background: theme === 'dark' ? 'rgba(33, 38, 45, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            maxHeight: 'calc(100vh - 300px)',
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
            },
          }}
        >
          <div ref={tableRef}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    align="center"
                    sx={{
                      width: 48,
                      bgcolor:
                        theme === 'dark' ? 'rgba(40, 46, 54, 0.8)' : 'rgba(249, 250, 251, 0.8)',
                      borderBottom: '2px solid',
                      borderColor:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                      py: 2,
                      fontWeight: 600,
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                    }}
                  >
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onChange={handleSelectAll}
                      size="small"
                    />
                  </TableCell>
                  <TableCell
                    align="left"
                    sx={{
                      bgcolor:
                        theme === 'dark' ? 'rgba(40, 46, 54, 0.8)' : 'rgba(249, 250, 251, 0.8)',
                      borderBottom: '2px solid',
                      borderColor:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                      py: 2,
                      fontWeight: 600,
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
                    }}
                  >
                    {t('Имя файла')}
                  </TableCell>
                  <TableCell
                    align="left"
                    sx={{
                      bgcolor:
                        theme === 'dark' ? 'rgba(40, 46, 54, 0.8)' : 'rgba(249, 250, 251, 0.8)',
                      borderBottom: '2px solid',
                      borderColor:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                      py: 2,
                      fontWeight: 600,
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
                    }}
                  >
                    {t('Автор')}
                  </TableCell>
                  <TableCell
                    align="left"
                    sx={{
                      bgcolor:
                        theme === 'dark' ? 'rgba(40, 46, 54, 0.8)' : 'rgba(249, 250, 251, 0.8)',
                      borderBottom: '2px solid',
                      borderColor:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                      py: 2,
                      fontWeight: 600,
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
                    }}
                  >
                    {t('Тип файла')}
                  </TableCell>
                  <TableCell
                    align="left"
                    sx={{
                      bgcolor:
                        theme === 'dark' ? 'rgba(40, 46, 54, 0.8)' : 'rgba(249, 250, 251, 0.8)',
                      borderBottom: '2px solid',
                      borderColor:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                      py: 2,
                      fontWeight: 600,
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
                    }}
                  >
                    {t('Размер')}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      width: 100,
                      bgcolor:
                        theme === 'dark' ? 'rgba(40, 46, 54, 0.8)' : 'rgba(249, 250, 251, 0.8)',
                      borderBottom: '2px solid',
                      borderColor:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                      py: 2,
                      fontWeight: 600,
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
                    }}
                  >
                    {t('Приватность')}
                  </TableCell>
                  <TableCell
                    align="left"
                    sx={{
                      bgcolor:
                        theme === 'dark' ? 'rgba(40, 46, 54, 0.8)' : 'rgba(249, 250, 251, 0.8)',
                      borderBottom: '2px solid',
                      borderColor:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                      py: 2,
                      fontWeight: 600,
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
                    }}
                  >
                    <TableSortLabel
                      active={currentSort?.field === SortFieldValues.CREATED_AT}
                      direction={getSortDirection(SortFieldValues.CREATED_AT) || 'asc'}
                      onClick={() => handleSort(SortFieldValues.CREATED_AT)}
                      sx={{
                        color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
                        '& .MuiTableSortLabel-icon': {
                          color: theme === 'dark' ? 'rgb(96, 165, 250)' : 'rgb(37, 99, 235)',
                        },
                      }}
                    >
                      {t('Дата загрузки')}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      width: 150,
                      bgcolor:
                        theme === 'dark' ? 'rgba(40, 46, 54, 0.8)' : 'rgba(249, 250, 251, 0.8)',
                      borderBottom: '2px solid',
                      borderColor:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                      py: 2,
                      fontWeight: 600,
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
                    }}
                  >
                    {t('Действия')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map((document) => {
                  const isSelected = rowSelection[document.id] || false;
                  const isOwner = currentUserId && document.userId === currentUserId;

                  return (
                    <TableRow
                      key={document.id}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenuAnchor((prev) => ({
                          ...prev,
                          [document.id]: { el: e.currentTarget, x: e.clientX, y: e.clientY },
                        }));
                      }}
                      sx={{
                        '&:hover': {
                          bgcolor:
                            theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                        },
                        borderBottom: '1px solid',
                        borderColor:
                          theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                        bgcolor: isSelected
                          ? theme === 'dark'
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(59, 130, 246, 0.08)'
                          : 'transparent',
                      }}
                    >
                      <TableCell align="center">
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => {
                            setRowSelection((prev) => ({
                              ...prev,
                              [document.id]: e.target.checked,
                            }));
                          }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell
                        align="left"
                        sx={{
                          color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
                        }}
                      >
                        <Box className={cn('flex items-center gap-2')}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color:
                                theme === 'dark'
                                  ? 'rgba(255, 255, 255, 0.6)'
                                  : 'rgba(0, 0, 0, 0.6)',
                            }}
                          >
                            {getFileIcon(document.mimeType, document.originalName)}
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '300px',
                            }}
                            title={document.originalName}
                          >
                            {document.originalName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell
                        align="left"
                        sx={{
                          color:
                            theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                        }}
                      >
                        {document.authorNickname || '-'}
                      </TableCell>
                      <TableCell
                        align="left"
                        sx={{
                          color:
                            theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                        }}
                      >
                        {getFileTypeLabel(document.mimeType, t)}
                      </TableCell>
                      <TableCell
                        align="left"
                        sx={{
                          color:
                            theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                        }}
                      >
                        {formatFileSize(document.size, t)}
                      </TableCell>
                      <TableCell align="center">
                        {document.isPrivate ? (
                          <Tooltip title={t('Приватный файл')}>
                            <LockIcon
                              fontSize="small"
                              sx={{
                                color: theme === 'dark' ? 'rgb(96, 165, 250)' : 'rgb(37, 99, 235)',
                              }}
                            />
                          </Tooltip>
                        ) : (
                          <Box sx={{ width: 24 }} />
                        )}
                      </TableCell>
                      <TableCell
                        align="left"
                        sx={{
                          color:
                            theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                        }}
                      >
                        {formatDate(document.createdAt, t, i18n.language)}
                      </TableCell>
                      <TableCell align="right">
                        <Box className={cn('flex items-center justify-end')}>
                          <Tooltip title={t('Действия')}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                setActionMenuAnchor((prev) => ({
                                  ...prev,
                                  [document.id]: e.currentTarget,
                                }));
                              }}
                              sx={{
                                color:
                                  theme === 'dark'
                                    ? 'rgba(255, 255, 255, 0.6)'
                                    : 'rgba(0, 0, 0, 0.6)',
                                '&:hover': {
                                  bgcolor:
                                    theme === 'dark'
                                      ? 'rgba(59, 130, 246, 0.2)'
                                      : 'rgba(59, 130, 246, 0.1)',
                                },
                              }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Menu
                            anchorEl={actionMenuAnchor[document.id]}
                            open={Boolean(actionMenuAnchor[document.id])}
                            onClose={() => {
                              setActionMenuAnchor((prev) => ({
                                ...prev,
                                [document.id]: null,
                              }));
                            }}
                            anchorOrigin={{
                              vertical: 'bottom',
                              horizontal: 'right',
                            }}
                            transformOrigin={{
                              vertical: 'top',
                              horizontal: 'right',
                            }}
                            slotProps={{
                              paper: {
                                sx: {
                                  borderRadius: 2,
                                  border: '1px solid',
                                  borderColor:
                                    theme === 'dark'
                                      ? 'rgba(255, 255, 255, 0.1)'
                                      : 'rgba(0, 0, 0, 0.1)',
                                  background:
                                    theme === 'dark'
                                      ? 'rgba(33, 38, 45, 0.95)'
                                      : 'rgba(255, 255, 255, 0.98)',
                                  backdropFilter: 'blur(20px)',
                                  minWidth: 200,
                                },
                              },
                            }}
                          >
                            <MenuItem
                              onClick={() => {
                                handleView(document);
                                setActionMenuAnchor((prev) => ({
                                  ...prev,
                                  [document.id]: null,
                                }));
                              }}
                            >
                              <ListItemIcon>
                                <VisibilityIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText>{t('Просмотр')}</ListItemText>
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                onDownload(document.id, document.originalName);
                                setActionMenuAnchor((prev) => ({
                                  ...prev,
                                  [document.id]: null,
                                }));
                              }}
                            >
                              <ListItemIcon>
                                <DownloadIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText>{t('Скачать файл')}</ListItemText>
                            </MenuItem>
                            {isOwner && onUpdatePrivacy && (
                              <MenuItem
                                onClick={() => {
                                  handleSinglePrivacyChange(document.id, !document.isPrivate);
                                  setActionMenuAnchor((prev) => ({
                                    ...prev,
                                    [document.id]: null,
                                  }));
                                }}
                              >
                                <ListItemIcon>
                                  {document.isPrivate ? (
                                    <LockOpenIcon fontSize="small" />
                                  ) : (
                                    <LockIcon fontSize="small" />
                                  )}
                                </ListItemIcon>
                                <ListItemText>
                                  {document.isPrivate
                                    ? t('Сделать публичным')
                                    : t('Сделать приватным')}
                                </ListItemText>
                              </MenuItem>
                            )}
                            {isOwner && (
                              <MenuItem
                                onClick={() => {
                                  handleSingleDelete(document.id);
                                  setActionMenuAnchor((prev) => ({
                                    ...prev,
                                    [document.id]: null,
                                  }));
                                }}
                                sx={{
                                  color:
                                    theme === 'dark' ? 'rgb(248, 113, 113)' : 'rgb(239, 68, 68)',
                                }}
                              >
                                <ListItemIcon>
                                  <DeleteIcon
                                    fontSize="small"
                                    sx={{
                                      color:
                                        theme === 'dark'
                                          ? 'rgb(248, 113, 113)'
                                          : 'rgb(239, 68, 68)',
                                    }}
                                  />
                                </ListItemIcon>
                                <ListItemText>{t('Удалить')}</ListItemText>
                              </MenuItem>
                            )}
                          </Menu>
                          <Menu
                            open={Boolean(contextMenuAnchor[document.id])}
                            onClose={() => {
                              setContextMenuAnchor((prev) => ({
                                ...prev,
                                [document.id]: null,
                              }));
                            }}
                            anchorReference="anchorPosition"
                            anchorPosition={
                              contextMenuAnchor[document.id]
                                ? {
                                    top: contextMenuAnchor[document.id]?.y ?? 0,
                                    left: contextMenuAnchor[document.id]?.x ?? 0,
                                  }
                                : undefined
                            }
                            slotProps={{
                              paper: {
                                sx: {
                                  borderRadius: 2,
                                  border: '1px solid',
                                  borderColor:
                                    theme === 'dark'
                                      ? 'rgba(255, 255, 255, 0.1)'
                                      : 'rgba(0, 0, 0, 0.1)',
                                  background:
                                    theme === 'dark'
                                      ? 'rgba(33, 38, 45, 0.95)'
                                      : 'rgba(255, 255, 255, 0.98)',
                                  backdropFilter: 'blur(20px)',
                                  minWidth: 200,
                                },
                              },
                            }}
                          >
                            <MenuItem
                              onClick={() => {
                                handleView(document);
                                setContextMenuAnchor((prev) => ({
                                  ...prev,
                                  [document.id]: null,
                                }));
                              }}
                            >
                              <ListItemIcon>
                                <VisibilityIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText>{t('Просмотр')}</ListItemText>
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                onDownload(document.id, document.originalName);
                                setContextMenuAnchor((prev) => ({
                                  ...prev,
                                  [document.id]: null,
                                }));
                              }}
                            >
                              <ListItemIcon>
                                <DownloadIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText>{t('Скачать файл')}</ListItemText>
                            </MenuItem>
                            {isOwner && onUpdatePrivacy && (
                              <MenuItem
                                onClick={() => {
                                  handleSinglePrivacyChange(document.id, !document.isPrivate);
                                  setContextMenuAnchor((prev) => ({
                                    ...prev,
                                    [document.id]: null,
                                  }));
                                }}
                              >
                                <ListItemIcon>
                                  {document.isPrivate ? (
                                    <LockOpenIcon fontSize="small" />
                                  ) : (
                                    <LockIcon fontSize="small" />
                                  )}
                                </ListItemIcon>
                                <ListItemText>
                                  {document.isPrivate
                                    ? t('Сделать публичным')
                                    : t('Сделать приватным')}
                                </ListItemText>
                              </MenuItem>
                            )}
                            {isOwner && (
                              <MenuItem
                                onClick={() => {
                                  handleSingleDelete(document.id);
                                  setContextMenuAnchor((prev) => ({
                                    ...prev,
                                    [document.id]: null,
                                  }));
                                }}
                                sx={{
                                  color:
                                    theme === 'dark' ? 'rgb(248, 113, 113)' : 'rgb(239, 68, 68)',
                                }}
                              >
                                <ListItemIcon>
                                  <DeleteIcon
                                    fontSize="small"
                                    sx={{
                                      color:
                                        theme === 'dark'
                                          ? 'rgb(248, 113, 113)'
                                          : 'rgb(239, 68, 68)',
                                    }}
                                  />
                                </ListItemIcon>
                                <ListItemText>{t('Удалить')}</ListItemText>
                              </MenuItem>
                            )}
                          </Menu>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TableContainer>
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          slotProps={{
            paper: {
              sx: {
                borderRadius: 3,
                border: '1px solid',
                borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                background:
                  theme === 'dark' ? 'rgba(33, 38, 45, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(20px)',
              },
            },
          }}
        >
          <DialogTitle sx={{ color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)' }}>
            {t('Подтверждение удаления')}
          </DialogTitle>
          <DialogContent>
            <DialogContentText
              sx={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}
            >
              {t('Вы уверены, что хотите удалить {{count}} документ(ов)?', {
                count: selectedIds.length,
              })}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              variant="outlined"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
              }}
            >
              {t('Отмена')}
            </Button>
            <Button
              onClick={confirmBulkDelete}
              variant="contained"
              color="error"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
              }}
            >
              {t('Удалить')}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={privacyDialogOpen}
          onClose={() => setPrivacyDialogOpen(false)}
          slotProps={{
            paper: {
              sx: {
                borderRadius: 3,
                border: '1px solid',
                borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                background:
                  theme === 'dark' ? 'rgba(33, 38, 45, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(20px)',
              },
            },
          }}
        >
          <DialogTitle sx={{ color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)' }}>
            {t('Изменение приватности')}
          </DialogTitle>
          <DialogContent>
            <DialogContentText
              sx={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}
            >
              {pendingPrivacyChange
                ? t('Вы уверены, что хотите сделать {{count}} документ(ов) приватными?', {
                    count: selectedIds.length,
                  })
                : t('Вы уверены, что хотите сделать {{count}} документ(ов) публичными?', {
                    count: selectedIds.length,
                  })}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setPrivacyDialogOpen(false)}
              variant="outlined"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
              }}
            >
              {t('Отмена')}
            </Button>
            <Button
              onClick={confirmBulkPrivacyChange}
              variant="contained"
              color="primary"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
              }}
            >
              {t('Подтвердить')}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={singleDeleteDialogOpen}
          onClose={() => setSingleDeleteDialogOpen(false)}
          slotProps={{
            paper: {
              sx: {
                borderRadius: 3,
                border: '1px solid',
                borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                background:
                  theme === 'dark' ? 'rgba(33, 38, 45, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(20px)',
              },
            },
          }}
        >
          <DialogTitle sx={{ color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)' }}>
            {t('Подтверждение удаления')}
          </DialogTitle>
          <DialogContent>
            <DialogContentText
              sx={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}
            >
              {t('Вы уверены, что хотите удалить этот документ?')}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setSingleDeleteDialogOpen(false)}
              variant="outlined"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
              }}
            >
              {t('Отмена')}
            </Button>
            <Button
              onClick={confirmSingleDelete}
              variant="contained"
              color="error"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
              }}
            >
              {t('Удалить')}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={singlePrivacyDialogOpen}
          onClose={() => setSinglePrivacyDialogOpen(false)}
          slotProps={{
            paper: {
              sx: {
                borderRadius: 3,
                border: '1px solid',
                borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                background:
                  theme === 'dark' ? 'rgba(33, 38, 45, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(20px)',
              },
            },
          }}
        >
          <DialogTitle sx={{ color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)' }}>
            {t('Изменение приватности')}
          </DialogTitle>
          <DialogContent>
            <DialogContentText
              sx={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}
            >
              {documentToChangePrivacy?.isPrivate
                ? t('Вы уверены, что хотите сделать этот документ приватным?')
                : t('Вы уверены, что хотите сделать этот документ публичным?')}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setSinglePrivacyDialogOpen(false)}
              variant="outlined"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
              }}
            >
              {t('Отмена')}
            </Button>
            <Button
              onClick={confirmSinglePrivacyChange}
              variant="contained"
              color="primary"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
              }}
            >
              {t('Подтвердить')}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
);
