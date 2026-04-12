import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// ==========================================
// Invoice Types
// ==========================================
export interface CreateInvoiceRequest {
  invoiceNumber: string;
  recipient?: string;
  invoiceDate?: string;
  description?: string;
  totalAmount?: number;
  flightScheduleId?: string;
  bankAccountId?: string;
  // Simple mode
  airfareUnitPrice?: number;
  airfareQuantity?: number;
  airfareTotal?: number;
  seatPreferenceUnitPrice?: number;
  seatPreferenceQuantity?: number;
  seatPreferenceTotal?: number;
  // Advanced mode
  calculationMode?: string;
  basePricePerPerson?: number;
  totalParticipants?: number;
  totalTravelCost?: number;
  depositAmount?: number;
  depositDescription?: string;
  additionalItems?: string;
  balanceDue?: number;
  // Files
  logoPath?: string;
  sealPath?: string;
  pdfFilePath?: string;
}

export interface UpdateInvoiceRequest {
  recipient?: string;
  invoiceDate?: string;
  description?: string;
  totalAmount?: number;
  flightScheduleId?: string;
  bankAccountId?: string;
  // Simple mode
  airfareUnitPrice?: number;
  airfareQuantity?: number;
  airfareTotal?: number;
  seatPreferenceUnitPrice?: number;
  seatPreferenceQuantity?: number;
  seatPreferenceTotal?: number;
  // Advanced mode
  calculationMode?: string;
  basePricePerPerson?: number;
  totalParticipants?: number;
  totalTravelCost?: number;
  depositAmount?: number;
  depositDescription?: string;
  additionalItems?: string;
  balanceDue?: number;
  // Files
  logoPath?: string;
  sealPath?: string;
  pdfFilePath?: string;
}

// ==========================================
// Service Functions
// ==========================================

/**
 * Get all invoices with optional pagination
 */
export async function getAllInvoices(
  page?: number,
  limit?: number
): Promise<{ invoices: any[]; total: number }> {
  const total = await prisma.invoice.count();

  if (page === undefined || limit === undefined) {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        flightSchedule: true,
        bankAccount: true,
      },
    });
    return { invoices, total };
  }

  const skip = (page - 1) * limit;
  const invoices = await prisma.invoice.findMany({
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      flightSchedule: true,
      bankAccount: true,
    },
  });

  return { invoices, total };
}

/**
 * Get invoice by ID
 */
export async function getInvoiceById(id: string): Promise<any | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      flightSchedule: true,
      bankAccount: true,
    },
  });
  return invoice;
}

/**
 * Get invoice by invoice number
 */
export async function getInvoiceByNumber(invoiceNumber: string): Promise<any | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceNumber },
    include: {
      flightSchedule: true,
      bankAccount: true,
    },
  });
  return invoice;
}

/**
 * Create a new invoice
 */
export async function createInvoice(data: CreateInvoiceRequest): Promise<any> {
  // Validate required fields
  if (!data.invoiceNumber || data.invoiceNumber.trim() === '') {
    throw new Error('Invoice number is required');
  }

  // Check for duplicate invoice number
  const existing = await prisma.invoice.findUnique({
    where: { invoiceNumber: data.invoiceNumber },
  });
  if (existing) {
    throw new Error('Invoice with this number already exists');
  }

  const invoice = await prisma.invoice.create({
    data: {
      id: uuidv4(),
      invoiceNumber: data.invoiceNumber.trim(),
      recipient: data.recipient,
      invoiceDate: data.invoiceDate,
      description: data.description,
      totalAmount: data.totalAmount || 0,
      flightScheduleId: data.flightScheduleId,
      bankAccountId: data.bankAccountId,
      // Simple mode
      airfareUnitPrice: data.airfareUnitPrice,
      airfareQuantity: data.airfareQuantity,
      airfareTotal: data.airfareTotal,
      seatPreferenceUnitPrice: data.seatPreferenceUnitPrice,
      seatPreferenceQuantity: data.seatPreferenceQuantity,
      seatPreferenceTotal: data.seatPreferenceTotal,
      // Advanced mode
      calculationMode: data.calculationMode,
      basePricePerPerson: data.basePricePerPerson,
      totalParticipants: data.totalParticipants,
      totalTravelCost: data.totalTravelCost,
      depositAmount: data.depositAmount,
      depositDescription: data.depositDescription,
      additionalItems: data.additionalItems,
      balanceDue: data.balanceDue,
      // Files
      logoPath: data.logoPath,
      sealPath: data.sealPath,
      pdfFilePath: data.pdfFilePath,
    },
    include: {
      flightSchedule: true,
      bankAccount: true,
    },
  });

  return invoice;
}

/**
 * Update an invoice
 */
export async function updateInvoice(id: string, data: UpdateInvoiceRequest): Promise<any> {
  const existing = await prisma.invoice.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new Error('Invoice not found');
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      recipient: data.recipient ?? existing.recipient,
      invoiceDate: data.invoiceDate ?? existing.invoiceDate,
      description: data.description ?? existing.description,
      totalAmount: data.totalAmount ?? existing.totalAmount,
      flightScheduleId: data.flightScheduleId ?? existing.flightScheduleId,
      bankAccountId: data.bankAccountId ?? existing.bankAccountId,
      // Simple mode
      airfareUnitPrice: data.airfareUnitPrice ?? existing.airfareUnitPrice,
      airfareQuantity: data.airfareQuantity ?? existing.airfareQuantity,
      airfareTotal: data.airfareTotal ?? existing.airfareTotal,
      seatPreferenceUnitPrice: data.seatPreferenceUnitPrice ?? existing.seatPreferenceUnitPrice,
      seatPreferenceQuantity: data.seatPreferenceQuantity ?? existing.seatPreferenceQuantity,
      seatPreferenceTotal: data.seatPreferenceTotal ?? existing.seatPreferenceTotal,
      // Advanced mode
      calculationMode: data.calculationMode ?? existing.calculationMode,
      basePricePerPerson: data.basePricePerPerson ?? existing.basePricePerPerson,
      totalParticipants: data.totalParticipants ?? existing.totalParticipants,
      totalTravelCost: data.totalTravelCost ?? existing.totalTravelCost,
      depositAmount: data.depositAmount ?? existing.depositAmount,
      depositDescription: data.depositDescription ?? existing.depositDescription,
      additionalItems: data.additionalItems ?? existing.additionalItems,
      balanceDue: data.balanceDue ?? existing.balanceDue,
      // Files
      logoPath: data.logoPath ?? existing.logoPath,
      sealPath: data.sealPath ?? existing.sealPath,
      pdfFilePath: data.pdfFilePath ?? existing.pdfFilePath,
    },
    include: {
      flightSchedule: true,
      bankAccount: true,
    },
  });

  return invoice;
}

/**
 * Delete an invoice
 */
export async function deleteInvoice(id: string): Promise<void> {
  const existing = await prisma.invoice.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new Error('Invoice not found');
  }

  await prisma.invoice.delete({
    where: { id },
  });
}