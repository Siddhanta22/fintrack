'use client';

/**
 * UploadBox component: handles CSV file uploads.
 * 
 * Features:
 * - Drag and drop support
 * - File validation (CSV only)
 * - Upload progress indication
 * - Error handling
 * 
 * This component uses the HTML5 File API and FormData to upload files.
 * The file is sent as multipart/form-data to the backend.
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface UploadBoxProps {
  onUpload: (file: File) => Promise<void>;
  accountId: number;
  disabled?: boolean;
}

export function UploadBox({ onUpload, accountId, disabled }: UploadBoxProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      
      // Validate file type
      if (!file.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }

      setError(null);
      setUploading(true);

      try {
        await onUpload(file);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    disabled: disabled || uploading,
    multiple: false,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300'}
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-400'}
        `}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm text-gray-600">
              {isDragActive
                ? 'Drop the CSV file here'
                : 'Drag and drop a CSV file, or click to select'}
            </p>
            <p className="text-xs text-gray-500">CSV files only</p>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}

