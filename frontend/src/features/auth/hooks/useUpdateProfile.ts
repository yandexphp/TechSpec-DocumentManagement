import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import type { UpdateProfileDto } from '../../../entities/user/model/types';
import { ROUTES } from '../../../shared/config/routes';
import { showToast } from '../../../shared/lib/toast';
import { authApi } from '../api/authApi';

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: UpdateProfileDto) => {
      return authApi.updateProfile(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      showToast.success(t('Профиль обновлен'));
      navigate({ to: ROUTES.DOCUMENTS });
    },
    onError: () => {
      showToast.error(t('Ошибка обновления профиля'));
    },
  });
};
