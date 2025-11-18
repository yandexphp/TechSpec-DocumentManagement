import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { BroadcastEventType } from '../../../entities/broadcast/model/types';
import { ROUTES } from '../../../shared/config/routes';
import { showToast } from '../../../shared/lib/toast';
import { broadcastService } from '../../../shared/services/broadcast.service';
import { websocketService } from '../../../shared/services/websocket.service';
import { authApi } from '../api/authApi';

export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async () => {
      await authApi.logout();
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null);
      broadcastService.broadcast(BroadcastEventType.AUTH_LOGOUT);
      websocketService.disconnect();
      showToast.success(t('Выход выполнен'));
      navigate({ to: ROUTES.LOGIN });
    },
    onError: () => {
      queryClient.setQueryData(['auth', 'me'], null);
      broadcastService.broadcast(BroadcastEventType.AUTH_LOGOUT);
      websocketService.disconnect();
      showToast.error(t('Ошибка выхода'));
      if (typeof window !== 'undefined') {
        window.location.href = ROUTES.LOGIN;
      }
    },
  });
};
