import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { BroadcastEventType } from '../../../entities/broadcast/model/types';
import type { RegisterDto } from '../../../entities/user/model/types';
import { ROUTES } from '../../../shared/config/routes';
import { showToast } from '../../../shared/lib/toast';
import { broadcastService } from '../../../shared/services/broadcast.service';
import { websocketService } from '../../../shared/services/websocket.service';
import { authApi } from '../api/authApi';

export const useRegister = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: RegisterDto) => {
      return await authApi.register(data);
    },
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      broadcastService.broadcast(BroadcastEventType.AUTH_LOGIN);
      websocketService.connect('', response.userId);
      showToast.success(t('Регистрация выполнена'));
      setTimeout(() => {
        navigate({ to: ROUTES.DOCUMENTS });
      }, 0);
    },
    onError: () => {
      showToast.error(t('Ошибка регистрации'));
    },
  });
};
