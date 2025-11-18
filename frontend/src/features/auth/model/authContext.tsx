import { useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { BroadcastEventType } from '../../../entities/broadcast/model/types';
import type { LoginDto, RegisterDto } from '../../../entities/user/model/types';
import { broadcastService } from '../../../shared/services/broadcast.service';
import { websocketService } from '../../../shared/services/websocket.service';
import type { TNullable } from '../../../shared/types/nullable';
import { useAuthCheck } from '../hooks/useAuthCheck';
import { useLogin } from '../hooks/useLogin';
import { useLogout } from '../hooks/useLogout';
import { useRegister } from '../hooks/useRegister';

interface AuthContextType {
  isAuthenticated: boolean;
  user: TNullable<{
    userId: string;
    email: string;
    nickname: string;
    avatarUrl: TNullable<string>;
  }>;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const { data: user, isSuccess, isError } = useAuthCheck();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  useEffect(() => {
    if (isSuccess && user) {
      setIsAuthenticated(true);
      websocketService.connect('', user.userId);
    } else if (isError) {
      setIsAuthenticated(false);
    }
  }, [isSuccess, isError, user]);

  useEffect(() => {
    const unsubscribeLogin = broadcastService.subscribe(BroadcastEventType.AUTH_LOGIN, () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });

      if (typeof window !== 'undefined' && window.location.pathname === '/login') {
        window.location.href = '/documents';
      }
    });

    const unsubscribeLogout = broadcastService.subscribe(BroadcastEventType.AUTH_LOGOUT, () => {
      setIsAuthenticated(false);
      queryClient.setQueryData(['auth', 'me'], null);
      websocketService.disconnect();

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    });

    return () => {
      unsubscribeLogin();
      unsubscribeLogout();
    };
  }, [queryClient]);

  const login = async (data: LoginDto) => {
    await loginMutation.mutateAsync(data);
  };

  const register = async (data: RegisterDto) => {
    await registerMutation.mutateAsync(data);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user: user || null, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return {
    ...context,
    data: context.user,
  };
};
