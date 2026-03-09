'use client';

import { useCallback, useState } from 'react';
import { UploadedFile } from '@/types';
import { convertImage } from '@/lib/converters/imageConverter';
import { convertData } from '@/lib/converters/dataConverter';
import { convertDocument } from '@/lib/converters/documentConverter';
import { convertMedia } from '@/lib/converters/mediaConverter';
import { convertSpreadsheet, isSpreadsheetConversion } from '@/lib/converters/spreadsheetConverter';
import { convertEbook, isEbookConversion } from '@/lib/converters/ebookConverter';
import { convertPresentation, isPresentationConversion } from '@/lib/converters/presentationConverter';
import { convertFont, isFontConversion } from '@/lib/converters/fontConverter';
import { getExtension } from '@/lib/fileDetector';

export function useConversion(
  updateFile: (id: string, updates: Partial<UploadedFile>) => void
) {
  const [isConverting, setIsConverting] = useState(false);

  const convertSingleFile = useCallback(
    async (file: UploadedFile) => {
      if (!file.targetFormat || file.status === 'done') return;

      updateFile(file.id, { status: 'converting', progress: 0, error: undefined });

      try {
        const onProgress = (progress: number) => {
          updateFile(file.id, { progress });
        };

        let result;
        const ext = getExtension(file.file.name);

        // Route spreadsheet conversions (xlsx/xls/ods sources or targets)
        if (file.category === 'data' && isSpreadsheetConversion(ext, file.targetFormat)) {
          result = await convertSpreadsheet(file.file, file.targetFormat, onProgress);
        } else if (file.category === 'data' && isFontConversion(ext, file.targetFormat)) {
          result = await convertFont(file.file, file.targetFormat, onProgress);
        } else if (file.category === 'document' && isPresentationConversion(ext, file.targetFormat)) {
          result = await convertPresentation(file.file, file.targetFormat, onProgress);
        } else if (file.category === 'document' && isEbookConversion(ext, file.targetFormat)) {
          result = await convertEbook(file.file, file.targetFormat, onProgress);
        } else {
          switch (file.category) {
            case 'image':
              result = await convertImage(file.file, file.targetFormat, onProgress);
              break;
            case 'data':
              result = await convertData(file.file, file.targetFormat, onProgress);
              break;
            case 'document':
              result = await convertDocument(file.file, file.targetFormat, onProgress);
              break;
            case 'audio':
            case 'video':
              result = await convertMedia(file.file, file.targetFormat, onProgress);
              break;
            default:
              throw new Error(`Unsupported file category: ${file.category}`);
          }
        }

        updateFile(file.id, {
          status: 'done',
          progress: 100,
          convertedBlob: result.blob,
          convertedName: result.filename,
        });
      } catch (error) {
        updateFile(file.id, {
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Conversion failed',
        });
      }
    },
    [updateFile]
  );

  const convertAll = useCallback(
    async (files: UploadedFile[]) => {
      setIsConverting(true);
      const toConvert = files.filter(
        (f) => f.targetFormat && f.status !== 'done' && f.availableFormats.length > 0
      );

      // Convert in parallel batches of 3
      const batchSize = 3;
      for (let i = 0; i < toConvert.length; i += batchSize) {
        const batch = toConvert.slice(i, i + batchSize);
        await Promise.all(batch.map((f) => convertSingleFile(f)));
      }

      setIsConverting(false);
    },
    [convertSingleFile]
  );

  const downloadFile = useCallback((file: UploadedFile) => {
    if (!file.convertedBlob || !file.convertedName) return;

    const url = URL.createObjectURL(file.convertedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.convertedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const downloadAllAsZip = useCallback(async (files: UploadedFile[]) => {
    const completedFiles = files.filter(
      (f) => f.status === 'done' && f.convertedBlob
    );
    if (completedFiles.length === 0) return;

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    completedFiles.forEach((f) => {
      if (f.convertedBlob && f.convertedName) {
        zip.file(f.convertedName, f.convertedBlob);
      }
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transmute-converted.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return {
    isConverting,
    convertAll,
    convertSingleFile,
    downloadFile,
    downloadAllAsZip,
  };
}
