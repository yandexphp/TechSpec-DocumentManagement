import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { Ring } from 'ldrs/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import 'ldrs/react/Ring.css';

import { getErrorMessage } from '../../../entities/error/model/types';
import { useCheckNickname } from '../../../features/auth/hooks/useCheckNickname';
import { useUpdateProfile } from '../../../features/auth/hooks/useUpdateProfile';
import { useAuth } from '../../../features/auth/model/authContext';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import { getFileUrl } from '../../../shared/lib/getFileUrl';
import { showToast } from '../../../shared/lib/toast';
import { cn } from '../../../shared/lib/utils';
import type { TNullable } from '../../../shared/types/nullable';

interface ProfileEditModalProps {
  open: boolean;
  onClose: () => void;
}

export const ProfileEditModal = ({ open, onClose }: ProfileEditModalProps) => {
  const { t } = useTranslation();
  const { data: user } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [avatar, setAvatar] = useState<TNullable<File>>(null);
  const [avatarPreview, setAvatarPreview] = useState<TNullable<string>>(user?.avatarUrl || null);

  const debouncedNickname = useDebounce(nickname, 500);
  const { data: nicknameCheck, isFetching: isCheckingNickname } = useCheckNickname(
    debouncedNickname,
    debouncedNickname.length >= 3 && debouncedNickname !== user?.nickname
  );

  const updateProfileMutation = useUpdateProfile();

  useEffect(() => {
    if (user) {
      setNickname(user.nickname);
      if (!avatar) {
        setAvatarPreview(user.avatarUrl || null);
      }
    }
  }, [user, avatar]);

  useEffect(() => {
    if (avatar) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(avatar);
    }
  }, [avatar]);

  useEffect(() => {
    if (updateProfileMutation.isSuccess) {
      setAvatar(null);
      onClose();
    }
  }, [updateProfileMutation.isSuccess, onClose]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast.error(t('Файл должен быть изображением'));
        return;
      }
      const MAX_SIZE = 15 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        showToast.error(t('Размер файла не должен превышать 15 МБ'));
        return;
      }
      setAvatar(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname || nickname.length < 3) {
      return;
    }
    updateProfileMutation.mutate({
      nickname,
      avatar: avatar || undefined,
    });
  };

  const handleClose = () => {
    if (!updateProfileMutation.isPending) {
      setAvatar(null);
      setAvatarPreview(user?.avatarUrl || null);
      setNickname(user?.nickname || '');
      onClose();
    }
  };

  if (!user) {
    return null;
  }

  const nicknameError =
    debouncedNickname.length >= 3 &&
    debouncedNickname !== user.nickname &&
    nicknameCheck &&
    !nicknameCheck.available
      ? t('Никнейм уже занят')
      : null;

  const hasChanges = nickname !== user.nickname || avatar !== null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('Редактирование профиля')}</DialogTitle>
      <DialogContent>
        {updateProfileMutation.error && (
          <Alert severity="error" className={cn('mb-4')}>
            {getErrorMessage(updateProfileMutation.error)}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <Box className={cn('flex justify-center mb-6 mt-2')}>
            <Avatar
              src={
                avatarPreview
                  ? avatarPreview.startsWith('data:')
                    ? avatarPreview
                    : getFileUrl(avatarPreview)
                  : undefined
              }
              alt={user.nickname}
              className={cn('w-24 h-24')}
              sx={{ width: 96, height: 96, fontSize: '2.5rem' }}
            >
              {user.nickname.charAt(0).toUpperCase()}
            </Avatar>
          </Box>
          <Box className={cn('mb-4')}>
            <input
              accept="image/jpeg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
              id="avatar-upload-modal"
              type="file"
              onChange={handleAvatarChange}
            />
            <label htmlFor="avatar-upload-modal">
              <Button variant="outlined" component="span" fullWidth>
                {avatar ? t('Изменить аватар') : t('Выбрать аватар')}
              </Button>
            </label>
            {avatar && (
              <Typography variant="caption" className={cn('block mt-1 text-center')}>
                {t('Размер')}: {(avatar.size / 1024 / 1024).toFixed(2)} {t('МБ')}
              </Typography>
            )}
          </Box>
          <TextField
            fullWidth
            label={t('Email')}
            value={user.email}
            margin="normal"
            disabled
            helperText={t('Email нельзя изменить')}
          />
          <TextField
            fullWidth
            label={t('Никнейм')}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            margin="normal"
            required
            error={!!nicknameError}
            helperText={
              nicknameError ||
              (isCheckingNickname
                ? t('Проверка...')
                : t('Минимум 3 символа, только буквы, цифры и подчеркивания'))
            }
            inputProps={{
              pattern: '^[a-zA-Z0-9_]+$',
              minLength: 3,
              maxLength: 30,
            }}
          />
          <Box className={cn('flex gap-2 mt-6')}>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleClose}
              disabled={updateProfileMutation.isPending}
            >
              {t('Отмена')}
            </Button>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={
                updateProfileMutation.isPending ||
                !!nicknameError ||
                !hasChanges ||
                !nickname ||
                nickname.length < 3
              }
            >
              {updateProfileMutation.isPending ? (
                <Box className={cn('flex items-center justify-center gap-2')}>
                  <Ring size="20" stroke="5" bgOpacity="0" speed="2" color="#fff" />
                  <span>{t('Сохранение...')}</span>
                </Box>
              ) : (
                t('Сохранить')
              )}
            </Button>
          </Box>
        </form>
      </DialogContent>
    </Dialog>
  );
};
