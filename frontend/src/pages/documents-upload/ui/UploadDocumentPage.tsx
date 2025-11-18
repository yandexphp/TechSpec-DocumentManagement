import {
  ArrowBack as ArrowBackIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Error as ErrorIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BroadcastEventType } from '../../../entities/broadcast/model/types';
import type { DocumentDto } from '../../../entities/document/model/types';
import {
  UploadManager,
  type UploadProgress,
  type UploadTask,
} from '../../../features/documents/api/uploadManager';
import { ROUTES } from '../../../shared/config/routes';
import { fadeIn, scaleIn } from '../../../shared/lib/animations';
import { formatFileSize } from '../../../shared/lib/formatFileSize';
import { throttle, uniqBy } from '../../../shared/lib/lodash';
import { showToast } from '../../../shared/lib/toast';
import { cn } from '../../../shared/lib/utils';
import { broadcastService } from '../../../shared/services/broadcast.service';

interface FileUploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'paused' | 'success' | 'error' | 'cancelled';
  error?: string;
  uploadedBytes: number;
  totalBytes: number;
  uploadTask?: UploadTask;
}

function UploadDocumentPage() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate({ from: '/documents/upload' });
  const queryClient = useQueryClient();
  const uploadManagerRef = useRef<UploadManager>(new UploadManager());
  const uploadPromisesRef = useRef<Map<string, Promise<DocumentDto>>>(new Map());

  useEffect(() => {
    if (containerRef.current) {
      fadeIn(containerRef.current);
    }
    if (dropZoneRef.current) {
      scaleIn(dropZoneRef.current);
    }

    const unsubscribe = uploadManagerRef.current.addProgressCallback((progress: UploadProgress) => {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id === progress.fileIndex.toString()) {
            return {
              ...f,
              progress: progress.progress,
              uploadedBytes: progress.uploadedBytes,
              totalBytes: progress.totalBytes,
            };
          }
          return f;
        })
      );
    });

    return () => {
      unsubscribe();
      uploadManagerRef.current.clear();
    };
  }, []);

  const throttledDragHandler = useMemo(
    () =>
      throttle((isActive: boolean) => {
        setDragActive(isActive);
      }, 100),
    []
  );

  useEffect(() => {
    return () => {
      throttledDragHandler.cancel();
    };
  }, [throttledDragHandler]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      throttledDragHandler(true);
    } else if (e.type === 'dragleave') {
      throttledDragHandler(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFiles(droppedFiles);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const validFiles: FileUploadItem[] = [];
    const errors: string[] = [];

    newFiles.forEach((file) => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          file,
          progress: 0,
          status: 'pending',
          uploadedBytes: 0,
          totalBytes: file.size,
        });
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      setError(errors.join('; '));
    } else {
      setError('');
    }

    setFiles((prev) => uniqBy([...prev, ...validFiles], (f) => `${f.file.name}-${f.file.size}`));
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/msword',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
    ];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: t('Неподдерживаемый тип файла'),
      };
    }
    const MAX_FILE_SIZE = 1024 ** 5;
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: t('Файл слишком большой'),
      };
    }
    return { valid: true };
  };

  const removeFile = (id: string) => {
    const fileItem = files.find((f) => f.id === id);
    if (fileItem?.uploadTask) {
      uploadManagerRef.current.cancel(fileItem.uploadTask.fileId);
      uploadPromisesRef.current.delete(id);
    }
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handlePause = (id: string) => {
    const fileItem = files.find((f) => f.id === id);
    if (fileItem?.uploadTask) {
      uploadManagerRef.current.pause(fileItem.uploadTask.fileId);
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'paused' as const } : f)));
    }
  };

  const handleResume = (id: string) => {
    const fileItem = files.find((f) => f.id === id);
    if (fileItem?.uploadTask) {
      uploadManagerRef.current.resume(fileItem.uploadTask.fileId);
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'uploading' as const } : f))
      );
    }
  };

  const handleCancel = (id: string) => {
    const fileItem = files.find((f) => f.id === id);
    if (fileItem?.uploadTask) {
      uploadManagerRef.current.cancel(fileItem.uploadTask.fileId);
      uploadPromisesRef.current.delete(id);
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'cancelled' as const } : f))
      );
    }
  };

  const handleUpload = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setFiles((prev) =>
      prev.map((f) => {
        if (f.status === 'pending') {
          return {
            ...f,
            status: 'uploading' as const,
            progress: 0,
          };
        }
        return f;
      })
    );

    const uploadPromises = pendingFiles.map(async (fileItem) => {
      try {
        const fileIndex = files.indexOf(fileItem);
        const promise = uploadManagerRef.current.uploadFile(
          fileItem.file,
          fileIndex,
          (progress) => {
            setFiles((prev) =>
              prev.map((f) => {
                if (f.id === fileItem.id) {
                  return { ...f, progress };
                }
                return f;
              })
            );
          }
        );

        uploadPromisesRef.current.set(fileItem.id, promise);

        setTimeout(() => {
          const task = uploadManagerRef.current
            .getAllTasks()
            .find((t) => t.fileIndex === fileIndex);
          if (task) {
            setFiles((prev) =>
              prev.map((f) => {
                if (f.id === fileItem.id) {
                  return { ...f, uploadTask: task };
                }
                return f;
              })
            );
          }
        }, 100);

        const document = await promise;

        setFiles((prev) =>
          prev.map((f) => {
            if (f.id === fileItem.id) {
              return {
                ...f,
                status: 'success' as const,
                progress: 100,
              };
            }
            return f;
          })
        );

        queryClient.invalidateQueries({ queryKey: ['documents'] });
        broadcastService.broadcast(BroadcastEventType.DOCUMENT_CREATED, {
          document,
        });

        return document;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setFiles((prev) =>
          prev.map((f) => {
            if (f.id === fileItem.id) {
              return {
                ...f,
                status: 'error' as const,
                error: errorMessage.includes('cancelled') ? t('Загрузка отменена') : errorMessage,
              };
            }
            return f;
          })
        );
        throw error;
      } finally {
        uploadPromisesRef.current.delete(fileItem.id);
      }
    });

    try {
      await Promise.allSettled(uploadPromises);
      const allSuccess = files.every(
        (f) => f.status === 'success' || f.status === 'cancelled' || f.status === 'error'
      );
      if (allSuccess) {
        const successCount = files.filter((f) => f.status === 'success').length;
        if (successCount > 0) {
          showToast.success(t('{{count}} документов успешно загружено', { count: successCount }));
        }
        setTimeout(() => {
          startTransition(() => {
            navigate({ to: ROUTES.DOCUMENTS });
          });
        }, 2000);
      }
    } catch (_error) {
      showToast.error(t('Ошибка загрузки файлов'));
    }
  };

  const uploadingFiles = files.filter((f) => f.status === 'uploading');
  const pausedFiles = files.filter((f) => f.status === 'paused');
  const canUpload =
    files.some((f) => f.status === 'pending') &&
    uploadingFiles.length === 0 &&
    pausedFiles.length === 0;

  return (
    <Container ref={containerRef} maxWidth="md" className={cn('mt-8 mb-8')}>
      <Box className={cn('flex items-center mb-6')}>
        <IconButton onClick={() => navigate({ to: ROUTES.DOCUMENTS })} className={cn('mr-4')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {t('Загрузить документ')}
        </Typography>
      </Box>

      <Paper className={cn('p-8')}>
        <Box
          ref={dropZoneRef}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-all mb-6',
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600'
          )}
        >
          <CloudUploadIcon className={cn('text-6xl text-gray-400 mb-4')} />
          <Typography variant="h6" gutterBottom className={cn('text-lg font-semibold')}>
            {t('Перетащите файлы сюда или')}
          </Typography>
          <Typography variant="body2" color="text.secondary" className={cn('mb-4')}>
            {t('Поддерживаются форматы: PDF, изображения, Office документы')}
          </Typography>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.doc,.xls,.ppt,.pptx,.txt,.csv"
            onChange={handleFileInput}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button variant="outlined" component="span">
              {t('Выбрать файлы')}
            </Button>
          </label>
        </Box>

        {error && (
          <Alert severity="error" className={cn('mb-6')}>
            {error}
          </Alert>
        )}

        {files.length > 0 && (
          <Box className={cn('mb-6')}>
            <Typography variant="h6" className={cn('mb-4')}>
              {t('Выбранные файлы')} ({files.length})
            </Typography>
            <List>
              {files.map((fileItem) => (
                <ListItem
                  key={fileItem.id}
                  secondaryAction={
                    <Box className={cn('flex items-center gap-1')}>
                      {fileItem.status === 'uploading' && (
                        <IconButton
                          edge="end"
                          onClick={() => handlePause(fileItem.id)}
                          size="small"
                          title={t('Пауза')}
                        >
                          <PauseIcon fontSize="small" />
                        </IconButton>
                      )}
                      {fileItem.status === 'paused' && (
                        <IconButton
                          edge="end"
                          onClick={() => handleResume(fileItem.id)}
                          size="small"
                          title={t('Продолжить')}
                        >
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                      )}
                      {(fileItem.status === 'uploading' || fileItem.status === 'paused') && (
                        <IconButton
                          edge="end"
                          onClick={() => handleCancel(fileItem.id)}
                          size="small"
                          title={t('Отменить')}
                          color="error"
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      )}
                      {(fileItem.status === 'pending' ||
                        fileItem.status === 'error' ||
                        fileItem.status === 'cancelled') && (
                        <IconButton
                          edge="end"
                          onClick={() => removeFile(fileItem.id)}
                          size="small"
                          title={t('Удалить')}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      )}
                      {fileItem.status === 'success' && (
                        <CheckCircleIcon color="success" className={cn('ml-2')} />
                      )}
                      {fileItem.status === 'error' && (
                        <ErrorIcon color="error" className={cn('ml-2')} />
                      )}
                    </Box>
                  }
                >
                  <Box className={cn('w-full mr-4')}>
                    <Box className={cn('flex items-center mb-2')}>
                      <ListItemText
                        primary={fileItem.file.name}
                        secondary={
                          <Box className={cn('flex items-center gap-2')}>
                            <span>{formatFileSize(fileItem.file.size, t)}</span>
                            {fileItem.status === 'uploading' && fileItem.uploadedBytes > 0 && (
                              <span className={cn('text-xs text-gray-500')}>
                                {formatFileSize(fileItem.uploadedBytes, t)} /{' '}
                                {formatFileSize(fileItem.totalBytes, t)}
                              </span>
                            )}
                          </Box>
                        }
                      />
                      {fileItem.status === 'uploading' && (
                        <Chip
                          label={`${fileItem.progress}%`}
                          size="small"
                          className={cn('ml-2')}
                          color="primary"
                        />
                      )}
                      {fileItem.status === 'paused' && (
                        <Chip
                          label={t('На паузе')}
                          size="small"
                          className={cn('ml-2')}
                          color="warning"
                        />
                      )}
                    </Box>
                    {(fileItem.status === 'uploading' || fileItem.status === 'paused') && (
                      <LinearProgress
                        variant="determinate"
                        value={fileItem.progress}
                        className={cn('mt-2')}
                      />
                    )}
                    {fileItem.status === 'error' && fileItem.error && (
                      <Typography
                        variant="caption"
                        color="error"
                        className={cn('text-red-500 mt-2 block')}
                      >
                        {fileItem.error}
                      </Typography>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        <Button
          variant="contained"
          fullWidth
          onClick={handleUpload}
          disabled={!canUpload}
          startIcon={<CloudUploadIcon />}
        >
          {uploadingFiles.length > 0
            ? `${t('Загрузка')} (${uploadingFiles.length}/${files.length})`
            : `${t('Загрузить')} (${files.filter((f) => f.status === 'pending').length})`}
        </Button>
      </Paper>
    </Container>
  );
}

export default UploadDocumentPage;
