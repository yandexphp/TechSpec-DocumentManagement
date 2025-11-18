import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type UploadFile, uploadStore } from '../upload.store';

describe('uploadStore', () => {
  beforeEach(() => {
    uploadStore.getState().clear();
  });

  afterEach(() => {
    uploadStore.getState().clear();
  });

  it('should add file to store', () => {
    const file: UploadFile = {
      id: '1',
      fileName: 'test.pdf',
      progress: 0,
      status: 'uploading',
      uploadedBytes: 0,
      totalBytes: 1024,
    };

    uploadStore.getState().addFile(file);
    const files = Array.from(uploadStore.getState().files.values());
    expect(files).toHaveLength(1);
    expect(files[0]).toEqual(file);
  });

  it('should update file progress', () => {
    const file: UploadFile = {
      id: '1',
      fileName: 'test.pdf',
      progress: 0,
      status: 'uploading',
      uploadedBytes: 0,
      totalBytes: 1024,
    };

    uploadStore.getState().addFile(file);
    uploadStore.getState().updateFileProgress('1', 50, 512, 1024);

    const updatedFile = uploadStore.getState().files.get('1');
    expect(updatedFile?.progress).toBe(50);
    expect(updatedFile?.uploadedBytes).toBe(512);
    expect(updatedFile?.totalBytes).toBe(1024);
  });

  it('should update file status', () => {
    const file: UploadFile = {
      id: '1',
      fileName: 'test.pdf',
      progress: 50,
      status: 'uploading',
      uploadedBytes: 512,
      totalBytes: 1024,
    };

    uploadStore.getState().addFile(file);
    uploadStore.getState().updateFileStatus('1', 'success');

    const updatedFile = uploadStore.getState().files.get('1');
    expect(updatedFile?.status).toBe('success');
    expect(updatedFile?.progress).toBe(100);
  });

  it('should update file status with error', () => {
    const file: UploadFile = {
      id: '1',
      fileName: 'test.pdf',
      progress: 50,
      status: 'uploading',
      uploadedBytes: 512,
      totalBytes: 1024,
    };

    uploadStore.getState().addFile(file);
    uploadStore.getState().updateFileStatus('1', 'error', 'Upload failed');

    const updatedFile = uploadStore.getState().files.get('1');
    expect(updatedFile?.status).toBe('error');
    expect(updatedFile?.error).toBe('Upload failed');
  });

  it('should pause file', () => {
    const file: UploadFile = {
      id: '1',
      fileName: 'test.pdf',
      progress: 50,
      status: 'uploading',
      uploadedBytes: 512,
      totalBytes: 1024,
    };

    uploadStore.getState().addFile(file);
    uploadStore.getState().pauseFile('1');

    const pausedFile = uploadStore.getState().files.get('1');
    expect(pausedFile?.status).toBe('paused');
  });

  it('should resume file', () => {
    const file: UploadFile = {
      id: '1',
      fileName: 'test.pdf',
      progress: 50,
      status: 'paused',
      uploadedBytes: 512,
      totalBytes: 1024,
    };

    uploadStore.getState().addFile(file);
    uploadStore.getState().resumeFile('1');

    const resumedFile = uploadStore.getState().files.get('1');
    expect(resumedFile?.status).toBe('uploading');
  });

  it('should cancel file', () => {
    const file: UploadFile = {
      id: '1',
      fileName: 'test.pdf',
      progress: 50,
      status: 'uploading',
      uploadedBytes: 512,
      totalBytes: 1024,
    };

    uploadStore.getState().addFile(file);
    uploadStore.getState().cancelFile('1');

    const files = Array.from(uploadStore.getState().files.values());
    expect(files).toHaveLength(0);
  });

  it('should remove file', () => {
    const file: UploadFile = {
      id: '1',
      fileName: 'test.pdf',
      progress: 50,
      status: 'uploading',
      uploadedBytes: 512,
      totalBytes: 1024,
    };

    uploadStore.getState().addFile(file);
    uploadStore.getState().removeFile('1');

    const files = Array.from(uploadStore.getState().files.values());
    expect(files).toHaveLength(0);
  });

  it('should clear all files', () => {
    const file1: UploadFile = {
      id: '1',
      fileName: 'test1.pdf',
      progress: 50,
      status: 'uploading',
      uploadedBytes: 512,
      totalBytes: 1024,
    };
    const file2: UploadFile = {
      id: '2',
      fileName: 'test2.pdf',
      progress: 30,
      status: 'uploading',
      uploadedBytes: 307,
      totalBytes: 1024,
    };

    uploadStore.getState().addFile(file1);
    uploadStore.getState().addFile(file2);
    uploadStore.getState().clear();

    const files = Array.from(uploadStore.getState().files.values());
    expect(files).toHaveLength(0);
  });
});
