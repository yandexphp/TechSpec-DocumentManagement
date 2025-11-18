import {
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Error as ErrorIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Box,
  Collapse,
  IconButton,
  LinearProgress,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BroadcastEventType } from '../../../entities/broadcast/model/types';
import { formatFileSize } from '../../../shared/lib/formatFileSize';
import { getFileIcon } from '../../../shared/lib/getFileIcon';
import { cn } from '../../../shared/lib/utils';
import { broadcastService } from '../../../shared/services/broadcast.service';
import { uploadService } from '../../../shared/services/upload.service';
import { useThemeStore } from '../../../shared/store/theme.store';
import { type UploadFile, uploadStore } from '../../../shared/store/upload.store';

export const UploadProgressIndicator = () => {
  const { t } = useTranslation();
  const { theme } = useThemeStore();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const updateFiles = () => {
      const filesMap = uploadStore.getState().files;
      setFiles(Array.from(filesMap.values()));
    };
    updateFiles();

    const unsubscribe = uploadStore.subscribe((state) => {
      setFiles(Array.from(state.files.values()));
    });

    return unsubscribe;
  }, []);

  if (files.length === 0) {
    return null;
  }

  const uploadingFiles = files.filter((f) => f.status === 'uploading' || f.status === 'paused');
  const successFiles = files.filter((f) => f.status === 'success');
  const errorFiles = files.filter((f) => f.status === 'error');

  const totalFiles = files.length;
  const activeFiles = uploadingFiles.length;
  const completedFiles = successFiles.length + errorFiles.length;

  const overallProgress =
    files.length > 0
      ? Math.round(files.reduce((sum, file) => sum + file.progress, 0) / files.length)
      : 0;

  const getStatusText = () => {
    if (activeFiles > 0) {
      const remaining = totalFiles - completedFiles;
      if (remaining === 1) {
        return t('Загружается 1 файл');
      }
      return t('Загружается 1 и еще {{count}} файлов', { count: remaining - 1 });
    }
    if (errorFiles.length > 0) {
      return t('{{count}} файл(ов) не загружено', { count: errorFiles.length });
    }
    return t('Все файлы загружены');
  };

  const handlePause = (file: UploadFile) => {
    if (file.fileId) {
      uploadService.getQueue().pause(file.fileId);
      uploadStore.getState().pauseFile(file.id);
    }
  };

  const handleResume = (file: UploadFile) => {
    if (file.fileId) {
      uploadService.getQueue().resume(file.fileId);
      uploadStore.getState().resumeFile(file.id);
    }
  };

  const handleCancel = (file: UploadFile) => {
    if (file.fileId) {
      uploadService.getQueue().cancel(file.fileId);
      uploadStore.getState().cancelFile(file.id);
    } else {
      uploadStore.getState().removeFile(file.id);
    }
  };

  const handleRemove = (file: UploadFile) => {
    if (file.status === 'uploading' || file.status === 'paused') {
      handleCancel(file);
    } else {
      uploadStore.getState().removeFile(file.id);
    }
  };

  const handleRetry = async (file: UploadFile) => {
    if (!file.file) {
      return;
    }

    uploadStore.getState().updateFileStatus(file.id, 'uploading');
    uploadStore.getState().updateFileProgress(file.id, 0, 0, file.totalBytes);

    try {
      const fileIndex = files.findIndex((f) => f.id === file.id);
      const document = await uploadService
        .getQueue()
        .enqueue(file.file, fileIndex >= 0 ? fileIndex : Date.now(), (progress) => {
          const uploadedBytes = Math.round((progress / 100) * file.totalBytes);
          uploadStore
            .getState()
            .updateFileProgress(file.id, progress, uploadedBytes, file.totalBytes);
        });

      uploadStore.getState().updateFileStatus(file.id, 'success');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      broadcastService.broadcast(BroadcastEventType.DOCUMENT_CREATED, {
        document,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      uploadStore.getState().updateFileStatus(file.id, 'error', errorMessage);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 1300,
        width: 384,
        maxWidth: 'calc(100vw - 2rem)',
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
        transition: 'all 0.3s ease',
      }}
    >
      <Box
        sx={{
          p: 2.5,
          borderBottom: '1px solid',
          borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
          background: theme === 'dark' ? 'rgba(40, 46, 54, 0.8)' : 'rgba(249, 250, 251, 0.8)',
        }}
      >
        <Box className={cn('flex items-center justify-between mb-2')}>
          <Box className={cn('flex items-center gap-2.5')}>
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  activeFiles > 0
                    ? theme === 'dark'
                      ? 'rgba(59, 130, 246, 0.2)'
                      : 'rgba(59, 130, 246, 0.1)'
                    : errorFiles.length > 0
                      ? theme === 'dark'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(239, 68, 68, 0.1)'
                      : theme === 'dark'
                        ? 'rgba(34, 197, 94, 0.2)'
                        : 'rgba(34, 197, 94, 0.1)',
              }}
            >
              {activeFiles > 0 ? (
                <CloudUploadIcon
                  sx={{
                    fontSize: 20,
                    color: theme === 'dark' ? 'rgb(96, 165, 250)' : 'rgb(37, 99, 235)',
                  }}
                />
              ) : errorFiles.length > 0 ? (
                <ErrorIcon
                  sx={{
                    fontSize: 20,
                    color: theme === 'dark' ? 'rgb(248, 113, 113)' : 'rgb(239, 68, 68)',
                  }}
                />
              ) : (
                <CheckCircleIcon
                  sx={{
                    fontSize: 20,
                    color: theme === 'dark' ? 'rgb(74, 222, 128)' : 'rgb(34, 197, 94)',
                  }}
                />
              )}
            </Box>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
              }}
            >
              {getStatusText()}
            </Typography>
          </Box>
          <Box className={cn('flex items-center gap-2')}>
            {activeFiles > 0 && (
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                }}
              >
                {overallProgress}%
              </Typography>
            )}
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{
                p: 0.5,
                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                '&:hover': {
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  color: theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
                },
              }}
            >
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>

        {activeFiles > 0 && (
          <Box className={cn('mt-2')}>
            <LinearProgress
              variant="determinate"
              value={overallProgress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background:
                    theme === 'dark'
                      ? 'linear-gradient(90deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 100%)'
                      : 'linear-gradient(90deg, rgb(37, 99, 235) 0%, rgb(29, 78, 216) 100%)',
                },
              }}
            />
          </Box>
        )}
      </Box>

      <Collapse in={expanded}>
        <Box
          sx={{
            maxHeight: '384px',
            overflowY: 'auto',
            p: 2,
            background: theme === 'dark' ? 'rgba(33, 38, 45, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            '&::-webkit-scrollbar': {
              width: '8px',
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
          <Box className={cn('space-y-2')}>
            {files.map((file) => {
              const isActive = file.status === 'uploading' || file.status === 'paused';
              const canControl = isActive && file.fileId;

              return (
                <Box
                  key={file.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    border: '1px solid',
                    borderColor:
                      theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                    background:
                      theme === 'dark' ? 'rgba(40, 46, 54, 0.6)' : 'rgba(249, 250, 251, 0.6)',
                    '&:hover': {
                      background:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                      borderColor:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      flexShrink: 0,
                      mt: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getFileIcon('', file.fileName)}
                  </Box>

                  <Box className={cn('flex-1 min-w-0')}>
                    <Box className={cn('flex items-start justify-between gap-2 mb-1')}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color:
                            file.status === 'error'
                              ? theme === 'dark'
                                ? 'rgb(248, 113, 113)'
                                : 'rgb(239, 68, 68)'
                              : theme === 'dark'
                                ? 'rgb(243, 244, 246)'
                                : 'rgb(17, 24, 39)',
                        }}
                        title={file.fileName}
                      >
                        {file.fileName}
                      </Typography>
                      {isActive && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color:
                              theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {file.progress}%
                        </Typography>
                      )}
                    </Box>

                    <Box className={cn('flex items-center gap-2 mb-1.5')}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.75rem',
                          color:
                            theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                        }}
                      >
                        {formatFileSize(file.uploadedBytes, t)} /{' '}
                        {formatFileSize(file.totalBytes, t)}
                      </Typography>
                      {file.status === 'paused' && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: theme === 'dark' ? 'rgb(251, 191, 36)' : 'rgb(217, 119, 6)',
                          }}
                        >
                          {t('На паузе')}
                        </Typography>
                      )}
                      {file.status === 'error' && file.error && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.75rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: theme === 'dark' ? 'rgb(248, 113, 113)' : 'rgb(239, 68, 68)',
                          }}
                          title={file.error}
                        >
                          {file.error}
                        </Typography>
                      )}
                    </Box>

                    {isActive && (
                      <Box className={cn('mb-1.5')}>
                        <LinearProgress
                          variant="determinate"
                          value={file.progress}
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            backgroundColor:
                              theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 2,
                              background:
                                file.status === 'paused'
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

                    {file.status === 'success' && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: theme === 'dark' ? 'rgb(74, 222, 128)' : 'rgb(34, 197, 94)',
                        }}
                      >
                        {t('Загружено')}
                      </Typography>
                    )}
                  </Box>

                  <Box className={cn('flex items-center gap-0.5 flex-shrink-0')}>
                    {file.status === 'error' && file.file && (
                      <Tooltip title={t('Повторить попытку')}>
                        <IconButton
                          size="small"
                          onClick={() => handleRetry(file)}
                          sx={{
                            p: 0.75,
                            color:
                              theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                            '&:hover': {
                              color: theme === 'dark' ? 'rgb(96, 165, 250)' : 'rgb(37, 99, 235)',
                              background:
                                theme === 'dark'
                                  ? 'rgba(59, 130, 246, 0.15)'
                                  : 'rgba(59, 130, 246, 0.1)',
                            },
                          }}
                        >
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canControl && file.status === 'uploading' && (
                      <Tooltip title={t('Пауза')}>
                        <IconButton
                          size="small"
                          onClick={() => handlePause(file)}
                          sx={{
                            p: 0.75,
                            color:
                              theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                            '&:hover': {
                              color: theme === 'dark' ? 'rgb(251, 191, 36)' : 'rgb(217, 119, 6)',
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
                    {canControl && file.status === 'paused' && (
                      <Tooltip title={t('Продолжить')}>
                        <IconButton
                          size="small"
                          onClick={() => handleResume(file)}
                          sx={{
                            p: 0.75,
                            color:
                              theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                            '&:hover': {
                              color: theme === 'dark' ? 'rgb(74, 222, 128)' : 'rgb(34, 197, 94)',
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
                    <Tooltip
                      title={
                        file.status === 'uploading' || file.status === 'paused'
                          ? t('Отменить')
                          : t('Удалить')
                      }
                    >
                      <IconButton
                        size="small"
                        onClick={() => handleRemove(file)}
                        sx={{
                          p: 0.75,
                          color:
                            file.status === 'uploading' || file.status === 'paused'
                              ? theme === 'dark'
                                ? 'rgba(255, 255, 255, 0.6)'
                                : 'rgba(0, 0, 0, 0.6)'
                              : theme === 'dark'
                                ? 'rgba(255, 255, 255, 0.4)'
                                : 'rgba(0, 0, 0, 0.4)',
                          '&:hover': {
                            color: theme === 'dark' ? 'rgb(248, 113, 113)' : 'rgb(239, 68, 68)',
                            background:
                              theme === 'dark'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(239, 68, 68, 0.1)',
                          },
                        }}
                      >
                        {file.status === 'uploading' || file.status === 'paused' ? (
                          <CancelIcon fontSize="small" />
                        ) : (
                          <CloseIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Collapse>

      {completedFiles === totalFiles && activeFiles === 0 && (
        <Box
          sx={{
            p: 2,
            pt: 2.5,
            borderTop: '1px solid',
            borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: theme === 'dark' ? 'rgba(40, 46, 54, 0.8)' : 'rgba(249, 250, 251, 0.8)',
          }}
        >
          <Typography
            variant="caption"
            onClick={() => uploadStore.getState().clear()}
            sx={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: theme === 'dark' ? 'rgb(96, 165, 250)' : 'rgb(37, 99, 235)',
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            {t('Закрыть')}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
