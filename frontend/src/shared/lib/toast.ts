import i18n from 'i18next';
import { type ToastOptions, toast } from 'react-toastify';

const UPLOAD_TOAST_ID = 'upload-progress-toast';

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },
  error: (message: string, options?: ToastOptions) => {
    toast.error(message, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },
  info: (message: string, options?: ToastOptions) => {
    toast.info(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },
  warning: (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      position: 'top-right',
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },
  updateUploadProgress: (uploaded: number, total: number, message?: string) => {
    const toastMessage =
      message ||
      (total === 1
        ? i18n.t('Документ успешно загружен')
        : i18n.t('Загружено успешно {{uploaded}} из {{total}} файлов', { uploaded, total }));

    if (uploaded === 0) {
      toast.success(toastMessage, {
        toastId: UPLOAD_TOAST_ID,
        position: 'top-right',
        autoClose: total === 1 ? 3000 : false,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } else {
      toast.update(UPLOAD_TOAST_ID, {
        render: toastMessage,
        type: 'success',
        autoClose: uploaded === total ? 3000 : false,
        hideProgressBar: false,
      });
    }
  },
  dismissUploadProgress: () => {
    toast.dismiss(UPLOAD_TOAST_ID);
  },
};
