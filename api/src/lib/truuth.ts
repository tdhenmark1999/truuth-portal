import FormData from 'form-data';

const TRUUTH_API_KEY = process.env.TRUUTH_API_KEY!;
const TRUUTH_API_SECRET = process.env.TRUUTH_API_SECRET!;
const TRUUTH_TENANT_ALIAS = process.env.TRUUTH_TENANT_ALIAS || 'truuthhiring';

// API Endpoints (AU region - corrected endpoints from challenge update)
const CLASSIFIER_API = 'https://api.au.truuth.id/document-management/v1/classify';
const VERIFY_SUBMIT_API = `https://submissions.api.au.truuth.id/verify-document/v1/tenants/${TRUUTH_TENANT_ALIAS}/documents/submit`;
const VERIFY_RESULT_API = `https://submissions.api.au.truuth.id/verify-document/v1/tenants/${TRUUTH_TENANT_ALIAS}/documents`;

function getAuthHeader(): string {
  const credentials = Buffer.from(`${TRUUTH_API_KEY}:${TRUUTH_API_SECRET}`).toString('base64');
  return `Basic ${credentials}`;
}

export interface ClassificationResult {
  country?: {
    code: string;
    name: string;
  };
  documentType?: {
    code: string;
    name: string;
  };
}

export interface VerifySubmitResult {
  documentVerifyId: string;
  status: string;
}

export interface VerifyStatusResult {
  documentVerifyId: string;
  status: 'PROCESSING' | 'DONE' | 'FAILED';
  [key: string]: unknown;
}

/**
 * Classify a document image to determine its type and country
 */
export async function classifyDocument(
  imageBase64: string,
  mimeType: string
): Promise<ClassificationResult> {
  const response = await fetch(CLASSIFIER_API, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images: [
        {
          image: imageBase64,
          mimeType: mimeType,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Classification API error:', response.status, errorText);
    throw new Error(`Classification failed: ${response.status}`);
  }

  const result = await response.json();
  return result as ClassificationResult;
}

/**
 * Validate classification result for Philippines Passport
 */
export function isValidPhilippinesPassport(result: ClassificationResult): boolean {
  return (
    result.country?.code === 'PHL' &&
    result.documentType?.code === 'PASSPORT'
  );
}

/**
 * Validate classification result for Philippines Driver's Licence
 */
export function isValidPhilippinesDriversLicence(result: ClassificationResult): boolean {
  return (
    result.country?.code === 'PHL' &&
    result.documentType?.code === 'DRIVERS_LICENCE'
  );
}

/**
 * Submit a document for verification
 */
export async function submitForVerification(
  imageBase64: string,
  mimeType: string,
  countryCode: string,
  documentType: string,
  externalRefId?: string
): Promise<VerifySubmitResult> {
  const requestBody = {
    document: {
      countryCode: countryCode,
      documentType: documentType,
      image: {
        content: imageBase64,
        mimeType: mimeType,
      },
    },
    externalRefId: externalRefId || `truuth-portal-${Date.now()}`,
    options: {
      requiredChecks: [
        { name: 'ANNOTATION' },
        { name: 'C2PA' },
        { name: 'COMPRESSION_HEATMAP' },
        { name: 'DEEPFAKE_2' },
        { name: 'DEEPFAKE_3' },
        { name: 'DEEPFAKE_4' },
        { name: 'DEEPFAKE_5' },
        { name: 'DEEPFAKE_6' },
        { name: 'DEEPFAKE_7' },
        { name: 'DEEPFAKE' },
        { name: 'EOF_COUNT' },
        { name: 'HANDWRITING' },
        { name: 'INVOICE_DATE_ANOMALY_CHECK' },
        { name: 'INVOICE_TOTAL_ANOMALY_CHECK' },
        { name: 'SCREENSHOT' },
        { name: 'SOFTWARE_EDITOR' },
        { name: 'SOFTWARE_FINGERPRINT' },
        { name: 'TIMESTAMP' },
        { name: 'VENDOR_MISSING_FIELDS' },
        { name: 'VENDOR_VALIDATION' },
        { name: 'VISUAL_ANOMALY' },
        { name: 'WATERMARK_CHECK' },
      ],
    },
  };

  const response = await fetch(VERIFY_SUBMIT_API, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Verify Submit API error:', response.status, errorText);
    throw new Error(`Verification submission failed: ${response.status}`);
  }

  const result = await response.json();
  return result as VerifySubmitResult;
}

/**
 * Get verification result status
 */
export async function getVerificationResult(
  documentVerifyId: string
): Promise<VerifyStatusResult> {
  const response = await fetch(`${VERIFY_RESULT_API}/${documentVerifyId}`, {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader(),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Verify Result API error:', response.status, errorText);
    throw new Error(`Failed to get verification result: ${response.status}`);
  }

  const result = await response.json();
  return result as VerifyStatusResult;
}
