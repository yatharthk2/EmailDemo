export interface EmailData {
  id: string;
  sender: string;
  subject: string;
  date: Date;
  pdfAttachments: PdfAttachment[];
}

export interface PdfAttachment {
  filename: string;
  data: Buffer;
  contentType: string;
}

export interface LLMClassificationResult {
  isReceipt: boolean;
  confidence: number;
  documentType: 'receipt' | 'invoice' | 'statement' | 'other';
  reasoning: string;
  keyIndicators: string[];
}

export interface LLMExtractionResult {
  merchantName?: string;
  transactionDate?: string;
  totalAmount?: number;
  taxAmount?: number;
  subtotal?: number;
  lineItems?: Array<{name: string, price: number, quantity?: number}>;
  paymentMethod?: string;
  confidence: number;
  extractionIssues: string[];
}

export interface LineItem {
  name: string;
  price: number;
  quantity?: number;
}

export interface LedgerEntry {
  id: number;
  emailId: string;
  filename: string;
  merchantName: string;
  transactionDate: string;
  totalAmount: number;
  taxAmount: number;
  subtotal: number;
  paymentMethod: string;
  lineItems: LineItem[];
  llmConfidence: number;
  createdAt: string;
  rawText: string;
  llmExtractionIssues?: string[];
}

export interface ProcessingResult {
  success: boolean;
  stage: string;
  message: string;
  data?: any;
  error?: any;
  processingTime?: number;
}

export interface LedgerSummaryData {
  totalReceipts: number;
  totalAmount: number;
  averageAmount: number;
  topMerchant: string;
  monthlySpending: {
    month: string;
    amount: number;
  }[];
  topMerchants: {
    name: string;
    amount: number;
    count: number;
  }[];
  documentTypes: {
    type: string;
    count: number;
  }[];
}

export interface LedgerFilterOptions {
  searchTerm?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  minConfidence?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
