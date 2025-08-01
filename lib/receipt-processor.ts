import { DatabaseManager } from './db';
import { GroqLLMProcessor } from './groq-processor';
import { PdfProcessor } from './pdf-processor';
import { 
  EmailData, 
  PdfAttachment, 
  ProcessingResult, 
  LedgerEntry, 
  LedgerSummaryData, 
  LedgerFilterOptions,
  PaginatedResult
} from '../types/receipt-types';

export class ReceiptProcessor {
  private db: DatabaseManager;
  private groqProcessor: GroqLLMProcessor;
  
  constructor() {
    this.db = DatabaseManager.getInstance();
    
    // Initialize the Groq processor with API key
    // In production, this should be stored in environment variables
    const groqApiKey = process.env.GROQ_API_KEY || 'your-g"roq-api-key';
    this.groqProcessor = new GroqLLMProcessor(groqApiKey);
  }

  /**
   * Process a document (PDF) from an email attachment
   */
  async processDocument(emailId: string, pdfAttachment: PdfAttachment): Promise<ProcessingResult> {
    const overallStartTime = Date.now();
    const { filename, data: pdfBuffer } = pdfAttachment;
    
    try {
      // STEP 1: Extract text from PDF
      const pdfResult = await PdfProcessor.extractText(pdfBuffer);
      
      // Log the PDF extraction step
      await this.logProcessingStep({
        emailId,
        filename,
        stage: 'pdf_extraction',
        success: pdfResult.success,
        errorMessage: pdfResult.error || '',
        processingTime: pdfResult.processingTime || 0
      });
      
      // If PDF extraction failed, return the error
      if (!pdfResult.success) {
        return pdfResult;
      }
      
      // Get the extracted text
      const rawText = pdfResult.data.text;
      const cleanedText = PdfProcessor.cleanText(rawText);
      
      // STEP 2: Classify the document using LLM
      const classificationStartTime = Date.now();
      const classification = await this.groqProcessor.classifyDocument(cleanedText);
      
      // Log the classification step
      await this.logProcessingStep({
        emailId,
        filename,
        stage: 'document_classification',
        success: true,
        errorMessage: '',
        processingTime: Date.now() - classificationStartTime
      });
      
      // STEP 3: Store the classification result
      await this.storeDocumentAnalysis({
        emailId,
        filename,
        isReceipt: classification.isReceipt,
        confidenceScore: classification.confidence,
        documentType: classification.documentType,
        llmReasoning: classification.reasoning,
        keyIndicators: JSON.stringify(classification.keyIndicators)
      });
      
      // If not classified as a receipt, we're done
      if (!classification.isReceipt) {
        return {
          success: true,
          stage: 'classification',
          message: `Document not classified as a receipt (${classification.documentType})`,
          data: classification,
          processingTime: Date.now() - overallStartTime
        };
      }
      
      // STEP 4: Extract receipt data using LLM
      const extractionStartTime = Date.now();
      const extractionResult = await this.groqProcessor.extractReceiptData(cleanedText);
      
      // Log the extraction step
      await this.logProcessingStep({
        emailId,
        filename,
        stage: 'receipt_extraction',
        success: true,
        errorMessage: '',
        processingTime: Date.now() - extractionStartTime
      });
      
      // STEP 5: Store the receipt data
      await this.storeReceiptData({
        emailId,
        filename,
        merchantName: extractionResult.merchantName || 'Unknown Merchant',
        transactionDate: extractionResult.transactionDate || new Date().toISOString().split('T')[0],
        totalAmount: extractionResult.totalAmount || 0,
        taxAmount: extractionResult.taxAmount || 0,
        subtotal: extractionResult.subtotal || 0,
        paymentMethod: extractionResult.paymentMethod || 'Unknown',
        lineItems: JSON.stringify(extractionResult.lineItems || []),
        llmConfidence: extractionResult.confidence,
        llmExtractionIssues: JSON.stringify(extractionResult.extractionIssues || []),
        rawText: cleanedText
      });
      
      // Return the complete processing result
      return {
        success: true,
        stage: 'complete',
        message: 'Receipt successfully processed',
        data: {
          classification,
          extraction: extractionResult
        },
        processingTime: Date.now() - overallStartTime
      };
      
    } catch (error) {
      console.error(`Error processing document ${filename}:`, error);
      
      // Log the error
      await this.logProcessingStep({
        emailId,
        filename,
        stage: 'processing_error',
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - overallStartTime
      });
      
      return {
        success: false,
        stage: 'error',
        message: 'Error during document processing',
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - overallStartTime
      };
    }
  }

  /**
   * Process multiple email documents in batch
   */
  async processEmailBatch(emails: EmailData[]): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    for (const email of emails) {
      for (const attachment of email.pdfAttachments) {
        const result = await this.processDocument(email.id, attachment);
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * Log a processing step to the database
   */
  private async logProcessingStep({
    emailId,
    filename,
    stage,
    success,
    errorMessage,
    processingTime
  }: {
    emailId: string;
    filename: string;
    stage: string;
    success: boolean;
    errorMessage: string;
    processingTime: number;
  }): Promise<void> {
    try {
      const stmt = this.db.getDb().prepare(`
        INSERT INTO processing_log (
          email_id, filename, processing_stage, success, 
          error_message, processing_time_ms, processed_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      stmt.run(emailId, filename, stage, success ? 1 : 0, errorMessage, processingTime);
    } catch (error) {
      console.error('Error logging processing step:', error);
    }
  }

  /**
   * Store document analysis results in the database
   */
  private async storeDocumentAnalysis({
    emailId,
    filename,
    isReceipt,
    confidenceScore,
    documentType,
    llmReasoning,
    keyIndicators
  }: {
    emailId: string;
    filename: string;
    isReceipt: boolean;
    confidenceScore: number;
    documentType: string;
    llmReasoning: string;
    keyIndicators: string;
  }): Promise<void> {
    try {
      const stmt = this.db.getDb().prepare(`
        INSERT INTO document_analysis (
          email_id, filename, is_receipt, confidence_score,
          document_type, llm_reasoning, key_indicators, processed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      stmt.run(
        emailId,
        filename,
        isReceipt ? 1 : 0,
        confidenceScore,
        documentType,
        llmReasoning,
        keyIndicators
      );
    } catch (error) {
      console.error('Error storing document analysis:', error);
      throw error;
    }
  }

  /**
   * Store receipt data in the database
   */
  private async storeReceiptData({
    emailId,
    filename,
    merchantName,
    transactionDate,
    totalAmount,
    taxAmount,
    subtotal,
    paymentMethod,
    lineItems,
    llmConfidence,
    llmExtractionIssues,
    rawText
  }: {
    emailId: string;
    filename: string;
    merchantName: string;
    transactionDate: string;
    totalAmount: number;
    taxAmount: number;
    subtotal: number;
    paymentMethod: string;
    lineItems: string;
    llmConfidence: number;
    llmExtractionIssues: string;
    rawText: string;
  }): Promise<void> {
    try {
      const stmt = this.db.getDb().prepare(`
        INSERT INTO receipt_ledger (
          email_id, filename, merchant_name, transaction_date,
          total_amount, tax_amount, subtotal, payment_method,
          line_items, llm_confidence, llm_extraction_issues, raw_text,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      stmt.run(
        emailId,
        filename,
        merchantName,
        transactionDate,
        totalAmount,
        taxAmount,
        subtotal,
        paymentMethod,
        lineItems,
        llmConfidence,
        llmExtractionIssues,
        rawText
      );
    } catch (error) {
      console.error('Error storing receipt data:', error);
      throw error;
    }
  }

  /**
   * Get all ledger entries with optional filtering and pagination
   */
  async getLedgerEntries(filters: LedgerFilterOptions = {}): Promise<PaginatedResult<LedgerEntry>> {
    try {
      const {
        searchTerm = '',
        startDate,
        endDate,
        minAmount,
        maxAmount,
        minConfidence,
        sortField = 'transaction_date',
        sortDirection = 'desc',
        page = 1,
        pageSize = 10
      } = filters;
      
      // Build the WHERE clause based on filters
      const whereClauses = [];
      const parameters = [];
      
      if (searchTerm) {
        whereClauses.push('merchant_name LIKE ?');
        parameters.push(`%${searchTerm}%`);
      }
      
      if (startDate) {
        whereClauses.push('transaction_date >= ?');
        parameters.push(startDate.toISOString().split('T')[0]);
      }
      
      if (endDate) {
        whereClauses.push('transaction_date <= ?');
        parameters.push(endDate.toISOString().split('T')[0]);
      }
      
      if (minAmount !== undefined) {
        whereClauses.push('total_amount >= ?');
        parameters.push(minAmount);
      }
      
      if (maxAmount !== undefined) {
        whereClauses.push('total_amount <= ?');
        parameters.push(maxAmount);
      }
      
      if (minConfidence !== undefined) {
        whereClauses.push('llm_confidence >= ?');
        parameters.push(minConfidence);
      }
      
      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      
      // Count total entries for pagination
      const countStmt = this.db.getDb().prepare(`
        SELECT COUNT(*) as total FROM receipt_ledger ${whereClause}
      `);
      
      const { total } = countStmt.get(...parameters) as { total: number };
      const totalPages = Math.ceil(total / pageSize);
      
      // Calculate offset for pagination
      const offset = (page - 1) * pageSize;
      
      // Validate and sanitize sort field to prevent SQL injection
      const validSortFields = ['transaction_date', 'merchant_name', 'total_amount', 'llm_confidence', 'created_at'];
      const sanitizedSortField = validSortFields.includes(sortField) ? sortField : 'transaction_date';
      
      // Build the query with sorting and pagination
      const stmt = this.db.getDb().prepare(`
        SELECT
          id, email_id, filename, merchant_name, transaction_date,
          total_amount, tax_amount, subtotal, payment_method,
          line_items, llm_confidence, llm_extraction_issues, raw_text, created_at
        FROM receipt_ledger
        ${whereClause}
        ORDER BY ${sanitizedSortField} ${sortDirection === 'asc' ? 'ASC' : 'DESC'}
        LIMIT ? OFFSET ?
      `);
      
      const rows = stmt.all(...parameters, pageSize, offset) as any[];
      
      // Transform the rows into LedgerEntry objects
      const items = rows.map(row => ({
        id: row.id,
        emailId: row.email_id,
        filename: row.filename,
        merchantName: row.merchant_name,
        transactionDate: row.transaction_date,
        totalAmount: row.total_amount,
        taxAmount: row.tax_amount,
        subtotal: row.subtotal,
        paymentMethod: row.payment_method,
        lineItems: JSON.parse(row.line_items || '[]'),
        llmConfidence: row.llm_confidence,
        llmExtractionIssues: JSON.parse(row.llm_extraction_issues || '[]'),
        rawText: row.raw_text,
        createdAt: row.created_at
      }));
      
      return {
        items,
        total,
        page,
        pageSize,
        totalPages
      };
    } catch (error) {
      console.error('Error getting ledger entries:', error);
      throw error;
    }
  }

  /**
   * Get a single ledger entry by ID
   */
  async getLedgerEntryById(id: number): Promise<LedgerEntry | null> {
    try {
      const stmt = this.db.getDb().prepare(`
        SELECT
          id, email_id, filename, merchant_name, transaction_date,
          total_amount, tax_amount, subtotal, payment_method,
          line_items, llm_confidence, llm_extraction_issues, raw_text, created_at
        FROM receipt_ledger
        WHERE id = ?
      `);
      
      const row = stmt.get(id) as any;
      
      if (!row) return null;
      
      return {
        id: row.id,
        emailId: row.email_id,
        filename: row.filename,
        merchantName: row.merchant_name,
        transactionDate: row.transaction_date,
        totalAmount: row.total_amount,
        taxAmount: row.tax_amount,
        subtotal: row.subtotal,
        paymentMethod: row.payment_method,
        lineItems: JSON.parse(row.line_items || '[]'),
        llmConfidence: row.llm_confidence,
        llmExtractionIssues: JSON.parse(row.llm_extraction_issues || '[]'),
        rawText: row.raw_text,
        createdAt: row.created_at
      };
    } catch (error) {
      console.error('Error getting ledger entry by ID:', error);
      throw error;
    }
  }

  /**
   * Get ledger summary statistics
   */
  async getLedgerSummary(): Promise<LedgerSummaryData> {
    try {
      // Get total receipts and amounts
      const summaryStmt = this.db.getDb().prepare(`
        SELECT
          COUNT(*) as totalReceipts,
          SUM(total_amount) as totalAmount,
          AVG(total_amount) as averageAmount
        FROM receipt_ledger
      `);
      
      const summary = summaryStmt.get() as any;
      
      // Get top merchant by total spent
      const topMerchantStmt = this.db.getDb().prepare(`
        SELECT merchant_name, SUM(total_amount) as total
        FROM receipt_ledger
        GROUP BY merchant_name
        ORDER BY total DESC
        LIMIT 1
      `);
      
      const topMerchant = topMerchantStmt.get() as any;
      
      // Get monthly spending
      const monthlyStmt = this.db.getDb().prepare(`
        SELECT
          strftime('%Y-%m', transaction_date) as month,
          SUM(total_amount) as amount
        FROM receipt_ledger
        GROUP BY month
        ORDER BY month
        LIMIT 12
      `);
      
      const monthlyRows = monthlyStmt.all() as any[];
      
      // Get top merchants
      const topMerchantsStmt = this.db.getDb().prepare(`
        SELECT
          merchant_name as name,
          SUM(total_amount) as amount,
          COUNT(*) as count
        FROM receipt_ledger
        GROUP BY merchant_name
        ORDER BY amount DESC
        LIMIT 5
      `);
      
      const topMerchantsRows = topMerchantsStmt.all() as any[];
      
      // Get document type breakdown
      const documentTypesStmt = this.db.getDb().prepare(`
        SELECT
          document_type as type,
          COUNT(*) as count
        FROM document_analysis
        GROUP BY document_type
        ORDER BY count DESC
      `);
      
      const documentTypesRows = documentTypesStmt.all() as any[];
      
      return {
        totalReceipts: summary.totalReceipts || 0,
        totalAmount: summary.totalAmount || 0,
        averageAmount: summary.averageAmount || 0,
        topMerchant: topMerchant?.merchant_name || 'None',
        monthlySpending: monthlyRows.map((row: any) => ({
          month: row.month,
          amount: row.amount
        })),
        topMerchants: topMerchantsRows.map((row: any) => ({
          name: row.name,
          amount: row.amount,
          count: row.count
        })),
        documentTypes: documentTypesRows.map((row: any) => ({
          type: row.type,
          count: row.count
        }))
      };
    } catch (error) {
      console.error('Error getting ledger summary:', error);
      throw error;
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats() {
    try {
      // Overall processing stats
      const overallStmt = this.db.getDb().prepare(`
        SELECT
          COUNT(*) as totalProcessed,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successCount,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failureCount,
          AVG(processing_time_ms) as avgProcessingTime
        FROM processing_log
      `);
      
      const overall = overallStmt.get() as any;
      
      // Stats by processing stage
      const stageStmt = this.db.getDb().prepare(`
        SELECT
          processing_stage as stage,
          COUNT(*) as count,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successCount,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failureCount,
          AVG(processing_time_ms) as avgProcessingTime
        FROM processing_log
        GROUP BY processing_stage
      `);
      
      const stageRows = stageStmt.all() as any[];
      
      // Recent errors
      const errorsStmt = this.db.getDb().prepare(`
        SELECT
          id, email_id, filename, processing_stage,
          error_message, processed_at
        FROM processing_log
        WHERE success = 0
        ORDER BY processed_at DESC
        LIMIT 10
      `);
      
      const recentErrors = errorsStmt.all() as any[];
      
      return {
        overall,
        stages: stageRows,
        recentErrors
      };
    } catch (error) {
      console.error('Error getting processing stats:', error);
      throw error;
    }
  }

  /**
   * Export ledger data as CSV
   */
  async exportLedgerAsCsv(filters: LedgerFilterOptions = {}): Promise<string> {
    const { items } = await this.getLedgerEntries({
      ...filters,
      page: 1,
      pageSize: 10000 // Get all entries for export
    });
    
    // Define CSV header
    const headers = [
      'ID',
      'Merchant',
      'Date',
      'Total Amount',
      'Tax Amount',
      'Subtotal',
      'Payment Method',
      'Confidence',
      'Email ID',
      'Filename'
    ];
    
    // Convert entries to CSV rows
    const rows = items.map(entry => [
      entry.id,
      entry.merchantName,
      entry.transactionDate,
      entry.totalAmount,
      entry.taxAmount,
      entry.subtotal,
      entry.paymentMethod,
      entry.llmConfidence,
      entry.emailId,
      entry.filename
    ]);
    
    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }
}
