import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type UploadFileStatus = 'uploading' | 'paused' | 'success' | 'error';

export interface UploadFile {
  id: string;
  fileName: string;
  progress: number;
  status: UploadFileStatus;
  uploadedBytes: number;
  totalBytes: number;
  error?: string;
  fileId?: string;
  file?: File;
}

interface UploadStore {
  files: Map<string, UploadFile>;
  addFile: (file: UploadFile) => void;
  updateFileProgress: (
    id: string,
    progress: number,
    uploadedBytes: number,
    totalBytes: number
  ) => void;
  updateFileStatus: (id: string, status: UploadFileStatus, error?: string) => void;
  pauseFile: (id: string) => void;
  resumeFile: (id: string) => void;
  cancelFile: (id: string) => void;
  removeFile: (id: string) => void;
  clear: () => void;
}

export const uploadStore = create<UploadStore>()(
  devtools(
    (set) => ({
      files: new Map(),
      addFile: (file) =>
        set((state) => {
          const newFiles = new Map(state.files);
          newFiles.set(file.id, file);
          return { files: newFiles };
        }),
      updateFileProgress: (id, progress, uploadedBytes, totalBytes) =>
        set((state) => {
          const newFiles = new Map(state.files);
          const file = newFiles.get(id);
          if (file) {
            newFiles.set(id, {
              ...file,
              progress,
              uploadedBytes,
              totalBytes,
            });
          }
          return { files: newFiles };
        }),
      updateFileStatus: (id, status, error) =>
        set((state) => {
          const newFiles = new Map(state.files);
          const file = newFiles.get(id);
          if (file) {
            newFiles.set(id, {
              ...file,
              status,
              error,
              progress: status === 'success' ? 100 : file.progress,
            });
          }
          return { files: newFiles };
        }),
      pauseFile: (id) =>
        set((state) => {
          const newFiles = new Map(state.files);
          const file = newFiles.get(id);
          if (file) {
            newFiles.set(id, { ...file, status: 'paused' });
          }
          return { files: newFiles };
        }),
      resumeFile: (id) =>
        set((state) => {
          const newFiles = new Map(state.files);
          const file = newFiles.get(id);
          if (file) {
            newFiles.set(id, { ...file, status: 'uploading' });
          }
          return { files: newFiles };
        }),
      cancelFile: (id) =>
        set((state) => {
          const newFiles = new Map(state.files);
          newFiles.delete(id);
          return { files: newFiles };
        }),
      removeFile: (id) =>
        set((state) => {
          const newFiles = new Map(state.files);
          newFiles.delete(id);
          return { files: newFiles };
        }),
      clear: () => set({ files: new Map() }),
    }),
    { name: 'UploadStore' }
  )
);
