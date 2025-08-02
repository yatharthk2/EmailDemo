/**
 * Receipt Processor using Google Gemini 2.0 Flash for direct PDF processing
 * Eliminates OCR preprocessing for better accuracy and performance
 * 
 * @class ReceiptProcessorWithDB
 * @description Processes email attachments to identify and extract receipt data
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import {
  ProcessingResult,
  LedgerEntry,
  DocumentAnalysis,
  ProcessingLog,
  LedgerSummary,
  LedgerFilters,
  PaginationParams,
  LLMClassificationResult,
  LLMExtractionResult
} from '../types/receipt-processing';

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

export class ReceiptProcessorWithDB {
  private db: Database.Database;
  private genAI: any;
  private model: any;

  /**
   * Initialize Receipt Processor with Gemini API
   * @param {Object} dbManager - Database manager instance
   */
  constructor() {
    // Create database in project root
    const dbPath = path.join(process.cwd(), 'receipts_demo.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    this.initializeDatabase();
    
    // Initialize Gemini API with latest model
    this.genAI = new GoogleGenerativeAI('AIzaSyCrnHu_WFBY_Q8LxjM4iOBQxMhzPkTYsRY');
    
    // Use latest Gemini 2.0 Flash model
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1,           // Low temperature for consistent results
        topK: 1,                   // Focus on most likely responses
        topP: 0.8,                 // Nucleus sampling
        maxOutputTokens: 4096,     // Increased for detailed extraction
        responseMimeType: 'application/json' // Force JSON responses
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        }
      ]
    });
    
    console.log('[PROCESSOR] Initialized with Gemini 2.0 Flash model');
  }

  /**
   * Convert PDF buffer to format acceptable by Gemini API
   * @param {Buffer} buffer - PDF file buffer
   * @param {string} mimeType - MIME type of the file
   * @returns {Object} Formatted object for Gemini API
   */
  private bufferToGenerativePart(buffer: Buffer, mimeType: string) {
    return {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: mimeType
      }
    };
  }

  /**
   * Classify PDF document to determine if it's a receipt using Gemini 2.0 Flash
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Promise<Object>} Classification result with confidence score
   * 
   * @example
   * const result = await processor.classifyDocumentFromPDF(pdfBuffer);
   * console.log(result.isReceipt); // true/false
   * console.log(result.confidence); // 0-100
   */
  private async classifyDocumentFromPDF(pdfBuffer: Buffer): Promise<LLMClassificationResult & { processingTimeMs: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Convert PDF to Gemini-compatible format
      const pdfPart = this.bufferToGenerativePart(pdfBuffer, 'application/pdf');
      
      // Enhanced classification prompt for Gemini 2.0
      const prompt = `You are an expert document classifier. Analyze this PDF document and determine if it's a retail receipt or purchase transaction record.

RECEIPT IDENTIFICATION CRITERIA:
✓ Store/merchant name prominently displayed
✓ Transaction date and time stamp
✓ Itemized list of products/services with individual prices
✓ Subtotal, tax calculations, and final total
✓ Payment method information (cash, card, etc.)
✓ Receipt/transaction number
✓ Store address or location
✓ Barcode or QR code (common on receipts)

NON-RECEIPT DOCUMENTS:
✗ Invoices (B2B transactions, payment terms)
✗ Statements (account summaries, balances)
✗ Menus (price lists without transactions)
✗ Flyers/advertisements
✗ Resumes/CVs
✗ Reports or other business documents

ANALYSIS REQUIREMENTS:
- Examine the entire document layout and structure
- Look for visual receipt formatting patterns
- Identify transaction-specific elements
- Consider document purpose and context

OUTPUT FORMAT (JSON only):
{
  "isReceipt": boolean,
  "confidence": number (0-100),
  "documentType": "receipt" | "invoice" | "statement" | "menu" | "flyer" | "resume" | "report" | "other",
  "reasoning": "specific explanation of classification decision",
  "keyIndicators": ["specific", "elements", "that", "support", "classification"],
  "documentStructure": "description of layout and formatting observed"
}`;

      console.log('[GEMINI] Starting PDF classification...');
      
      // Generate classification with Gemini 2.0 Flash
      const result = await this.model.generateContent([prompt, pdfPart]);
      const response = await result.response;
      const text = response.text();
      
      const processingTime = Date.now() - startTime;
      console.log(`[GEMINI] Classification completed in ${processingTime}ms`);
      console.log('[GEMINI] Raw response:', text.substring(0, 500) + '...');
      console.log('[GEMINI] Response type:', typeof text);
      
      // Parse JSON response (Gemini 2.0 should return clean JSON)
      let classification: any;
      try {
        const parsedResponse = JSON.parse(text);
        // Handle array response - take first element if it's an array
        classification = Array.isArray(parsedResponse) ? parsedResponse[0] : parsedResponse;
      } catch (parseError) {
        console.warn('[GEMINI] JSON parsing failed, attempting to extract...');
        // Fallback JSON extraction for malformed responses
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          try {
            const parsedMatch = JSON.parse(jsonMatch[0]);
            classification = Array.isArray(parsedMatch) ? parsedMatch[0] : parsedMatch;
          } catch (secondParseError) {
            throw new Error('No valid JSON found in response after fallback');
          }
        } else {
          throw new Error('No valid JSON found in response');
        }
      }
      
      // Validate classification structure
      if (!classification.hasOwnProperty('isReceipt') || 
          !classification.hasOwnProperty('confidence')) {
        throw new Error('Invalid classification response structure');
      }
      
      console.log('[GEMINI] Classification result:', {
        isReceipt: classification.isReceipt,
        confidence: classification.confidence,
        documentType: classification.documentType
      });
      
      return {
        ...classification,
        processingTimeMs: processingTime
      };
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('[GEMINI] Classification error:', error.message);
      
      // Return safe fallback classification
      return {
        isReceipt: false,
        confidence: 0,
        documentType: 'other',
        reasoning: `Classification failed: ${error.message}`,
        keyIndicators: [],
        processingTimeMs: processingTime,
        error: error.message
      };
    }
  }

  /**
   * Extract structured receipt data from PDF using Gemini 2.0 Flash
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Promise<Object>} Structured receipt data
   * 
   * @example
   * const data = await processor.extractReceiptDataFromPDF(pdfBuffer);
   * console.log(data.merchantName); // "Target Store #1234"
   * console.log(data.totalAmount); // 45.67
   */
  private async extractReceiptDataFromPDF(pdfBuffer: Buffer): Promise<LLMExtractionResult & { processingTimeMs: number }> {
    const startTime = Date.now();
    
    try {
      const pdfPart = this.bufferToGenerativePart(pdfBuffer, 'application/pdf');
      
      // Comprehensive extraction prompt for Gemini 2.0
      const prompt = `You are an expert receipt data extractor. Extract ALL structured information from this receipt PDF with maximum accuracy.

EXTRACTION REQUIREMENTS:

1. MERCHANT INFORMATION:
   - Extract exact store name as displayed
   - Include store number/location if shown
   - Capture store address if visible

2. TRANSACTION DETAILS:
   - Parse date in YYYY-MM-DD format
   - Extract time in HH:MM format (24-hour)
   - Find transaction/receipt number

3. LINE ITEMS ANALYSIS:
   - Extract EVERY product/service item
   - Capture exact descriptions as shown
   - Identify quantities (default to 1 if not shown)
   - Parse individual unit prices
   - Calculate line totals

4. FINANCIAL BREAKDOWN:
   - Identify subtotal (before tax)
   - Extract all tax amounts and types
   - Find final total amount
   - Identify discounts/promotions if any

5. PAYMENT INFORMATION:
   - Determine payment method used
   - Extract card last 4 digits if shown
   - Identify cashier/employee info if visible

ACCURACY GUIDELINES:
- Read ALL visible text carefully
- Preserve exact spelling and formatting
- Handle multiple currencies appropriately
- Account for receipt-specific formatting
- Identify any unclear or damaged text areas

OUTPUT FORMAT (JSON only):
{
  "merchantName": "exact store name with location",
  "storeAddress": "full address if visible",
  "transactionDate": "YYYY-MM-DD",
  "transactionTime": "HH:MM or null",
  "receiptNumber": "transaction ID if available",
  "lineItems": [
    {
      "description": "exact item description",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number,
      "category": "optional item category",
      "sku": "product code if visible"
    }
  ],
  "subtotal": number,
  "taxBreakdown": [
    {
      "type": "tax type (sales, VAT, etc.)",
      "rate": "percentage if shown",
      "amount": number
    }
  ],
  "totalTaxAmount": number,
  "discounts": [
    {
      "description": "discount name",
      "amount": number
    }
  ],
  "totalAmount": number,
  "paymentMethod": "cash|debit|credit|check|gift_card|other",
  "cardLastFour": "last 4 digits if shown",
  "cashierInfo": "employee name/ID if visible",
  "confidence": number (0-100),
  "extractionIssues": ["any unclear or problematic areas"],
  "additionalNotes": "any other relevant information"
}`;

      console.log('[GEMINI] Starting receipt data extraction...');
      
      // Extract data with Gemini 2.0 Flash
      const result = await this.model.generateContent([prompt, pdfPart]);
      const response = await result.response;
      const text = response.text();
      
      const processingTime = Date.now() - startTime;
      console.log(`[GEMINI] Extraction completed in ${processingTime}ms`);
      
      // Parse extracted data
      let receiptData: any;
      try {
        const parsedResponse = JSON.parse(text);
        // Handle array response - take first element if it's an array
        receiptData = Array.isArray(parsedResponse) ? parsedResponse[0] : parsedResponse;
      } catch (parseError) {
        console.warn('[GEMINI] JSON parsing failed for extraction, attempting recovery...');
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          try {
            const parsedMatch = JSON.parse(jsonMatch[0]);
            receiptData = Array.isArray(parsedMatch) ? parsedMatch[0] : parsedMatch;
          } catch (secondParseError) {
            throw new Error('No valid JSON found in extraction response after fallback');
          }
        } else {
          throw new Error('No valid JSON found in extraction response');
        }
      }
      
      // Validate essential fields
      if (!receiptData.merchantName || !receiptData.totalAmount) {
        console.warn('[GEMINI] Missing essential receipt fields');
        receiptData.extractionIssues = receiptData.extractionIssues || [];
        receiptData.extractionIssues.push('Missing essential merchant or total information');
      }
      
      // Ensure numeric fields are properly typed
      receiptData.totalAmount = parseFloat(receiptData.totalAmount) || 0;
      receiptData.subtotal = parseFloat(receiptData.subtotal) || 0;
      receiptData.totalTaxAmount = parseFloat(receiptData.totalTaxAmount) || 0;
      
      console.log('[GEMINI] Extraction summary:', {
        merchant: receiptData.merchantName,
        total: receiptData.totalAmount,
        itemCount: receiptData.lineItems?.length || 0,
        confidence: receiptData.confidence
      });
      
      return {
        ...receiptData,
        processingTimeMs: processingTime
      };
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('[GEMINI] Extraction error:', error.message);
      throw new Error(`Receipt extraction failed: ${error.message}`);
    }
  }

  private initializeDatabase(): void {
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS document_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        is_receipt BOOLEAN NOT NULL,
        confidence_score INTEGER NOT NULL,
        document_type TEXT NOT NULL,
        llm_reasoning TEXT NOT NULL,
        key_indicators TEXT NOT NULL,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS receipt_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        merchant_name TEXT,
        transaction_date DATE,
        total_amount REAL,
        tax_amount REAL,
        subtotal REAL,
        payment_method TEXT,
        line_items TEXT,
        llm_confidence INTEGER,
        llm_extraction_issues TEXT,
        raw_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS processing_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        processing_stage TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        error_message TEXT,
        processing_time_ms INTEGER,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_email_id ON document_analysis(email_id);
      CREATE INDEX IF NOT EXISTS idx_receipt_date ON receipt_ledger(transaction_date);
      CREATE INDEX IF NOT EXISTS idx_merchant ON receipt_ledger(merchant_name);
      CREATE INDEX IF NOT EXISTS idx_processing_stage ON processing_log(processing_stage);
    `);
  }

  /**
   * Main processing function that orchestrates PDF analysis and data extraction
   * Always processes documents - no skipping for duplicates (reprocesses existing documents)
   * @param {string} emailId - Unique email identifier
   * @param {string} filename - PDF filename
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Promise<Object>} Processing result with success status and data
   * 
   * @example
   * const result = await processor.processDocumentWithDB(emailId, filename, pdfBuffer);
   * if (result.success && result.classification?.isReceipt) {
   *   console.log('Receipt processed:', result.extraction?.merchantName);
   * }
   */
  async processDocumentWithDB(emailId: string, filename: string, pdfBuffer: Buffer): Promise<ProcessingResult> {
    const overallStartTime = Date.now();
    
    try {
      console.log(`[PROCESSOR] 🚀 Starting PDF processing for: ${filename} (${Math.round(pdfBuffer.length / 1024)}KB)`);

      // STEP 0: Document Check (Always Process - No Skipping)
      const existingDoc = await this.checkDocumentExists(emailId, filename);
      if (existingDoc) {
        console.log(`[PROCESSOR] 🔄 Document previously processed, reprocessing: ${filename}`);
        // Delete existing records to avoid duplicates when reprocessing
        await this.deleteExistingDocumentRecords(emailId, filename);
      }

      // STEP 1: Document Classification with Gemini 2.0 Flash
      console.log('[PROCESSOR] 🔍 Classifying document with Gemini 2.0 Flash...');
      
      const classification = await this.classifyDocumentFromPDF(pdfBuffer);
      
      console.log(`[PROCESSOR] ✅ Classification completed:`, {
        isReceipt: classification.isReceipt,
        confidence: `${classification.confidence}%`,
        type: classification.documentType,
        processingTime: `${classification.processingTimeMs}ms`
      });

      // Store classification in database
      await this.storeDocumentAnalysis(
        emailId, 
        filename, 
        classification.isReceipt,
        classification.confidence,
        classification.documentType,
        classification.reasoning,
        JSON.stringify(classification.keyIndicators || [])
      );

      // Log classification step
      await this.storeProcessingLog(
        emailId, 
        filename, 
        'classification', 
        true, 
        null, 
        classification.processingTimeMs
      );

      // STEP 2: Receipt Data Extraction (if high-confidence receipt)
      const confidenceThreshold = 70;
      
      if (classification.isReceipt && classification.confidence >= confidenceThreshold) {
        console.log(`[PROCESSOR] 📋 High-confidence receipt detected (${classification.confidence}%), extracting data...`);
        
        try {
          const receiptData = await this.extractReceiptDataFromPDF(pdfBuffer);
          
          console.log(`[PROCESSOR] ✅ Data extraction completed:`, {
            merchant: receiptData.merchantName,
            total: `$${receiptData.totalAmount}`,
            items: receiptData.lineItems?.length || 0,
            confidence: `${receiptData.confidence}%`,
            processingTime: `${receiptData.processingTimeMs}ms`
          });

          // Store receipt data in ledger
          await this.storeReceiptData(
            emailId,
            filename,
            receiptData.merchantName || 'Unknown Merchant',
            receiptData.transactionDate || new Date().toISOString().split('T')[0],
            receiptData.totalAmount || 0,
            receiptData.taxAmount || 0,
            receiptData.subtotal || 0,
            receiptData.paymentMethod || 'unknown',
            JSON.stringify(receiptData.lineItems || []),
            receiptData.confidence,
            JSON.stringify({
              note: `Processed with Gemini 2.0 Flash - ${new Date().toISOString()}`,
              extractionIssues: receiptData.extractionIssues || []
            })
          );

          // Log extraction step
          await this.storeProcessingLog(
            emailId, 
            filename, 
            'extraction', 
            true, 
            null, 
            receiptData.processingTimeMs
          );

          const totalTime = Date.now() - overallStartTime;
          console.log(`[PROCESSOR] 🎉 Receipt processing completed in ${totalTime}ms for ${filename}`);
          
          return { 
            success: true, 
            emailId,
            filename,
            classification: {
              isReceipt: classification.isReceipt,
              confidence: classification.confidence,
              documentType: classification.documentType,
              reasoning: classification.reasoning,
              keyIndicators: classification.keyIndicators
            },
            extraction: {
              merchantName: receiptData.merchantName,
              totalAmount: receiptData.totalAmount,
              transactionDate: receiptData.transactionDate,
              confidence: receiptData.confidence,
              lineItems: receiptData.lineItems,
              extractionIssues: receiptData.extractionIssues || [],
              taxAmount: receiptData.taxAmount,
              subtotal: receiptData.subtotal,
              paymentMethod: receiptData.paymentMethod
            },
            processingTimeMs: totalTime
          };
          
        } catch (extractionError: any) {
          console.error('[PROCESSOR] ❌ Receipt extraction failed:', extractionError.message);
          
          // Log extraction failure
          await this.storeProcessingLog(
            emailId, 
            filename, 
            'extraction', 
            false, 
            extractionError.message, 
            null
          );
          
          // Still return success for classification, but note extraction failure
          return { 
            success: true, 
            emailId,
            filename,
            classification: {
              isReceipt: classification.isReceipt,
              confidence: classification.confidence,
              documentType: classification.documentType,
              reasoning: classification.reasoning,
              keyIndicators: classification.keyIndicators
            },
            error: extractionError.message,
            processingTimeMs: Date.now() - overallStartTime
          };
        }
        
      } else {
        console.log(`[PROCESSOR] ⚠️  Not a receipt or low confidence: ${classification.documentType} (${classification.confidence}%)`);
        
        const totalTime = Date.now() - overallStartTime;
        return { 
          success: true, 
          emailId,
          filename,
          classification: {
            isReceipt: classification.isReceipt,
            confidence: classification.confidence,
            documentType: classification.documentType,
            reasoning: classification.reasoning,
            keyIndicators: classification.keyIndicators
          },
          processingTimeMs: totalTime
        };
      }

    } catch (error: any) {
      const totalTime = Date.now() - overallStartTime;
      console.error('[PROCESSOR] ❌ Critical processing error:', error.message);
      
      // Log processing failure
      await this.storeProcessingLog(
        emailId, 
        filename, 
        'pdf_processing', 
        false, 
        error.message, 
        totalTime
      );
      
      return {
        success: false,
        emailId,
        filename,
        error: `PDF processing failed for ${filename}: ${error.message}`,
        processingTimeMs: totalTime
      };
    }
  }

  /**
   * Health check for Gemini API connection
   * @returns {Promise<Object>} API status and model information
   */
  async testGeminiConnection() {
    try {
      const testPrompt = "Respond with JSON: {\"status\": \"connected\", \"model\": \"gemini-2.0-flash-exp\"}";
      const result = await this.model.generateContent([testPrompt]);
      const response = await result.response;
      
      return {
        success: true,
        response: response.text(),
        model: 'gemini-2.0-flash-exp'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        model: 'gemini-2.0-flash-exp'
      };
    }
  }

  // Database helper methods
  private async checkDocumentExists(emailId: string, filename: string): Promise<any> {
    const stmt = this.db.prepare(`
      SELECT id, is_receipt FROM document_analysis WHERE email_id = ? AND filename = ?
    `);
    return stmt.get(emailId, filename);
  }

  private safeJsonParse(jsonString: string | null, defaultValue: any = null): any {
    if (!jsonString) return defaultValue;
    
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('[DB] JSON parse error for value:', jsonString?.substring(0, 50) + '...');
      return defaultValue;
    }
  }

  private async deleteExistingDocumentRecords(emailId: string, filename: string): Promise<void> {
    console.log(`[PROCESSOR] 🗑️ Deleting existing records for reprocessing: ${filename}`);
    
    // Delete from receipt_ledger first (due to potential foreign key constraints)
    const deleteReceiptStmt = this.db.prepare(`
      DELETE FROM receipt_ledger WHERE email_id = ? AND filename = ?
    `);
    const receiptResult = deleteReceiptStmt.run(emailId, filename);
    
    // Delete from document_analysis
    const deleteAnalysisStmt = this.db.prepare(`
      DELETE FROM document_analysis WHERE email_id = ? AND filename = ?
    `);
    const analysisResult = deleteAnalysisStmt.run(emailId, filename);
    
    // Delete from processing_log
    const deleteLogStmt = this.db.prepare(`
      DELETE FROM processing_log WHERE email_id = ? AND filename = ?
    `);
    const logResult = deleteLogStmt.run(emailId, filename);
    
    console.log(`[PROCESSOR] ✅ Deleted existing records: ${analysisResult.changes} analysis, ${receiptResult.changes} receipts, ${logResult.changes} logs`);
  }

  private async storeDocumentAnalysis(
    emailId: string, 
    filename: string, 
    isReceipt: boolean, 
    confidence: number, 
    documentType: string, 
    reasoning: string, 
    keyIndicators: string
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO document_analysis (
        email_id, filename, is_receipt, confidence_score, document_type,
        llm_reasoning, key_indicators
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      emailId,
      filename,
      isReceipt ? 1 : 0,
      confidence,
      documentType,
      reasoning,
      keyIndicators
    );
  }

  private async storeReceiptData(
    emailId: string,
    filename: string,
    merchantName: string,
    transactionDate: string,
    totalAmount: number,
    taxAmount: number,
    subtotal: number,
    paymentMethod: string,
    lineItems: string,
    confidence: number,
    extractionIssues: string
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO receipt_ledger (
        email_id, filename, merchant_name, transaction_date, total_amount,
        tax_amount, subtotal, payment_method, line_items, llm_confidence,
        llm_extraction_issues, raw_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      emailId,
      filename,
      merchantName || null,
      transactionDate || null,
      totalAmount || null,
      taxAmount || null,
      subtotal || null,
      paymentMethod || null,
      lineItems,
      confidence,
      extractionIssues, // This is now a JSON string
      '' // raw_text not used with direct PDF processing
    );
  }

  private async storeProcessingLog(
    emailId: string, 
    filename: string, 
    stage: string,
    success: boolean, 
    errorMessage: string | null, 
    processingTimeMs: number | null
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO processing_log (
        email_id, filename, processing_stage, success, error_message, processing_time_ms
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(emailId, filename, stage, success ? 1 : 0, errorMessage, processingTimeMs);
  }

  // Database query methods for UI
  getProcessingStats(): any {
    const stmt = this.db.prepare(`
      SELECT 
        processing_stage,
        success,
        COUNT(*) as count,
        AVG(processing_time_ms) as avg_time_ms
      FROM processing_log 
      GROUP BY processing_stage, success
      ORDER BY processing_stage, success
    `);
    return stmt.all();
  }

  getAllReceiptData(filters: LedgerFilters = {}, pagination: PaginationParams): { entries: LedgerEntry[], total: number } {
    let whereClause = '1=1';
    const params: any[] = [];

    // Apply filters
    if (filters.searchTerm) {
      whereClause += ' AND merchant_name LIKE ?';
      params.push(`%${filters.searchTerm}%`);
    }

    if (filters.dateRange) {
      whereClause += ' AND transaction_date BETWEEN ? AND ?';
      params.push(filters.dateRange.start, filters.dateRange.end);
    }

    if (filters.minAmount !== undefined) {
      whereClause += ' AND total_amount >= ?';
      params.push(filters.minAmount);
    }

    if (filters.maxAmount !== undefined) {
      whereClause += ' AND total_amount <= ?';
      params.push(filters.maxAmount);
    }

    if (filters.minConfidence !== undefined) {
      whereClause += ' AND llm_confidence >= ?';
      params.push(filters.minConfidence);
    }

    // Get total count
    const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM receipt_ledger WHERE ${whereClause}`);
    const { total } = countStmt.get(...params) as { total: number };

    // Get paginated results
    const offset = (pagination.page - 1) * pagination.limit;
    const orderBy = `ORDER BY ${pagination.sortBy} ${pagination.sortOrder.toUpperCase()}`;
    
    const dataStmt = this.db.prepare(`
      SELECT * FROM receipt_ledger 
      WHERE ${whereClause} 
      ${orderBy} 
      LIMIT ? OFFSET ?
    `);
    
    const results = dataStmt.all(...params, pagination.limit, offset) as any[];
    
    const entries: LedgerEntry[] = results.map(row => ({
      id: row.id,
      emailId: row.email_id,
      filename: row.filename,
      merchantName: row.merchant_name || 'Unknown',
      transactionDate: row.transaction_date || '',
      totalAmount: row.total_amount || 0,
      taxAmount: row.tax_amount || 0,
      subtotal: row.subtotal || 0,
      paymentMethod: row.payment_method || 'Unknown',
      lineItems: this.safeJsonParse(row.line_items, []),
      llmConfidence: row.llm_confidence || 0,
      createdAt: row.created_at,
      rawText: row.raw_text || '',
      llmExtractionIssues: this.safeJsonParse(row.llm_extraction_issues, [])
    }));

    return { entries, total };
  }

  getDocumentTypeBreakdown(): Array<{type: string, count: number}> {
    const stmt = this.db.prepare(`
      SELECT document_type as type, COUNT(*) as count
      FROM document_analysis
      GROUP BY document_type
      ORDER BY count DESC
    `);
    return stmt.all() as Array<{type: string, count: number}>;
  }

  getLedgerSummary(): LedgerSummary {
    // Total receipts and amounts
    const summaryStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as totalReceipts,
        COALESCE(SUM(total_amount), 0) as totalAmount,
        COALESCE(AVG(total_amount), 0) as averageAmount
      FROM receipt_ledger 
      WHERE total_amount IS NOT NULL
    `);
    const summary = summaryStmt.get() as any;

    // Top merchant
    const topMerchantStmt = this.db.prepare(`
      SELECT merchant_name
      FROM receipt_ledger 
      WHERE merchant_name IS NOT NULL AND total_amount IS NOT NULL
      GROUP BY merchant_name
      ORDER BY SUM(total_amount) DESC
      LIMIT 1
    `);
    const topMerchantResult = topMerchantStmt.get() as any;

    // Monthly spending
    const monthlyStmt = this.db.prepare(`
      SELECT 
        strftime('%Y-%m', transaction_date) as month,
        COALESCE(SUM(total_amount), 0) as amount
      FROM receipt_ledger 
      WHERE transaction_date IS NOT NULL AND total_amount IS NOT NULL
      GROUP BY strftime('%Y-%m', transaction_date)
      ORDER BY month DESC
      LIMIT 12
    `);
    const monthlySpending = monthlyStmt.all() as Array<{month: string, amount: number}>;

    // Merchant breakdown
    const merchantStmt = this.db.prepare(`
      SELECT 
        merchant_name as merchant,
        COALESCE(SUM(total_amount), 0) as amount,
        COUNT(*) as count
      FROM receipt_ledger 
      WHERE merchant_name IS NOT NULL AND total_amount IS NOT NULL
      GROUP BY merchant_name
      ORDER BY amount DESC
      LIMIT 10
    `);
    const merchantBreakdown = merchantStmt.all() as Array<{merchant: string, amount: number, count: number}>;

    // Document type breakdown
    const documentTypeBreakdown = this.getDocumentTypeBreakdown();

    return {
      totalReceipts: summary.totalReceipts || 0,
      totalAmount: summary.totalAmount || 0,
      averageAmount: summary.averageAmount || 0,
      topMerchant: topMerchantResult?.merchant_name || 'N/A',
      monthlySpending,
      merchantBreakdown,
      documentTypeBreakdown
    };
  }

  getReceiptById(id: number): LedgerEntry | null {
    const stmt = this.db.prepare('SELECT * FROM receipt_ledger WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      emailId: row.email_id,
      filename: row.filename,
      merchantName: row.merchant_name || 'Unknown',
      transactionDate: row.transaction_date || '',
      totalAmount: row.total_amount || 0,
      taxAmount: row.tax_amount || 0,
      subtotal: row.subtotal || 0,
      paymentMethod: row.payment_method || 'Unknown',
      lineItems: this.safeJsonParse(row.line_items, []),
      llmConfidence: row.llm_confidence || 0,
      createdAt: row.created_at,
      rawText: row.raw_text || '',
      llmExtractionIssues: this.safeJsonParse(row.llm_extraction_issues, [])
    };
  }

  exportToCSV(): string {
    const entries = this.getAllReceiptData({}, { page: 1, limit: 10000, sortBy: 'created_at', sortOrder: 'desc' }).entries;
    
    const headers = [
      'ID', 'Email ID', 'Filename', 'Merchant', 'Date', 'Total Amount', 
      'Tax Amount', 'Subtotal', 'Payment Method', 'Confidence', 'Created At'
    ];

    const csvRows = [headers.join(',')];
    
    entries.forEach(entry => {
      const row = [
        entry.id,
        entry.emailId,
        `"${entry.filename}"`,
        `"${entry.merchantName}"`,
        entry.transactionDate,
        entry.totalAmount,
        entry.taxAmount,
        entry.subtotal,
        `"${entry.paymentMethod}"`,
        entry.llmConfidence,
        entry.createdAt
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  getProcessingLogs(filters: any = {}, pagination: { page: number, limit: number } = { page: 1, limit: 50 }): any {
    const { emailId, stage, success } = filters;
    const { page, limit } = pagination;

    // Build filter conditions
    let whereConditions = ['1=1'];
    let params: any[] = [];

    if (emailId) {
      whereConditions.push('email_id = ?');
      params.push(emailId);
    }
    if (stage) {
      whereConditions.push('processing_stage = ?');
      params.push(stage);
    }
    if (success !== undefined) {
      whereConditions.push('success = ?');
      params.push(success ? 1 : 0);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get logs
    const stmt = this.db.prepare(`
      SELECT 
        id,
        email_id,
        filename,
        processing_stage,
        success,
        error_message,
        processing_time_ms,
        created_at
      FROM processing_log
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const logs = stmt.all(...params, limit, (page - 1) * limit);

    // Get total count
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as total
      FROM processing_log
      WHERE ${whereClause}
    `);

    const totalResult = countStmt.get(...params) as { total: number };

    return {
      logs,
      pagination: {
        page,
        limit,
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      }
    };
  }

  close(): void {
    this.db.close();
  }
}
