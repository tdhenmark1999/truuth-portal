import { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Document, DocumentType, uploadDocument } from '../lib/api';
import { cn, getStatusLabel, getStatusColor } from '../lib/utils';

interface DocumentCardProps {
  documentType: DocumentType;
  label: string;
  description: string;
  document?: Document;
  onUploadSuccess: () => void;
  onViewResult: (documentId: string) => void;
}

export default function DocumentCard({
  documentType,
  label,
  description,
  document,
  onUploadSuccess,
  onViewResult,
}: DocumentCardProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError('');
    setUploading(true);

    try {
      await uploadDocument(file, documentType);
      onUploadSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const status = document?.status;
  const isProcessing = status === 'PROCESSING' || status === 'CLASSIFYING' || status === 'SUBMITTING';
  const isDone = status === 'DONE';
  const isFailed = status === 'FAILED' || status === 'CLASSIFICATION_FAILED';
  const canUpload = !uploading && !isProcessing && !isDone;

  const getStatusIcon = () => {
    if (isProcessing || uploading) {
      return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
    }
    if (isDone) {
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    }
    if (isFailed) {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
    return <FileText className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="card overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
            isDone ? 'bg-green-100' : isFailed ? 'bg-red-100' : isProcessing ? 'bg-blue-100' : 'bg-gray-100'
          )}>
            {getStatusIcon()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">{label}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{description}</p>
              </div>

              {/* Status Badge */}
              {document && (
                <span className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap',
                  getStatusColor(document.status)
                )}>
                  {getStatusLabel(document.status)}
                </span>
              )}
            </div>

            {/* File info if uploaded */}
            {document && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span className="truncate">{document.fileName}</span>
              </div>
            )}

            {/* Error message */}
            {(error || document?.errorMessage) && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error || document?.errorMessage}</p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex items-center gap-3">
              {/* Upload/Retry button */}
              {canUpload && (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className="relative"
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    onChange={handleChange}
                    className="hidden"
                    id={`file-${documentType}`}
                  />
                  <label
                    htmlFor={`file-${documentType}`}
                    className={cn(
                      'btn cursor-pointer',
                      isFailed
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'btn-primary',
                      dragActive && 'ring-2 ring-truuth-500 ring-offset-2'
                    )}
                  >
                    {isFailed ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {document ? 'Replace' : 'Upload'}
                      </>
                    )}
                  </label>
                </div>
              )}

              {/* Uploading indicator */}
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </div>
              )}

              {/* View Result button */}
              {isDone && document && (
                <button
                  onClick={() => onViewResult(document.id)}
                  className="btn-secondary gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Result
                </button>
              )}

              {/* Processing indicator */}
              {isProcessing && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{getStatusLabel(status!)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
