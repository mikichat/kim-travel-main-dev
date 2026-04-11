import express, { Request, Response } from 'express';
import { getPdfPreview, generatePdf, getPdfById } from '../services/pdfService';
import {
  GeneratePdfRequest,
  PdfResponse,
  PdfPreviewResponse,
} from '../../../shared/types/pdf';

const router = express.Router();

/**
 * GET /api/pdf/preview/:itineraryId
 * Get PDF preview data for an itinerary
 */
router.get('/preview/:itineraryId', (req: Request, res: Response) => {
  try {
    const itineraryId = Array.isArray(req.params.itineraryId)
      ? req.params.itineraryId[0]
      : req.params.itineraryId;

    const pdfData = getPdfPreview(itineraryId);

    const response: PdfPreviewResponse = {
      success: true,
      message: 'PDF preview data retrieved successfully',
      data: pdfData,
    };
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Itinerary not found') {
      const response: PdfPreviewResponse = {
        success: false,
        message: error.message,
      };
      return res.status(404).json(response);
    }

    const response: PdfPreviewResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to get PDF preview',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/pdf/generate
 * Generate a PDF brochure
 */
router.post('/generate', (req: Request, res: Response) => {
  try {
    const data: GeneratePdfRequest = req.body;

    // Validate required fields
    if (!data.itineraryId) {
      const response: PdfResponse = {
        success: false,
        message: 'Missing required field: itineraryId',
      };
      return res.status(400).json(response);
    }

    const pdfRecord = generatePdf(data);

    const response: PdfResponse = {
      success: true,
      message: 'PDF generated successfully',
      data: pdfRecord,
    };
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Itinerary not found') {
      const response: PdfResponse = {
        success: false,
        message: error.message,
      };
      return res.status(404).json(response);
    }

    const response: PdfResponse = {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to generate PDF',
    };
    res.status(400).json(response);
  }
});

/**
 * GET /api/pdf/:id
 * Get PDF metadata by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const pdfRecord = getPdfById(id);

    if (!pdfRecord) {
      const response: PdfResponse = {
        success: false,
        message: 'PDF not found',
      };
      return res.status(404).json(response);
    }

    const response: PdfResponse = {
      success: true,
      message: 'PDF retrieved successfully',
      data: pdfRecord,
    };
    res.json(response);
  } catch (error) {
    const response: PdfResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get PDF',
    };
    res.status(500).json(response);
  }
});

export const pdfRouter = router;
