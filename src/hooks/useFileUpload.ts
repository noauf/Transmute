'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { UploadedFile } from '@/types';
import { detectCategory, getExtension, generateId } from '@/lib/fileDetector';
import { getAvailableFormats, getDefaultTarget } from '@/lib/conversionMap';
import {
  persistFile,
  updatePersistedMeta,
  removePersistedFile,
  clearAllPersistedFiles,
  loadPersistedFiles,
} from '@/lib/filePersistence';

export function useFileUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingPersisted, setIsLoadingPersisted] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  // ─── Restore persisted files on mount ─────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const persisted = await loadPersistedFiles();
        if (cancelled) return;
        if (persisted.length > 0) {
          const restored: UploadedFile[] = persisted.map((p) => {
            let preview: string | undefined;
            if (p.category === 'image') {
              preview = URL.createObjectURL(p.file);
            }
            return {
              id: p.id,
              file: p.file,
              name: p.name,
              size: p.size,
              type: p.mimeType,
              category: p.category,
              extension: p.extension,
              preview,
              targetFormat: p.targetFormat,
              availableFormats: p.availableFormats,
              // Reset status to idle on reload (don't carry over 'converting' or 'done')
              status: 'idle' as const,
              progress: 0,
            };
          });
          setFiles(restored);
        }
      } catch {
        // Silently fail — user just gets a fresh start
      } finally {
        if (!cancelled) setIsLoadingPersisted(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const processFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map((file) => {
      const category = detectCategory(file);
      const extension = getExtension(file.name);
      const availableFormats = getAvailableFormats(category, extension);
      const targetFormat = getDefaultTarget(category, extension);

      // Generate preview for images
      let preview: string | undefined;
      if (category === 'image') {
        preview = URL.createObjectURL(file);
      }

      const id = generateId();

      // Persist to IndexedDB (fire-and-forget)
      persistFile(id, file, {
        name: file.name,
        size: file.size,
        mimeType: file.type,
        category,
        extension,
        targetFormat,
        availableFormats,
        status: 'idle',
      }).catch(() => {});

      return {
        id,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        category,
        extension,
        preview,
        targetFormat,
        availableFormats,
        status: 'idle' as const,
        progress: 0,
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCountRef.current = 0;
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        e.target.value = '';
      }
    },
    [processFiles]
  );

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
    // Remove from persistence
    removePersistedFile(id).catch(() => {});
  }, []);

  const updateFile = useCallback((id: string, updates: Partial<UploadedFile>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
    // Sync status changes to persistence
    if (updates.status) {
      updatePersistedMeta(id, { status: updates.status });
    }
  }, []);

  const setTargetFormat = useCallback((id: string, format: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, targetFormat: format } : f))
    );
    // Sync to persistence
    updatePersistedMeta(id, { targetFormat: format });
  }, []);

  const clearAll = useCallback(() => {
    files.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    // Clear all persisted data
    clearAllPersistedFiles().catch(() => {});
  }, [files]);

  const clearCompleted = useCallback(() => {
    setFiles((prev) => {
      const completed = prev.filter((f) => f.status === 'done');
      completed.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
        removePersistedFile(f.id).catch(() => {});
      });
      return prev.filter((f) => f.status !== 'done');
    });
  }, []);

  return {
    files,
    isDragging,
    isLoadingPersisted,
    inputRef,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileInput,
    openFilePicker,
    removeFile,
    updateFile,
    setTargetFormat,
    clearAll,
    clearCompleted,
    setFiles,
  };
}
