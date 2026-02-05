import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getDocuments,
  getDocumentStatus,
  Document,
  DocumentType,
} from '../lib/api';
import { LogOut, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import DocumentCard from '../components/DocumentCard';
import ResultModal from '../components/ResultModal';

const REQUIRED_DOCUMENTS: { type: DocumentType; label: string; description: string }[] = [
  {
    type: 'PASSPORT',
    label: 'Philippines Passport',
    description: 'Upload a clear photo or scan of your Philippines passport',
  },
  {
    type: 'DRIVERS_LICENCE',
    label: "Philippines Driver's Licence",
    description: "Upload a clear photo or scan of your Philippines driver's licence",
  },
  {
    type: 'RESUME',
    label: 'Resume',
    description: 'Upload your current resume or CV',
  },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const { documents } = await getDocuments();
      setDocuments(documents);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Poll for processing documents
  useEffect(() => {
    const processingDocs = documents.filter(
      (d) => d.status === 'PROCESSING' || d.status === 'CLASSIFYING' || d.status === 'SUBMITTING'
    );

    if (processingDocs.length === 0) return;

    const interval = setInterval(async () => {
      let hasUpdates = false;

      for (const doc of processingDocs) {
        try {
          const { status } = await getDocumentStatus(doc.id);
          if (status !== doc.status) {
            hasUpdates = true;
          }
        } catch (error) {
          console.error('Failed to poll status:', error);
        }
      }

      if (hasUpdates) {
        fetchDocuments();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  const uploadedCount = documents.filter(
    (d) => d.status !== 'CLASSIFICATION_FAILED' && d.status !== 'PENDING'
  ).length;
  const verifiedCount = documents.filter((d) => d.status === 'DONE').length;
  const totalRequired = REQUIRED_DOCUMENTS.length;

  const getDocumentByType = (type: DocumentType): Document | undefined => {
    return documents.find((d) => d.documentType === type);
  };

  const handleViewResult = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setShowResultModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-truuth-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-truuth-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Truuth Portal</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, <span className="font-medium">{user?.username}</span>
              </span>
              <button
                onClick={logout}
                className="btn-ghost gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Summary */}
        <div className="card p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Document Submission</h1>
              <p className="text-gray-500 mt-1">
                Upload and verify your required documents
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  uploadedCount === totalRequired ? 'bg-green-100' : 'bg-truuth-100'
                }`}>
                  {uploadedCount === totalRequired ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <span className="text-sm font-semibold text-truuth-600">
                      {uploadedCount}/{totalRequired}
                    </span>
                  )}
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Uploaded</div>
                  <div className="text-gray-500">{uploadedCount} of {totalRequired}</div>
                </div>
              </div>
              <div className="h-10 w-px bg-gray-200" />
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  verifiedCount === totalRequired ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {verifiedCount === totalRequired ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <span className="text-sm font-semibold text-gray-600">
                      {verifiedCount}/{totalRequired}
                    </span>
                  )}
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Verified</div>
                  <div className="text-gray-500">{verifiedCount} of {totalRequired}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-truuth-600 rounded-full transition-all duration-500"
                style={{ width: `${(verifiedCount / totalRequired) * 100}%` }}
              />
            </div>
          </div>

          {verifiedCount === totalRequired && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">All documents verified!</p>
                <p className="text-sm text-green-600 mt-0.5">
                  Your document submission is complete. Thank you!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Document Cards */}
        <div className="space-y-4">
          {REQUIRED_DOCUMENTS.map((docInfo) => {
            const document = getDocumentByType(docInfo.type);
            return (
              <DocumentCard
                key={docInfo.type}
                documentType={docInfo.type}
                label={docInfo.label}
                description={docInfo.description}
                document={document}
                onUploadSuccess={fetchDocuments}
                onViewResult={handleViewResult}
              />
            );
          })}
        </div>

        {/* Info Notice */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-800">Document Requirements</p>
            <ul className="text-blue-600 mt-1 space-y-1">
              <li>Passport and Driver's Licence must be from the Philippines</li>
              <li>Ensure images are clear and all text is readable</li>
              <li>Supported formats: JPEG, PNG, PDF (max 10MB)</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Result Modal */}
      {showResultModal && selectedDocumentId && (
        <ResultModal
          documentId={selectedDocumentId}
          onClose={() => {
            setShowResultModal(false);
            setSelectedDocumentId(null);
          }}
        />
      )}
    </div>
  );
}
