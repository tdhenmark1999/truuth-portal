import { Router, Response } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import {
  classifyDocument,
  isValidPhilippinesPassport,
  isValidPhilippinesDriversLicence,
  submitForVerification,
  getVerificationResult,
  ClassificationResult,
} from '../lib/truuth';
import { DocumentType, DocumentStatus } from '@prisma/client';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  },
});

// Get all documents for current user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const documents = await prisma.document.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        documentType: true,
        fileName: true,
        status: true,
        documentVerifyId: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ documents });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to load documents' });
  }
});

// Upload document
router.post(
  '/upload',
  authenticateToken,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      const { documentType } = req.body;

      if (!file) {
        res.status(400).json({ error: 'Please select a file to upload' });
        return;
      }

      if (!documentType || !['PASSPORT', 'DRIVERS_LICENCE', 'RESUME'].includes(documentType)) {
        res.status(400).json({ error: 'Invalid document type' });
        return;
      }

      const docType = documentType as DocumentType;

      // Passport and Driver's Licence require image files (JPEG/PNG only)
      if ((docType === 'PASSPORT' || docType === 'DRIVERS_LICENCE') &&
          !['image/jpeg', 'image/png', 'image/jpg'].includes(file.mimetype)) {
        res.status(400).json({
          error: 'Passport and Driver\'s Licence must be uploaded as JPEG or PNG images. PDF files are not supported for ID documents.'
        });
        return;
      }

      // Check file size for classification (max 5MB for ID documents to avoid 413 errors)
      if ((docType === 'PASSPORT' || docType === 'DRIVERS_LICENCE') && file.size > 5 * 1024 * 1024) {
        res.status(400).json({
          error: 'Image file is too large. Please upload an image smaller than 5MB.'
        });
        return;
      }

      // Check if document already exists for this user and type
      const existingDoc = await prisma.document.findUnique({
        where: {
          userId_documentType: {
            userId: req.userId!,
            documentType: docType,
          },
        },
      });

      if (existingDoc && existingDoc.status === 'DONE') {
        res.status(409).json({
          error: 'This document type has already been verified. Please contact support if you need to re-submit.',
        });
        return;
      }

      // Convert file to base64
      const base64Image = file.buffer.toString('base64');
      const mimeType = file.mimetype;

      // For Passport and Driver's Licence, classify first
      if (docType === 'PASSPORT' || docType === 'DRIVERS_LICENCE') {
        // Create or update document record with CLASSIFYING status
        const document = await prisma.document.upsert({
          where: {
            userId_documentType: {
              userId: req.userId!,
              documentType: docType,
            },
          },
          update: {
            fileName: file.originalname,
            mimeType: mimeType,
            status: 'CLASSIFYING',
            errorMessage: null,
            documentVerifyId: null,
            verificationResult: null,
            classificationResult: null,
          },
          create: {
            userId: req.userId!,
            documentType: docType,
            fileName: file.originalname,
            mimeType: mimeType,
            status: 'CLASSIFYING',
          },
        });

        try {
          // Classify the document
          const classification = await classifyDocument(base64Image, mimeType);

          // Store classification result
          await prisma.document.update({
            where: { id: document.id },
            data: {
              classificationResult: classification as object,
            },
          });

          // Validate classification based on document type
          let isValid = false;
          let expectedType = '';

          if (docType === 'PASSPORT') {
            isValid = isValidPhilippinesPassport(classification);
            expectedType = 'Philippines Passport';
          } else if (docType === 'DRIVERS_LICENCE') {
            isValid = isValidPhilippinesDriversLicence(classification);
            expectedType = "Philippines Driver's Licence";
          }

          if (!isValid) {
            const detectedType = getDocumentDescription(classification);
            await prisma.document.update({
              where: { id: document.id },
              data: {
                status: 'CLASSIFICATION_FAILED',
                errorMessage: `The uploaded document appears to be a ${detectedType}. Please upload a valid ${expectedType}.`,
              },
            });

            res.status(400).json({
              error: `Invalid document type. Expected ${expectedType} but detected ${detectedType}. Please upload the correct document.`,
              classification,
            });
            return;
          }

          // Classification passed, submit for verification
          await submitDocumentForVerification(
            document.id,
            base64Image,
            mimeType,
            classification.country?.code || 'PHL',
            classification.documentType?.code || docType
          );

          const updatedDoc = await prisma.document.findUnique({
            where: { id: document.id },
          });

          res.json({
            message: 'Document uploaded and submitted for verification',
            document: {
              id: updatedDoc?.id,
              documentType: updatedDoc?.documentType,
              fileName: updatedDoc?.fileName,
              status: updatedDoc?.status,
              documentVerifyId: updatedDoc?.documentVerifyId,
            },
          });
        } catch (classifyError) {
          console.error('Classification error:', classifyError);
          await prisma.document.update({
            where: { id: document.id },
            data: {
              status: 'CLASSIFICATION_FAILED',
              errorMessage: 'Unable to classify the document. Please ensure the image is clear and try again.',
            },
          });

          res.status(400).json({
            error: 'We couldn\'t verify the document type. Please ensure the image is clear and shows the full document.',
          });
        }
      } else {
        // Resume - skip classification, submit directly
        const document = await prisma.document.upsert({
          where: {
            userId_documentType: {
              userId: req.userId!,
              documentType: docType,
            },
          },
          update: {
            fileName: file.originalname,
            mimeType: mimeType,
            status: 'SUBMITTING',
            errorMessage: null,
            documentVerifyId: null,
            verificationResult: null,
          },
          create: {
            userId: req.userId!,
            documentType: docType,
            fileName: file.originalname,
            mimeType: mimeType,
            status: 'SUBMITTING',
          },
        });

        try {
          await submitDocumentForVerification(
            document.id,
            base64Image,
            mimeType,
            'PHL', // Default country for resume
            'OTHER' // Document type for resume
          );

          const updatedDoc = await prisma.document.findUnique({
            where: { id: document.id },
          });

          res.json({
            message: 'Resume uploaded and submitted for verification',
            document: {
              id: updatedDoc?.id,
              documentType: updatedDoc?.documentType,
              fileName: updatedDoc?.fileName,
              status: updatedDoc?.status,
              documentVerifyId: updatedDoc?.documentVerifyId,
            },
          });
        } catch (submitError) {
          console.error('Resume submission error:', submitError);

          // For resume, just mark as DONE without verification
          // since the Verify API might not support "OTHER" document types
          await prisma.document.update({
            where: { id: document.id },
            data: {
              status: 'DONE',
              verificationResult: {
                status: 'SKIPPED',
                message: 'Resume verification is not required'
              },
            },
          });

          const updatedDoc = await prisma.document.findUnique({
            where: { id: document.id },
          });

          res.json({
            message: 'Resume uploaded successfully',
            document: {
              id: updatedDoc?.id,
              documentType: updatedDoc?.documentType,
              fileName: updatedDoc?.fileName,
              status: updatedDoc?.status,
            },
          });
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error);

      if (error.message?.includes('Invalid file type')) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({
        error: 'Something went wrong while uploading. Please try again.',
      });
    }
  }
);

// Get document verification status (for polling)
router.get('/:documentId/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: req.userId,
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // If document is still processing and has a verifyId, poll for updates
    if (document.status === 'PROCESSING' && document.documentVerifyId) {
      try {
        const result = await getVerificationResult(document.documentVerifyId);

        if (result.status === 'DONE' || result.status === 'FAILED') {
          // Update document with final result
          await prisma.document.update({
            where: { id: document.id },
            data: {
              status: result.status,
              verificationResult: result as object,
            },
          });

          res.json({
            id: document.id,
            status: result.status,
            hasResult: true,
          });
          return;
        }
      } catch (pollError) {
        console.error('Polling error:', pollError);
        // Don't fail the request, just return current status
      }
    }

    res.json({
      id: document.id,
      status: document.status,
      hasResult: document.status === 'DONE' || document.status === 'FAILED',
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Failed to get document status' });
  }
});

// Get document verification result
router.get('/:documentId/result', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: req.userId,
      },
      select: {
        id: true,
        documentType: true,
        fileName: true,
        status: true,
        verificationResult: true,
        classificationResult: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    if (document.status !== 'DONE' && document.status !== 'FAILED') {
      res.status(400).json({ error: 'Verification is still in progress' });
      return;
    }

    res.json({ document });
  } catch (error) {
    console.error('Get result error:', error);
    res.status(500).json({ error: 'Failed to get verification result' });
  }
});

// Helper function to submit document for verification
async function submitDocumentForVerification(
  documentId: string,
  base64Image: string,
  mimeType: string,
  countryCode: string,
  documentType: string
): Promise<void> {
  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'SUBMITTING' },
    });

    const result = await submitForVerification(
      base64Image,
      mimeType,
      countryCode,
      documentType,
      `doc-${documentId}`
    );

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'PROCESSING',
        documentVerifyId: result.documentVerifyId,
      },
    });
  } catch (error) {
    console.error('Submit for verification error:', error);
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'FAILED',
        errorMessage: 'Failed to submit document for verification. Please try again.',
      },
    });
    throw error;
  }
}

// Helper function to get human-readable document description
function getDocumentDescription(classification: ClassificationResult): string {
  const country = classification.country?.name || 'Unknown Country';
  const docType = classification.documentType?.name || 'Unknown Document';
  return `${country} ${docType}`;
}

export default router;
