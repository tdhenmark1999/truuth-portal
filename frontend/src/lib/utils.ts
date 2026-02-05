import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getDocumentTypeLabel(type: string): string {
  switch (type) {
    case 'PASSPORT':
      return 'Philippines Passport';
    case 'DRIVERS_LICENCE':
      return "Philippines Driver's Licence";
    case 'RESUME':
      return 'Resume';
    default:
      return type;
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'CLASSIFYING':
      return 'Verifying document type...';
    case 'CLASSIFICATION_FAILED':
      return 'Invalid document type';
    case 'SUBMITTING':
      return 'Submitting...';
    case 'PROCESSING':
      return 'Processing verification...';
    case 'DONE':
      return 'Verified';
    case 'FAILED':
      return 'Verification failed';
    default:
      return status;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'DONE':
      return 'text-green-600 bg-green-50';
    case 'PROCESSING':
    case 'CLASSIFYING':
    case 'SUBMITTING':
      return 'text-blue-600 bg-blue-50';
    case 'CLASSIFICATION_FAILED':
    case 'FAILED':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}
