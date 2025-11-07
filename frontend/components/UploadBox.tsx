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
        // Clear any previous errors on success
        setError(null);
      } catch (err: any) {
        // Extract error message from various possible error formats
        let errorMessage = 'Upload failed';
        if (err?.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        } else if (err?.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err?.message) {
          errorMessage = err.message;
        } else if (typeof err === 'string') {
          errorMessage = err;
        }
        setError(errorMessage);
        console.error('Upload error:', err);
      } finally {
        setUploading(false);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'], // Excel CSV
      'text/plain': ['.csv'], // Some systems save CSV as plain text
    },
    disabled: disabled || uploading,
    multiple: false,
    // Don't strictly validate MIME type since different systems use different MIME types for CSV
    validator: (file) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        return {
          code: 'invalid-file-type',
          message: 'Please upload a CSV file (.csv extension required)',
        };
      }
      return null;
    },
    onDropRejected: (rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors.length > 0) {
          setError(rejection.errors[0].message || 'File rejected. Please upload a CSV file.');
        }
      }
    },
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-300
          ${isDragActive 
            ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-blue-50 scale-[1.02] shadow-lg' 
            : 'border-gray-300 bg-gray-50/50 hover:border-primary-400 hover:bg-primary-50/30'
          }
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary-200 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
              </div>
            </div>
            <p className="text-base font-medium text-gray-700">Uploading your file...</p>
            <p className="text-sm text-gray-500">Please wait while we process your transactions</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all ${
                isDragActive 
                  ? 'bg-primary-500 scale-110' 
                  : 'bg-gray-200'
              }`}>
                <span className="text-4xl">{isDragActive ? '📤' : '📁'}</span>
              </div>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-700 mb-1">
                {isDragActive
                  ? 'Drop your CSV file here'
                  : 'Drag and drop your CSV file'}
              </p>
              <p className="text-sm text-gray-500">
                {isDragActive ? 'Release to upload' : 'or click to browse'}
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                CSV files only
              </span>
            </div>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 text-red-700 rounded-xl animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1">Upload Failed</p>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 flex-shrink-0"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

