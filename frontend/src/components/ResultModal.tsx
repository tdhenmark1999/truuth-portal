import { useState, useEffect } from 'react';
import {
  X,
  Download,
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { getDocumentResult, DocumentWithResult } from '../lib/api';
import { cn, getDocumentTypeLabel, formatDate } from '../lib/utils';

interface ResultModalProps {
  documentId: string;
  onClose: () => void;
}

interface CheckResult {
  name: string;
  status: string;
  details?: Record<string, unknown>;
}

export default function ResultModal({ documentId, onClose }: ResultModalProps) {
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<DocumentWithResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const { document } = await getDocumentResult(documentId);
        setDocument(document);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load result');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [documentId]);

  const handleCopy = async () => {
    if (document?.verificationResult) {
      await navigator.clipboard.writeText(
        JSON.stringify(document.verificationResult, null, 2)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (document?.verificationResult) {
      const blob = new Blob(
        [JSON.stringify(document.verificationResult, null, 2)],
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `verification-result-${document.documentType.toLowerCase()}.json`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const toggleCheck = (checkName: string) => {
    const newExpanded = new Set(expandedChecks);
    if (newExpanded.has(checkName)) {
      newExpanded.delete(checkName);
    } else {
      newExpanded.add(checkName);
    }
    setExpandedChecks(newExpanded);
  };

  const result = document?.verificationResult as Record<string, unknown> | undefined;
  const checkResults = (result?.checkResults || result?.checks || []) as CheckResult[];
  const overallStatus = result?.status as string;

  const getCheckStatusIcon = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'PASS' || s === 'PASSED' || s === 'OK') {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    }
    if (s === 'FAIL' || s === 'FAILED') {
      return <XCircle className="w-4 h-4 text-red-600" />;
    }
    if (s === 'WARN' || s === 'WARNING') {
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
    return <div className="w-4 h-4 rounded-full bg-gray-200" />;
  };

  const getCheckStatusColor = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'PASS' || s === 'PASSED' || s === 'OK') return 'bg-green-50 text-green-700';
    if (s === 'FAIL' || s === 'FAILED') return 'bg-red-50 text-red-700';
    if (s === 'WARN' || s === 'WARNING') return 'bg-yellow-50 text-yellow-700';
    return 'bg-gray-50 text-gray-700';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                overallStatus === 'DONE' ? 'bg-green-100' : 'bg-red-100'
              )}>
                {overallStatus === 'DONE' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Verification Result
                </h2>
                <p className="text-sm text-gray-500">
                  {document && getDocumentTypeLabel(document.documentType)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-truuth-600" />
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                <p className="text-red-600">{error}</p>
              </div>
            ) : document ? (
              <div className="space-y-6">
                {/* Document Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">File Name</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {document.fileName}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Submitted</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {formatDate(document.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Check Results Summary */}
                {checkResults.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">
                      Verification Checks
                    </h3>
                    <div className="space-y-2">
                      {checkResults.map((check, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg overflow-hidden"
                        >
                          <button
                            onClick={() => toggleCheck(check.name)}
                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {getCheckStatusIcon(check.status)}
                              <span className="text-sm font-medium text-gray-900">
                                {check.name?.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                'text-xs px-2 py-1 rounded-full font-medium',
                                getCheckStatusColor(check.status)
                              )}>
                                {check.status}
                              </span>
                              {expandedChecks.has(check.name) ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          </button>
                          {expandedChecks.has(check.name) && check.details && (
                            <div className="px-3 pb-3">
                              <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto">
                                {JSON.stringify(check.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw JSON Toggle */}
                <div>
                  <button
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    {showRawJson ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    {showRawJson ? 'Hide' : 'Show'} Raw JSON
                  </button>
                  {showRawJson && (
                    <pre className="mt-3 p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs">
                      {JSON.stringify(document.verificationResult, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          {document && (
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button onClick={handleCopy} className="btn-secondary gap-2">
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy JSON
                  </>
                )}
              </button>
              <button onClick={handleDownload} className="btn-primary gap-2">
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
