import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { Ring } from 'ldrs/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import 'ldrs/react/Ring.css';

import { getErrorMessage } from '../../../entities/error/model/types';
import { useCheckNickname } from '../../../features/auth/hooks/useCheckNickname';
import { useLogin } from '../../../features/auth/hooks/useLogin';
import { useRegister } from '../../../features/auth/hooks/useRegister';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import { scaleIn } from '../../../shared/lib/animations';
import { showToast } from '../../../shared/lib/toast';
import { cn } from '../../../shared/lib/utils';
import { useThemeStore } from '../../../shared/store/theme.store';
import type { TNullable } from '../../../shared/types/nullable';
import { LanguageSwitcher } from '../../../widgets/language-switcher/ui/LanguageSwitcher';
import { ThemeSwitcher } from '../../../widgets/theme-switcher/ui/ThemeSwitcher';

function LoginPage() {
  const { t } = useTranslation();
  const { theme } = useThemeStore();
  const paperRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(0);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginShowPassword, setLoginShowPassword] = useState(false);

  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerShowPassword, setRegisterShowPassword] = useState(false);
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState<TNullable<File>>(null);
  const [avatarPreview, setAvatarPreview] = useState<TNullable<string>>(null);

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const debouncedNickname = useDebounce(nickname, 500);
  const { data: nicknameCheck, isFetching: isCheckingNickname } = useCheckNickname(
    debouncedNickname,
    tab === 1 && debouncedNickname.length >= 3
  );

  useEffect(() => {
    if (paperRef.current) {
      scaleIn(paperRef.current);
    }
  }, []);

  useEffect(() => {
    if (avatar) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(avatar);
    } else {
      setAvatarPreview(null);
    }
  }, [avatar]);

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
    if (tab === 0) {
      loginMutation.mutate({ email: loginEmail, password: loginPassword });
    } else {
      if (!nickname || nickname.length < 3) {
        return;
      }
      registerMutation.mutate({
        email: registerEmail,
        password: registerPassword,
        nickname,
        avatar: avatar || undefined,
      });
    }
  };

  const error = loginMutation.error || registerMutation.error;
  const loading = loginMutation.isPending || registerMutation.isPending;

  const nicknameError =
    tab === 1 && debouncedNickname.length >= 3 && nicknameCheck && !nicknameCheck.available
      ? t('Никнейм уже занят')
      : null;

  const shapeConfigs = [
    {
      type: 'circle',
      size: 80,
      left: '10%',
      top: '20%',
      duration: 20,
      delay: 0,
      x: 50,
      y: -40,
      rotation: 0,
    },
    {
      type: 'triangle',
      size: 100,
      left: '25%',
      top: '60%',
      duration: 25,
      delay: 2,
      x: -60,
      y: 50,
      rotation: 45,
    },
    {
      type: 'square',
      size: 90,
      left: '45%',
      top: '15%',
      duration: 18,
      delay: 4,
      x: 40,
      y: -60,
      rotation: 15,
    },
    {
      type: 'diamond',
      size: 85,
      left: '60%',
      top: '70%',
      duration: 22,
      delay: 1,
      x: -50,
      y: 45,
      rotation: 30,
    },
    {
      type: 'circle',
      size: 110,
      left: '75%',
      top: '30%',
      duration: 24,
      delay: 3,
      x: 70,
      y: -35,
      rotation: 0,
    },
    {
      type: 'triangle',
      size: 95,
      left: '15%',
      top: '80%',
      duration: 19,
      delay: 5,
      x: -40,
      y: 55,
      rotation: 60,
    },
    {
      type: 'square',
      size: 88,
      left: '85%',
      top: '50%',
      duration: 21,
      delay: 2.5,
      x: 45,
      y: -50,
      rotation: 20,
    },
    {
      type: 'diamond',
      size: 105,
      left: '35%',
      top: '45%',
      duration: 23,
      delay: 1.5,
      x: -55,
      y: 40,
      rotation: 45,
    },
  ];

  const reverseShapeConfigs = [
    {
      type: 'circle',
      size: 130,
      right: '8%',
      bottom: '15%',
      duration: 26,
      delay: 0,
      x: -80,
      y: 60,
      rotation: 0,
    },
    {
      type: 'triangle',
      size: 140,
      right: '20%',
      bottom: '60%',
      duration: 28,
      delay: 2,
      x: 70,
      y: -55,
      rotation: 30,
    },
    {
      type: 'square',
      size: 125,
      right: '40%',
      bottom: '25%',
      duration: 27,
      delay: 4,
      x: -65,
      y: 50,
      rotation: 10,
    },
    {
      type: 'diamond',
      size: 135,
      right: '55%',
      bottom: '75%',
      duration: 25,
      delay: 1,
      x: 75,
      y: -45,
      rotation: 25,
    },
    {
      type: 'circle',
      size: 145,
      right: '70%',
      bottom: '40%',
      duration: 29,
      delay: 3,
      x: -85,
      y: 65,
      rotation: 0,
    },
    {
      type: 'triangle',
      size: 120,
      right: '30%',
      bottom: '85%',
      duration: 24,
      delay: 5,
      x: 60,
      y: -50,
      rotation: 50,
    },
  ];

  return (
    <Box
      className={cn('min-h-screen flex flex-col relative overflow-hidden')}
      sx={{
        background:
          theme === 'dark'
            ? 'linear-gradient(135deg, #0d1117 0%, #161b22 25%, #1c2128 50%, #22272e 75%, #0d1117 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 20s ease infinite',
        '@keyframes gradientShift': {
          '0%': {
            backgroundPosition: '0% 50%',
          },
          '50%': {
            backgroundPosition: '100% 50%',
          },
          '100%': {
            backgroundPosition: '0% 50%',
          },
        },
      }}
    >
      <style>
        {`
          @keyframes floatShape {
            0%, 100% {
              transform: translate(0, 0) scale(1) rotate(0deg);
            }
            25% {
              transform: translate(var(--x1), var(--y1)) scale(1.1) rotate(90deg);
            }
            50% {
              transform: translate(var(--x2), var(--y2)) scale(0.9) rotate(180deg);
            }
            75% {
              transform: translate(var(--x3), var(--y3)) scale(1.05) rotate(270deg);
            }
          }
          @keyframes floatShapeReverse {
            0%, 100% {
              transform: translate(0, 0) scale(1) rotate(0deg);
            }
            33% {
              transform: translate(var(--x1), var(--y1)) scale(1.15) rotate(-90deg);
            }
            66% {
              transform: translate(var(--x2), var(--y2)) scale(0.85) rotate(-180deg);
            }
          }
        `}
      </style>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          zIndex: 0,
        }}
      >
        {shapeConfigs.map((config, _i) => {
          const shapeStyle: Record<string, string | number | undefined> = {
            position: 'absolute',
            background:
              theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(12px)',
            animation: `floatShape ${config.duration}s ease-in-out infinite`,
            animationDelay: `${config.delay}s`,
            width: `${config.size}px`,
            height: `${config.size}px`,
            left: config.left,
            top: config.top,
            '--x1': `${config.x}px`,
            '--y1': `${config.y}px`,
            '--x2': `${-config.x * 0.7}px`,
            '--y2': `${config.y * 1.3}px`,
            '--x3': `${config.x * 0.5}px`,
            '--y3': `${config.y * 0.6}px`,
          };

          if (config.type === 'circle') {
            shapeStyle.borderRadius = '50%';
          } else if (config.type === 'triangle') {
            shapeStyle.background = 'transparent';
            shapeStyle.borderLeft = `${config.size / 2}px solid transparent`;
            shapeStyle.borderRight = `${config.size / 2}px solid transparent`;
            shapeStyle.borderBottom = `${config.size * 0.866}px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.15)'}`;
            shapeStyle.width = '0';
            shapeStyle.height = '0';
            shapeStyle.backdropFilter = 'none';
          } else if (config.type === 'square') {
            shapeStyle.borderRadius = '8px';
            shapeStyle.transform = `rotate(${config.rotation}deg)`;
          } else if (config.type === 'diamond') {
            shapeStyle.borderRadius = '0';
            shapeStyle.transform = `rotate(45deg)`;
            shapeStyle.width = `${config.size * Math.SQRT1_2}px`;
            shapeStyle.height = `${config.size * Math.SQRT1_2}px`;
          }

          return (
            <Box
              key={`shape-${config.type}-${config.left}-${config.top}-${config.size}`}
              sx={shapeStyle}
            />
          );
        })}
        {reverseShapeConfigs.map((config, _i) => {
          const shapeStyle: Record<string, string | number | undefined> = {
            position: 'absolute',
            background: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            animation: `floatShapeReverse ${config.duration}s ease-in-out infinite`,
            animationDelay: `${config.delay}s`,
            width: `${config.size}px`,
            height: `${config.size}px`,
            right: config.right,
            bottom: config.bottom,
            '--x1': `${config.x}px`,
            '--y1': `${config.y}px`,
            '--x2': `${-config.x * 0.8}px`,
            '--y2': `${-config.y * 0.7}px`,
          };

          if (config.type === 'circle') {
            shapeStyle.borderRadius = '50%';
          } else if (config.type === 'triangle') {
            shapeStyle.background = 'transparent';
            shapeStyle.borderLeft = `${config.size / 2}px solid transparent`;
            shapeStyle.borderRight = `${config.size / 2}px solid transparent`;
            shapeStyle.borderBottom = `${config.size * 0.866}px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.1)'}`;
            shapeStyle.width = '0';
            shapeStyle.height = '0';
            shapeStyle.backdropFilter = 'none';
          } else if (config.type === 'square') {
            shapeStyle.borderRadius = '8px';
            shapeStyle.transform = `rotate(${config.rotation}deg)`;
          } else if (config.type === 'diamond') {
            shapeStyle.borderRadius = '0';
            shapeStyle.transform = `rotate(45deg)`;
            shapeStyle.width = `${config.size * Math.SQRT1_2}px`;
            shapeStyle.height = `${config.size * Math.SQRT1_2}px`;
          }

          return (
            <Box
              key={`reverse-shape-${config.type}-${config.right}-${config.bottom}-${config.size}`}
              sx={shapeStyle}
            />
          );
        })}
      </Box>

      <AppBar
        position="absolute"
        elevation={0}
        sx={{
          backgroundColor: 'transparent',
          boxShadow: 'none',
          zIndex: 1,
        }}
      >
        <Toolbar className={cn('justify-end')}>
          <Box className={cn('flex items-center gap-2')}>
            <LanguageSwitcher />
            <ThemeSwitcher />
          </Box>
        </Toolbar>
      </AppBar>

      <Container
        maxWidth="sm"
        className={cn('flex-1 flex items-center justify-center py-8 px-4 pt-20')}
        sx={{ position: 'relative', zIndex: 1 }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: '440px',
          }}
        >
          <Paper
            ref={paperRef}
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor:
                theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)',
              overflow: 'hidden',
              background: theme === 'dark' ? 'rgba(33, 38, 45, 0.89)' : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              boxShadow:
                theme === 'dark'
                  ? '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
                  : '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            }}
          >
            <Box sx={{ px: 4, pt: 5, pb: 3 }}>
              <Typography
                variant="h5"
                component="h1"
                sx={{
                  fontWeight: 600,
                  mb: 0.5,
                  textAlign: 'center',
                }}
              >
                {t('Добро пожаловать')}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  textAlign: 'center',
                  mb: 4,
                }}
              >
                {tab === 0 ? t('Войдите в свой аккаунт') : t('Создайте новый аккаунт')}
              </Typography>

              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="fullWidth"
                sx={{
                  mb: 3,
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.95rem',
                    minHeight: 44,
                    px: 2,
                  },
                  '& .MuiTabs-indicator': {
                    height: 2,
                  },
                }}
              >
                <Tab label={t('Вход')} />
                <Tab label={t('Регистрация')} />
              </Tabs>
            </Box>

            <Box sx={{ px: 4, pb: 5 }}>
              {error && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                  }}
                >
                  {getErrorMessage(error)}
                </Alert>
              )}

              <Box
                sx={{
                  minHeight: tab === 0 ? 'auto' : 'auto',
                }}
              >
                <form onSubmit={handleSubmit}>
                  {tab === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <TextField
                        fullWidth
                        label={t('Email')}
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        autoComplete="email"
                        variant="outlined"
                        size="medium"
                      />
                      <TextField
                        fullWidth
                        label={t('Пароль')}
                        type={loginShowPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        variant="outlined"
                        size="medium"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label={t('Показать пароль')}
                                onClick={() => setLoginShowPassword(!loginShowPassword)}
                                edge="end"
                                size="small"
                              >
                                {loginShowPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={loading}
                        size="large"
                        sx={{
                          mt: 1,
                          py: 1.5,
                          textTransform: 'none',
                          fontSize: '0.95rem',
                          fontWeight: 500,
                        }}
                      >
                        {loading ? (
                          <Box className={cn('flex items-center justify-center gap-2')}>
                            <Ring size="18" stroke="4" bgOpacity="0" speed="2" color="#fff" />
                            <span>{t('Загрузка...')}</span>
                          </Box>
                        ) : (
                          t('Войти')
                        )}
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <TextField
                        fullWidth
                        label={t('Email')}
                        type="email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        required
                        autoComplete="email"
                        variant="outlined"
                        size="medium"
                      />
                      <TextField
                        fullWidth
                        label={t('Пароль')}
                        type={registerShowPassword ? 'text' : 'password'}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        helperText={t('Минимум 6 символов')}
                        variant="outlined"
                        size="medium"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label={t('Показать пароль')}
                                onClick={() => setRegisterShowPassword(!registerShowPassword)}
                                edge="end"
                                size="small"
                              >
                                {registerShowPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                      <TextField
                        fullWidth
                        label={t('Никнейм')}
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        required
                        error={!!nicknameError}
                        helperText={
                          nicknameError ||
                          (isCheckingNickname
                            ? t('Проверка...')
                            : t('Минимум 3 символа, только буквы, цифры и подчеркивания'))
                        }
                        variant="outlined"
                        size="medium"
                      />
                      <Box>
                        <input
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          style={{ display: 'none' }}
                          id="avatar-upload"
                          type="file"
                          onChange={handleAvatarChange}
                        />
                        <label htmlFor="avatar-upload">
                          <Button
                            variant="outlined"
                            component="span"
                            fullWidth
                            size="medium"
                            sx={{
                              textTransform: 'none',
                              py: 1.5,
                            }}
                          >
                            {avatar ? t('Изменить аватар') : t('Выбрать аватар')}
                          </Button>
                        </label>
                        {avatarPreview && (
                          <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'center' }}>
                            <img
                              src={avatarPreview}
                              alt={t('Превью аватара')}
                              className={cn('w-24 h-24 rounded-full object-cover border-2')}
                              style={{ borderColor: 'rgba(0, 0, 0, 0.12)' }}
                            />
                          </Box>
                        )}
                        {avatar && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mt: 1,
                              textAlign: 'center',
                              color: 'text.secondary',
                            }}
                          >
                            {t('Размер')}: {(avatar.size / 1024 / 1024).toFixed(2)} {t('МБ')}
                            {avatar.size > 15 * 1024 * 1024 && (
                              <span style={{ color: '#d32f2f' }}>
                                {' '}
                                {t('(превышен лимит 15 МБ)')}
                              </span>
                            )}
                          </Typography>
                        )}
                      </Box>
                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={loading || !!nicknameError || !nickname || nickname.length < 3}
                        size="large"
                        sx={{
                          mt: 1,
                          py: 1.5,
                          textTransform: 'none',
                          fontSize: '0.95rem',
                          fontWeight: 500,
                        }}
                      >
                        {loading ? (
                          <Box className={cn('flex items-center justify-center gap-2')}>
                            <Ring size="18" stroke="4" bgOpacity="0" speed="2" color="#fff" />
                            <span>{t('Загрузка...')}</span>
                          </Box>
                        ) : (
                          t('Зарегистрироваться')
                        )}
                      </Button>
                    </Box>
                  )}
                </form>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}

export default LoginPage;
