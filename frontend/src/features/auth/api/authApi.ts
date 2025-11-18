import type {
  AuthResponse,
  CheckNicknameResponse,
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
} from '../../../entities/user/model/types';
import apiClient from '../../../shared/api/client';

export const authApi = {
  login: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },
  register: async (data: RegisterDto): Promise<AuthResponse> => {
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);
    if (data.nickname) {
      formData.append('nickname', data.nickname);
    }
    if (data.avatar) {
      formData.append('avatar', data.avatar);
    }
    const response = await apiClient.post<AuthResponse>('/auth/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
  refresh: async (): Promise<void> => {
    await apiClient.post('/auth/refresh');
  },
  me: async (): Promise<AuthResponse> => {
    const response = await apiClient.get<AuthResponse>('/auth/me');
    return response.data;
  },
  checkNickname: async (nickname: string): Promise<CheckNicknameResponse> => {
    const response = await apiClient.get<CheckNicknameResponse>('/auth/check-nickname', {
      params: { nickname },
    });
    return response.data;
  },
  updateProfile: async (data: UpdateProfileDto): Promise<AuthResponse> => {
    const formData = new FormData();
    formData.append('nickname', data.nickname);
    if (data.avatar) {
      formData.append('avatar', data.avatar);
    }
    const response = await apiClient.patch<AuthResponse>('/auth/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
