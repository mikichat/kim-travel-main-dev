import express, { Request, Response } from 'express';
import {
  getAllInvoices,
  getInvoiceById,
  getInvoiceByNumber,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
} from '../services/invoiceService';

const router = express.Router();

// Response types
interface InvoiceResponse {
  success: boolean;
  message: string;
  data?: any;
}

interface InvoiceListResponse extends InvoiceResponse {
  data?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * GET /api/invoices
 * Get all invoices with optional pagination
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page
      ? parseInt(req.query.page as string, 10)
      : undefined;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : undefined;

    const { invoices, total } = await getAllInvoices(page, limit);

    const response: InvoiceListResponse = {
      success: true,
      message: 'Invoices retrieved successfully',
      data: invoices,
    };

    if (page !== undefined && limit !== undefined) {
      response.pagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    }

    res.json(response);
  } catch (error) {
    const response: InvoiceListResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get invoices',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/invoices/:id
 * Get invoice by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const invoice = await getInvoiceById(id);

    if (!invoice) {
      const response: InvoiceResponse = {
        success: false,
        message: 'Invoice not found',
      };
      return res.status(404).json(response);
    }

    const response: InvoiceResponse = {
      success: true,
      message: 'Invoice retrieved successfully',
      data: invoice,
    };
    res.json(response);
  } catch (error) {
    const response: InvoiceResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get invoice',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/invoices/number/:invoiceNumber
 * Get invoice by invoice number
 */
router.get('/number/:invoiceNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const invoiceNumber = Array.isArray(req.params.invoiceNumber)
      ? req.params.invoiceNumber[0]
      : req.params.invoiceNumber;
    const invoice = await getInvoiceByNumber(invoiceNumber);

    if (!invoice) {
      const response: InvoiceResponse = {
        success: false,
        message: 'Invoice not found',
      };
      return res.status(404).json(response);
    }

    const response: InvoiceResponse = {
      success: true,
      message: 'Invoice retrieved successfully',
      data: invoice,
    };
    res.json(response);
  } catch (error) {
    const response: InvoiceResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get invoice',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/invoices
 * Create a new invoice
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const data: CreateInvoiceRequest = req.body;
    const invoice = await createInvoice(data);

    const response: InvoiceResponse = {
      success: true,
      message: 'Invoice created successfully',
      data: invoice,
    };
    res.status(201).json(response);
  } catch (error) {
    const response: InvoiceResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create invoice',
    };
    res.status(400).json(response);
  }
});

/**
 * PUT /api/invoices/:id
 * Update an invoice
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data: UpdateInvoiceRequest = req.body;
    const invoice = await updateInvoice(id, data);

    const response: InvoiceResponse = {
      success: true,
      message: 'Invoice updated successfully',
      data: invoice,
    };
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invoice not found') {
      const response: InvoiceResponse = {
        success: false,
        message: error.message,
      };
      return res.status(404).json(response);
    }

    const response: InvoiceResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update invoice',
    };
    res.status(400).json(response);
  }
});

/**
 * DELETE /api/invoices/:id
 * Delete an invoice
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await deleteInvoice(id);

    const response: InvoiceResponse = {
      success: true,
      message: 'Invoice deleted successfully',
    };
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invoice not found') {
      const response: InvoiceResponse = {
        success: false,
        message: error.message,
      };
      return res.status(404).json(response);
    }

    const response: InvoiceResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete invoice',
    };
    res.status(500).json(response);
  }
});

export default router;