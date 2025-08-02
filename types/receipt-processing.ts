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
  attachmentId: string;
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
  lineItems?: LineItem[];
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
  llmExtractionIssues: string[];
}

export interface DocumentAnalysis {
  id: number;
  emailId: string;
  filename: string;
  isReceipt: boolean;
  confidenceScore: number;
  documentType: string;
  llmReasoning: string;
  keyIndicators: string[];
  processedAt: string;
}

export interface ProcessingLog {
  id: number;
  emailId: string;
  filename: string;
  processingStage: 'classification' | 'extraction' | 'validation';
  success: boolean;
  errorMessage?: string;
  processingTimeMs: number;
  processedAt: string;
}

export interface ProcessingResult {
  success: boolean;
  emailId: string;
  filename: string;
  classification?: LLMClassificationResult;
  extraction?: LLMExtractionResult;
  error?: string;
  processingTimeMs: number;
  skipped?: boolean;
  note?: string;
}

export interface LedgerSummary {
  totalReceipts: number;
  totalAmount: number;
  averageAmount: number;
  topMerchant: string;
  monthlySpending: Array<{month: string, amount: number}>;
  merchantBreakdown: Array<{merchant: string, amount: number, count: number}>;
  documentTypeBreakdown: Array<{type: string, count: number}>;
}

export interface LedgerFilters {
  searchTerm?: string;
  dateRange?: {start: string, end: string};
  minAmount?: number;
  maxAmount?: number;
  minConfidence?: number;
  merchants?: string[];
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Bank Reconciliation Interfaces
export interface BankTransaction {
  id?: number;
  uploadId: number;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance?: number;
  reference?: string;
  createdAt?: string;
}

export interface BankStatementUpload {
  id: number;
  filename: string;
  accountName: string;
  uploadedAt: string;
  processedCount: number;
  errors: string[];
}

export interface ReconciliationMatch {
  id?: number;
  receiptId: number;
  bankTransactionId: number;
  matchType: 'automatic' | 'manual';
  confidence?: number;
  createdAt?: string;
}

export interface BankStatementProcessingResult {
  success: boolean;
  transactionsProcessed: number;
  errors: string[];
  uploadId: number;
}

export interface ReconciliationResult {
  matchedTransactions: Array<{
    receipt: LedgerEntry;
    bankTransaction: BankTransaction;
    match: ReconciliationMatch;
  }>;
  receiptOnlyTransactions: LedgerEntry[];
  bankOnlyTransactions: BankTransaction[];
  matchRate: number;
  totalReceipts: number;
  totalBankTransactions: number;
}

export interface CSVParseResult {
  transactions: BankTransaction[];
  errors: string[];
  totalRows: number;
  successfulRows: number;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  data?: {
    uploadId: number;
    transactionsProcessed: number;
    errors: string[];
    parseStats: {
      totalRows: number;
      successfulRows: number;
      errors: string[];
    };
  };
  error?: string;
  details?: string;
}
