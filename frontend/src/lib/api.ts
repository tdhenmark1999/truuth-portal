const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface ApiError {
  error: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');

  const headers: HeadersInit = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ApiError).error || 'An error occurred');
  }

  return data as T;
}

// Auth API
export interface User {
  id: string;
  username: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function register(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function getMe(): Promise<{ user: User }> {
  return request<{ user: User }>('/auth/me');
}

// Documents API
export type DocumentType = 'PASSPORT' | 'DRIVERS_LICENCE' | 'RESUME';
export type DocumentStatus =
  | 'PENDING'
  | 'CLASSIFYING'
  | 'CLASSIFICATION_FAILED'
  | 'SUBMITTING'
  | 'PROCESSING'
  | 'DONE'
  | 'FAILED';

export interface Document {
  id: string;
  documentType: DocumentType;
  fileName: string;
  status: DocumentStatus;
  documentVerifyId?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentWithResult extends Document {
  verificationResult?: Record<string, unknown>;
  classificationResult?: Record<string, unknown>;
}

export async function getDocuments(): Promise<{ documents: Document[] }> {
  return request<{ documents: Document[] }>('/documents');
}

export async function uploadDocument(
  file: File,
  documentType: DocumentType
): Promise<{ message: string; document: Document }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);

  return request<{ message: string; document: Document }>('/documents/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function getDocumentStatus(
  documentId: string
): Promise<{ id: string; status: DocumentStatus; hasResult: boolean }> {
  return request<{ id: string; status: DocumentStatus; hasResult: boolean }>(
    `/documents/${documentId}/status`
  );
}

export async function getDocumentResult(
  documentId: string
): Promise<{ document: DocumentWithResult }> {
  return request<{ document: DocumentWithResult }>(`/documents/${documentId}/result`);
}
