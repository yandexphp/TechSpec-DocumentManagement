import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { BroadcastEventType } from '../../../entities/broadcast/model/types';
import type { LoginDto } from '../../../entities/user/model/types';
import { ROUTES } from '../../../shared/config/routes';
import { showToast } from '../../../shared/lib/toast';
import { broadcastService } from '../../../shared/services/broadcast.service';
import { websocketService } from '../../../shared/services/websocket.service';
import { authApi } from '../api/authApi';

export const useLogin = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: LoginDto) => {
      return await authApi.login(data);
    },
    onSuccess: (response) => {
      broadcastService.broadcast(BroadcastEventType.AUTH_LOGIN);
      websocketService.connect('', response.userId);
      showToast.success(t('Вход выполнен'));
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      navigate({ to: ROUTES.DOCUMENTS });
    },
    onError: () => {
      showToast.error(t('Ошибка входа'));
    },
  });
};
