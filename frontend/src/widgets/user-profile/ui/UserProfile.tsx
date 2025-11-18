import {
  AccountCircle as AccountCircleIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../../features/auth/model/authContext';
import { getFileUrl } from '../../../shared/lib/getFileUrl';
import { cn } from '../../../shared/lib/utils';
import { ProfileEditModal } from './ProfileEditModal';

export const UserProfile = () => {
  const { t } = useTranslation();
  const { data: user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  if (!user) {
    return null;
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleClose();
    setProfileModalOpen(true);
  };

  const handleLogoutClick = async () => {
    handleClose();
    await logout();
  };

  const displayName = user.nickname;
  const open = Boolean(anchorEl);

  return (
    <Box className={cn('flex items-center gap-2')}>
      <Box
        className={cn('flex items-center gap-2 cursor-pointer transition-all hover:opacity-80')}
        onClick={handleClick}
        aria-controls={open ? 'user-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        sx={{
          borderRadius: 1,
          px: 1,
          py: 0.5,
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <Avatar src={getFileUrl(user.avatarUrl)} alt={displayName} className={cn('w-10 h-10')}>
          {displayName.charAt(0).toUpperCase()}
        </Avatar>
        <Box className={cn('hidden md:block')}>
          <Typography
            variant="body2"
            className={cn('font-medium')}
            sx={{
              color: 'text.primary',
              userSelect: 'none',
            }}
          >
            {displayName}
          </Typography>
          <Typography
            variant="caption"
            className={cn('cursor-pointer')}
            component="a"
            href={`mailto:${user.email}`}
            onClick={(e) => e.stopPropagation()}
            sx={{
              color: 'text.secondary',
              textDecoration: 'none',
              '&:hover': {
                color: 'primary.main',
                textDecoration: 'underline',
              },
              transition: 'color 0.2s ease',
            }}
          >
            {user.email}
          </Typography>
        </Box>
        <KeyboardArrowDownIcon
          sx={{
            fontSize: 20,
            color: 'text.secondary',
            transition: 'transform 0.2s ease, color 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </Box>
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1.5,
            minWidth: 200,
            borderRadius: 1,
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
      >
        <MenuItem
          onClick={handleProfileClick}
          sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
        >
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('Профиль')}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogoutClick}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('Выход')}</ListItemText>
        </MenuItem>
      </Menu>
      <ProfileEditModal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </Box>
  );
};
