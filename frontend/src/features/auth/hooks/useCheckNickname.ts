import { useQuery } from '@tanstack/react-query';

import { authApi } from '../api/authApi';

export const useCheckNickname = (nickname: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['auth', 'check-nickname', nickname],
    queryFn: () => authApi.checkNickname(nickname),
    enabled: enabled && nickname.length >= 3 && nickname.length <= 30,
    retry: false,
  });
};
