import {
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
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BroadcastEventType } from '../../../entities/broadcast/model/types';
import type { DocumentDto } from '../../../entities/document/model/types';
import type {
  UploadManager,
  UploadProgress,
  UploadTask,
} from '../../../features/documents/api/uploadManager';
import type { UploadQueue } from '../../../features/documents/api/uploadQueue';
import { fadeIn, scaleIn } from '../../../shared/lib/animations';
import { formatFileSize } from '../../../shared/lib/formatFileSize';
import { getFileIcon } from '../../../shared/lib/getFileIcon';
import { throttle, uniqBy } from '../../../shared/lib/lodash';
import { showToast } from '../../../shared/lib/toast';
import { cn } from '../../../shared/lib/utils';
import { broadcastService } from '../../../shared/services/broadcast.service';
import { uploadService } from '../../../shared/services/upload.service';
import { useThemeStore } from '../../../shared/store/theme.store';
import { uploadStore } from '../../../shared/store/upload.store';

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

interface UploadDocumentModalProps {
  open: boolean;
  onClose: () => void;
}

export const UploadDocumentModal = ({ open, onClose }: UploadDocumentModalProps) => {
  const { t } = useTranslation();
  const { theme } = useThemeStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const queryClient = useQueryClient();
  const uploadManagerRef = useRef<UploadManager>(uploadService.getManager());
  const uploadQueueRef = useRef<UploadQueue>(uploadService.getQueue());
  const uploadPromisesRef = useRef<Map<string, Promise<DocumentDto>>>(new Map());
  const fileIndexToIdMapRef = useRef<Map<number, string>>(new Map());
  const uploadCountersRef = useRef<{ uploaded: number; errors: number; total: number }>({
    uploaded: 0,
    errors: 0,
    total: 0,
  });

  useEffect(() => {
    if (containerRef.current) {
      fadeIn(containerRef.current);
    }
    if (dropZoneRef.current) {
      scaleIn(dropZoneRef.current);
    }
    const unsubscribe = uploadManagerRef.current.addProgressCallback((progress: UploadProgress) => {
      const fileId = fileIndexToIdMapRef.current.get(progress.fileIndex);
      if (fileId) {
        setFiles((prev) =>
          prev.map((f) => {
            if (f.id === fileId) {
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
        uploadStore
          .getState()
          .updateFileProgress(
            fileId,
            progress.progress,
            progress.uploadedBytes,
            progress.totalBytes
          );
      }
    });
    return () => {
      unsubscribe();
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

    const uniqueFiles = uniqBy([...files, ...validFiles], (f) => `${f.file.name}-${f.file.size}`);
    setFiles(uniqueFiles);
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
      uploadQueueRef.current.cancel(fileItem.uploadTask.fileId);
      uploadPromisesRef.current.delete(id);
    }
    setFiles((prev) => prev.filter((f) => f.id !== id));
    uploadStore.getState().removeFile(id);
  };

  const handlePause = (id: string) => {
    const fileItem = files.find((f) => f.id === id);
    if (fileItem?.uploadTask) {
      uploadQueueRef.current.pause(fileItem.uploadTask.fileId);
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'paused' as const } : f)));
      uploadStore.getState().pauseFile(id);
    }
  };

  const handleResume = (id: string) => {
    const fileItem = files.find((f) => f.id === id);
    if (fileItem?.uploadTask) {
      uploadQueueRef.current.resume(fileItem.uploadTask.fileId);
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'uploading' as const } : f))
      );
      uploadStore.getState().resumeFile(id);
    }
  };

  const handleCancel = (id: string) => {
    const fileItem = files.find((f) => f.id === id);
    if (fileItem?.uploadTask) {
      uploadQueueRef.current.cancel(fileItem.uploadTask.fileId);
      uploadPromisesRef.current.delete(id);
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'cancelled' as const } : f))
      );
      uploadStore.getState().cancelFile(id);
    }
  };

  const handleUpload = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');

    if (pendingFiles.length === 0) return;

    const totalFiles = pendingFiles.length;

    uploadCountersRef.current = {
      uploaded: 0,
      errors: 0,
      total: totalFiles,
    };

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

    pendingFiles.forEach((fileItem) => {
      uploadStore.getState().addFile({
        id: fileItem.id,
        fileName: fileItem.file.name,
        progress: 0,
        status: 'uploading',
        uploadedBytes: 0,
        totalBytes: fileItem.totalBytes,
        file: fileItem.file,
      });
    });

    const uploadPromises = pendingFiles.map(async (fileItem) => {
      try {
        const fileIndex = files.indexOf(fileItem);
        fileIndexToIdMapRef.current.set(fileIndex, fileItem.id);
        const promise = uploadQueueRef.current.enqueue(fileItem.file, fileIndex, (progress) => {
          setFiles((prev) =>
            prev.map((f) => {
              if (f.id === fileItem.id) {
                return { ...f, progress };
              }
              return f;
            })
          );
          setFiles((prev) => {
            return prev.map((f) => {
              if (f.id === fileItem.id) {
                const newUploadedBytes = Math.round((progress / 100) * f.totalBytes);
                uploadStore
                  .getState()
                  .updateFileProgress(fileItem.id, progress, newUploadedBytes, f.totalBytes);
                return { ...f, progress, uploadedBytes: newUploadedBytes };
              }
              return f;
            });
          });
        });

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
            uploadStore.getState().updateFileProgress(fileItem.id, 0, 0, fileItem.totalBytes);
            const currentFile = uploadStore.getState().files.get(fileItem.id);
            if (currentFile) {
              uploadStore.getState().addFile({
                ...currentFile,
                fileId: task.fileId,
              });
            }
          }
        }, 100);

        const document = await promise;

        setFiles((prev) =>
          prev.map((f) => {
            if (f.id === fileItem.id) {
              return { ...f, status: 'success' as const, progress: 100 };
            }
            return f;
          })
        );

        uploadStore.getState().updateFileStatus(fileItem.id, 'success');
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        broadcastService.broadcast(BroadcastEventType.DOCUMENT_CREATED, {
          document,
        });
        uploadCountersRef.current.uploaded++;
        const { uploaded, total } = uploadCountersRef.current;
        const message =
          total === 1
            ? t('Файл успешно загружен')
            : t('Загружено успешно {{uploaded}} из {{total}} файлов', {
                uploaded,
                total,
              });
        showToast.updateUploadProgress(uploaded, total, message);
        return document;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setFiles((prev) =>
          prev.map((f) => {
            if (f.id === fileItem.id) {
              return { ...f, status: 'error' as const, error: errorMessage };
            }
            return f;
          })
        );
        uploadStore.getState().updateFileStatus(fileItem.id, 'error', errorMessage);
        uploadCountersRef.current.errors++;
        const { uploaded, errors, total } = uploadCountersRef.current;
        if (errors === total) {
          showToast.dismissUploadProgress();
          showToast.error(t('Ошибка загрузки файлов'));
        } else if (uploaded + errors === total) {
          const message =
            uploaded > 0
              ? t('Загружено успешно {{uploaded}} из {{total}} файлов', {
                  uploaded,
                  total,
                })
              : t('Ошибка загрузки файлов');
          if (uploaded > 0) {
            showToast.updateUploadProgress(uploaded, total, message);
          } else {
            showToast.dismissUploadProgress();
            showToast.error(message);
          }
        }
        throw error;
      } finally {
        uploadPromisesRef.current.delete(fileItem.id);
      }
    });
    try {
      await Promise.allSettled(uploadPromises);
    } catch (error) {
      console.error('Global upload error:', error);
    }
  };
  const handleClose = () => {
    const hasActiveUploads = files.some((f) => f.status === 'uploading' || f.status === 'paused');
    if (!hasActiveUploads) {
      setFiles([]);
      setError('');
      onClose();
    } else {
      onClose();
    }
  };
  const uploadingFiles = files.filter((f) => f.status === 'uploading');
  const pausedFiles = files.filter((f) => f.status === 'paused');
  const canUpload =
    files.some((f) => f.status === 'pending') &&
    uploadingFiles.length === 0 &&
    pausedFiles.length === 0;
  const isAnyUploading = uploadingFiles.length > 0;
  const isAnyPaused = pausedFiles.length > 0;
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            border: '1px solid',
            borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            background: theme === 'dark' ? 'rgba(33, 38, 45, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            boxShadow:
              theme === 'dark'
                ? '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
                : '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          },
        },
        backdrop: {
          sx: {
            backdropFilter: 'blur(8px)',
            backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.4)',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          px: 3,
          py: 2.5,
          borderBottom: '1px solid',
          borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
          background: theme === 'dark' ? 'rgba(40, 46, 54, 0.8)' : 'rgba(249, 250, 251, 0.8)',
        }}
        className={cn('flex items-center justify-between')}
      >
        <Box className={cn('flex items-center gap-3')}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              background: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: theme === 'dark' ? 'rgb(96, 165, 250)' : 'rgb(37, 99, 235)',
            }}
          >
            <CloudUploadIcon />
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
            }}
          >
            {t('Загрузить документ')}
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)',
            '&:hover': {
              backgroundColor:
                theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          p: 3,
          mt: 3,
          background: theme === 'dark' ? 'rgba(33, 38, 45, 0.95)' : 'rgba(255, 255, 255, 0.98)',
        }}
      >
        <div ref={containerRef}>
          <Box
            ref={dropZoneRef}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            sx={{
              border: '2px dashed',
              borderColor: dragActive
                ? theme === 'dark'
                  ? 'rgba(96, 165, 250, 0.6)'
                  : 'rgba(37, 99, 235, 0.6)'
                : theme === 'dark'
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(0, 0, 0, 0.2)',
              borderRadius: 3,
              p: 6,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              transform: dragActive ? 'scale(1.02)' : 'scale(1)',
              background: dragActive
                ? theme === 'dark'
                  ? 'rgba(59, 130, 246, 0.15)'
                  : 'rgba(59, 130, 246, 0.08)'
                : theme === 'dark'
                  ? 'rgba(255, 255, 255, 0.03)'
                  : 'rgba(0, 0, 0, 0.02)',
              '&:hover': {
                borderColor:
                  theme === 'dark' ? 'rgba(96, 165, 250, 0.4)' : 'rgba(37, 99, 235, 0.4)',
                background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
              },
              boxShadow: dragActive
                ? theme === 'dark'
                  ? '0 8px 24px rgba(59, 130, 246, 0.2)'
                  : '0 8px 24px rgba(59, 130, 246, 0.15)'
                : 'none',
            }}
            className={cn('mb-4')}
          >
            <Box
              sx={{
                mx: 'auto',
                mb: 3,
                p: 3,
                borderRadius: '50%',
                width: 80,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                transform: dragActive ? 'scale(1.1)' : 'scale(1)',
                background: dragActive
                  ? theme === 'dark'
                    ? 'rgba(59, 130, 246, 0.25)'
                    : 'rgba(59, 130, 246, 0.15)'
                  : theme === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.05)',
              }}
            >
              <CloudUploadIcon
                sx={{
                  fontSize: 48,
                  color: dragActive
                    ? theme === 'dark'
                      ? 'rgb(96, 165, 250)'
                      : 'rgb(37, 99, 235)'
                    : theme === 'dark'
                      ? 'rgba(255, 255, 255, 0.4)'
                      : 'rgba(0, 0, 0, 0.4)',
                  transition: 'color 0.3s ease',
                }}
              />
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                mt: 2,
                mb: 1,
                color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
              }}
            >
              {t('Перетащите файлы сюда или')}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mb: 4,
                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
              }}
            >
              {t('Поддерживаются форматы: PDF, изображения, Office документы')}
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.doc,.xls,.ppt,.pptx,.txt,.csv"
              onChange={handleFileInput}
              style={{ display: 'none' }}
              id="file-upload-modal"
            />
            <label htmlFor="file-upload-modal">
              <Button
                variant="contained"
                component="span"
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 500,
                  textTransform: 'none',
                  background:
                    theme === 'dark'
                      ? 'linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 100%)'
                      : 'linear-gradient(135deg, rgb(37, 99, 235) 0%, rgb(29, 78, 216) 100%)',
                  boxShadow:
                    theme === 'dark'
                      ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                      : '0 4px 12px rgba(37, 99, 235, 0.25)',
                  '&:hover': {
                    background:
                      theme === 'dark'
                        ? 'linear-gradient(135deg, rgb(37, 99, 235) 0%, rgb(29, 78, 216) 100%)'
                        : 'linear-gradient(135deg, rgb(29, 78, 216) 0%, rgb(30, 64, 175) 100%)',
                    boxShadow:
                      theme === 'dark'
                        ? '0 6px 16px rgba(59, 130, 246, 0.4)'
                        : '0 6px 16px rgba(37, 99, 235, 0.35)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                {t('Выбрать файлы')}
              </Button>
            </label>
          </Box>
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 2,
                background:
                  theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(254, 242, 242, 0.8)',
                border: '1px solid',
                borderColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
              }}
            >
              {error}
            </Alert>
          )}
          {files.length > 0 && (
            <Box className={cn('mb-4')}>
              <Box className={cn('flex items-center justify-between mb-3')}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
                  }}
                >
                  {t('Выбранные файлы')}
                </Typography>
                <Chip
                  label={files.length}
                  size="small"
                  sx={{
                    background:
                      theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                    color: theme === 'dark' ? 'rgb(96, 165, 250)' : 'rgb(37, 99, 235)',
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Box
                className={cn('space-y-2')}
                sx={{
                  maxHeight: '400px',
                  minHeight: '200px',
                  overflowY: 'auto',
                  pr: 1,
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background:
                      theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background:
                      theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                  },
                }}
              >
                {files.map((fileItem) => (
                  <Paper
                    key={fileItem.id}
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                      background:
                        theme === 'dark' ? 'rgba(40, 46, 54, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow:
                          theme === 'dark'
                            ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                            : '0 4px 12px rgba(0, 0, 0, 0.1)',
                        borderColor:
                          theme === 'dark' ? 'rgba(96, 165, 250, 0.4)' : 'rgba(37, 99, 235, 0.3)',
                      },
                    }}
                  >
                    <Box className={cn('flex items-start gap-3')}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background:
                            theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                        }}
                      >
                        {getFileIcon(fileItem.file.type, fileItem.file.name)}
                      </Box>
                      <Box className={cn('flex-1 min-w-0')}>
                        <Box className={cn('flex items-start justify-between gap-2 mb-1.5')}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
                            }}
                            title={fileItem.file.name}
                          >
                            {fileItem.file.name}
                          </Typography>
                          <Box className={cn('flex items-center gap-2 flex-shrink-0')}>
                            {fileItem.status === 'success' && (
                              <CheckCircleIcon
                                sx={{
                                  fontSize: 20,
                                  color:
                                    theme === 'dark' ? 'rgb(74, 222, 128)' : 'rgb(34, 197, 94)',
                                }}
                              />
                            )}
                            {fileItem.status === 'error' && (
                              <ErrorIcon
                                sx={{
                                  fontSize: 20,
                                  color:
                                    theme === 'dark' ? 'rgb(248, 113, 113)' : 'rgb(239, 68, 68)',
                                }}
                              />
                            )}
                            {fileItem.status === 'paused' && (
                              <Chip
                                label={t('Пауза')}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.7rem',
                                  background:
                                    theme === 'dark'
                                      ? 'rgba(245, 158, 11, 0.2)'
                                      : 'rgba(245, 158, 11, 0.15)',
                                  color:
                                    theme === 'dark' ? 'rgb(251, 191, 36)' : 'rgb(217, 119, 6)',
                                }}
                              />
                            )}
                            {(fileItem.status === 'uploading' || fileItem.status === 'pending') && (
                              <Chip
                                label={`${fileItem.progress}%`}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  background:
                                    theme === 'dark'
                                      ? 'rgba(59, 130, 246, 0.2)'
                                      : 'rgba(59, 130, 246, 0.1)',
                                  color:
                                    theme === 'dark' ? 'rgb(96, 165, 250)' : 'rgb(37, 99, 235)',
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mb: 1.5,
                            color:
                              theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                          }}
                        >
                          {formatFileSize(fileItem.file.size, t)} • {fileItem.file.type}
                          {fileItem.status === 'uploading' && fileItem.totalBytes > 0 && (
                            <span className={cn('ml-2')}>
                              ({formatFileSize(fileItem.uploadedBytes, t)} /{' '}
                              {formatFileSize(fileItem.totalBytes, t)})
                            </span>
                          )}
                        </Typography>
                        {(fileItem.status === 'uploading' || fileItem.status === 'paused') && (
                          <Box className={cn('mb-1.5')}>
                            <LinearProgress
                              variant="determinate"
                              value={fileItem.progress}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                backgroundColor:
                                  theme === 'dark'
                                    ? 'rgba(255, 255, 255, 0.1)'
                                    : 'rgba(0, 0, 0, 0.08)',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 3,
                                  background:
                                    fileItem.status === 'paused'
                                      ? theme === 'dark'
                                        ? 'linear-gradient(90deg, rgb(245, 158, 11) 0%, rgb(217, 119, 6) 100%)'
                                        : 'linear-gradient(90deg, rgb(217, 119, 6) 0%, rgb(180, 83, 9) 100%)'
                                      : theme === 'dark'
                                        ? 'linear-gradient(90deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 100%)'
                                        : 'linear-gradient(90deg, rgb(37, 99, 235) 0%, rgb(29, 78, 216) 100%)',
                                },
                              }}
                            />
                          </Box>
                        )}
                        {fileItem.status === 'error' && fileItem.error && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              color: theme === 'dark' ? 'rgb(248, 113, 113)' : 'rgb(239, 68, 68)',
                            }}
                          >
                            {fileItem.error}
                          </Typography>
                        )}
                      </Box>
                      <Box className={cn('flex items-center gap-1 flex-shrink-0')}>
                        {fileItem.status === 'uploading' && (
                          <Tooltip title={t('Пауза')}>
                            <IconButton
                              size="small"
                              onClick={() => handlePause(fileItem.id)}
                              sx={{
                                p: 0.75,
                                color:
                                  theme === 'dark'
                                    ? 'rgba(255, 255, 255, 0.6)'
                                    : 'rgba(0, 0, 0, 0.6)',
                                '&:hover': {
                                  color:
                                    theme === 'dark' ? 'rgb(251, 191, 36)' : 'rgb(217, 119, 6)',
                                  background:
                                    theme === 'dark'
                                      ? 'rgba(245, 158, 11, 0.15)'
                                      : 'rgba(245, 158, 11, 0.1)',
                                },
                              }}
                            >
                              <PauseIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {fileItem.status === 'paused' && (
                          <Tooltip title={t('Продолжить')}>
                            <IconButton
                              size="small"
                              onClick={() => handleResume(fileItem.id)}
                              sx={{
                                p: 0.75,
                                color:
                                  theme === 'dark'
                                    ? 'rgba(255, 255, 255, 0.6)'
                                    : 'rgba(0, 0, 0, 0.6)',
                                '&:hover': {
                                  color:
                                    theme === 'dark' ? 'rgb(74, 222, 128)' : 'rgb(34, 197, 94)',
                                  background:
                                    theme === 'dark'
                                      ? 'rgba(34, 197, 94, 0.15)'
                                      : 'rgba(34, 197, 94, 0.1)',
                                },
                              }}
                            >
                              <PlayArrowIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(fileItem.status === 'uploading' || fileItem.status === 'paused') && (
                          <Tooltip title={t('Отменить')}>
                            <IconButton
                              size="small"
                              onClick={() => handleCancel(fileItem.id)}
                              sx={{
                                p: 0.75,
                                color:
                                  theme === 'dark'
                                    ? 'rgba(255, 255, 255, 0.6)'
                                    : 'rgba(0, 0, 0, 0.6)',
                                '&:hover': {
                                  color:
                                    theme === 'dark' ? 'rgb(248, 113, 113)' : 'rgb(239, 68, 68)',
                                  background:
                                    theme === 'dark'
                                      ? 'rgba(239, 68, 68, 0.15)'
                                      : 'rgba(239, 68, 68, 0.1)',
                                },
                              }}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(fileItem.status === 'pending' ||
                          fileItem.status === 'error' ||
                          fileItem.status === 'cancelled') && (
                          <Tooltip title={t('Удалить')}>
                            <IconButton
                              size="small"
                              onClick={() => removeFile(fileItem.id)}
                              sx={{
                                p: 0.75,
                                color:
                                  theme === 'dark'
                                    ? 'rgba(255, 255, 255, 0.4)'
                                    : 'rgba(0, 0, 0, 0.4)',
                                '&:hover': {
                                  color:
                                    theme === 'dark' ? 'rgb(248, 113, 113)' : 'rgb(239, 68, 68)',
                                  background:
                                    theme === 'dark'
                                      ? 'rgba(239, 68, 68, 0.15)'
                                      : 'rgba(239, 68, 68, 0.1)',
                                },
                              }}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}
          <Divider
            sx={{
              my: 3,
              borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            }}
          />
          <Button
            variant="contained"
            fullWidth
            onClick={handleUpload}
            disabled={!canUpload || isAnyUploading || isAnyPaused}
            startIcon={<CloudUploadIcon />}
            sx={{
              py: 1.75,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.95rem',
              background:
                theme === 'dark'
                  ? 'linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 100%)'
                  : 'linear-gradient(135deg, rgb(37, 99, 235) 0%, rgb(29, 78, 216) 100%)',
              boxShadow:
                theme === 'dark'
                  ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                  : '0 4px 12px rgba(37, 99, 235, 0.25)',
              '&:hover': {
                background:
                  theme === 'dark'
                    ? 'linear-gradient(135deg, rgb(37, 99, 235) 0%, rgb(29, 78, 216) 100%)'
                    : 'linear-gradient(135deg, rgb(29, 78, 216) 0%, rgb(30, 64, 175) 100%)',
                boxShadow:
                  theme === 'dark'
                    ? '0 6px 16px rgba(59, 130, 246, 0.4)'
                    : '0 6px 16px rgba(37, 99, 235, 0.35)',
              },
              '&:disabled': {
                opacity: 0.5,
                cursor: 'not-allowed',
              },
              transition: 'all 0.2s ease',
            }}
          >
            {isAnyUploading
              ? `${t('Загрузка')} (${uploadingFiles.length}/${files.length})`
              : isAnyPaused
                ? `${t('Продолжить загрузку')} (${pausedFiles.length}/${files.length})`
                : `${t('Загрузить документ')} (${files.filter((f) => f.status === 'pending').length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
