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
    this.genAI = new GoogleGenerativeAI('AIzaSyB8_HdEc_0VxvVi2w0hXsZS-QrQjX6zbyY');
    
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

      CREATE TABLE IF NOT EXISTS bank_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        statement_file TEXT NOT NULL,
        transaction_date DATE NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        reference TEXT,
        account_number TEXT,
        balance REAL,
        transaction_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reconciliation_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_id INTEGER,
        bank_transaction_id INTEGER,
        match_confidence REAL NOT NULL,
        match_type TEXT NOT NULL,
        is_manual BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (receipt_id) REFERENCES receipt_ledger(id),
        FOREIGN KEY (bank_transaction_id) REFERENCES bank_transactions(id)
      );

      CREATE TABLE IF NOT EXISTS bank_statement_uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        file_size INTEGER,
        transactions_count INTEGER,
        upload_status TEXT DEFAULT 'processing',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_email_id ON document_analysis(email_id);
      CREATE INDEX IF NOT EXISTS idx_receipt_date ON receipt_ledger(transaction_date);
      CREATE INDEX IF NOT EXISTS idx_merchant ON receipt_ledger(merchant_name);
      CREATE INDEX IF NOT EXISTS idx_processing_stage ON processing_log(processing_stage);
      CREATE INDEX IF NOT EXISTS idx_bank_date ON bank_transactions(transaction_date);
      CREATE INDEX IF NOT EXISTS idx_bank_amount ON bank_transactions(amount);
      CREATE INDEX IF NOT EXISTS idx_reconciliation_receipt ON reconciliation_matches(receipt_id);
      CREATE INDEX IF NOT EXISTS idx_reconciliation_bank ON reconciliation_matches(bank_transaction_id);
    `);
  }

  /**
   * Main processing function that orchestrates PDF analysis and data extraction
   * Checks for existing processing and skips if already completed successfully
   * @param {string} emailId - Unique email identifier
   * @param {string} filename - PDF filename
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @param {boolean} forceReprocess - Force reprocessing even if already processed (default: false)
   * @returns {Promise<Object>} Processing result with success status and data
   * 
   * @example
   * const result = await processor.processDocumentWithDB(emailId, filename, pdfBuffer);
   * if (result.success && result.classification?.isReceipt) {
   *   console.log('Receipt processed:', result.extraction?.merchantName);
   * }
   */
  async processDocumentWithDB(emailId: string, filename: string, pdfBuffer: Buffer, forceReprocess: boolean = false): Promise<ProcessingResult> {
    const overallStartTime = Date.now();
    
    try {
      console.log(`[PROCESSOR] 🚀 Starting PDF processing for: ${filename} (${Math.round(pdfBuffer.length / 1024)}KB)`);

      // STEP 0: Document Check - Skip if already processed successfully
      const existingProcessing = await this.checkDocumentProcessingStatus(emailId, filename);
      
      if (existingProcessing.alreadyProcessed && !forceReprocess) {
        console.log(`[PROCESSOR] ⏭️  Document already processed successfully, skipping: ${filename}`);
        console.log(`[PROCESSOR] 📋 Previous processing: ${existingProcessing.documentType} (confidence: ${existingProcessing.confidence}%) - ${existingProcessing.processedAt}`);
        
        return {
          success: true,
          emailId,
          filename,
          classification: {
            isReceipt: existingProcessing.isReceipt || false,
            confidence: existingProcessing.confidence || 0,
            documentType: (existingProcessing.documentType as 'receipt' | 'invoice' | 'statement' | 'other') || 'other',
            reasoning: existingProcessing.reasoning || 'Previously processed',
            keyIndicators: existingProcessing.keyIndicators || []
          },
          extraction: existingProcessing.extractionData,
          processingTimeMs: Date.now() - overallStartTime,
          skipped: true,
          note: `Skipped - already processed on ${existingProcessing.processedAt}`
        };
      }
      
      if (existingProcessing.alreadyProcessed && forceReprocess) {
        console.log(`[PROCESSOR] 🔄 Document previously processed, force reprocessing: ${filename}`);
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

  /**
   * Check if a document has been successfully processed before
   * @param emailId - Email ID
   * @param filename - Filename
   * @returns Processing status information
   */
  private async checkDocumentProcessingStatus(emailId: string, filename: string): Promise<{
    alreadyProcessed: boolean;
    isReceipt?: boolean;
    confidence?: number;
    documentType?: string;
    reasoning?: string;
    keyIndicators?: string[];
    processedAt?: string;
    extractionData?: any;
  }> {
    // Check if document analysis exists and was successful
    const analysisStmt = this.db.prepare(`
      SELECT 
        is_receipt,
        confidence_score,
        document_type,
        llm_reasoning,
        key_indicators,
        processed_at
      FROM document_analysis 
      WHERE email_id = ? AND filename = ?
    `);
    const analysis = analysisStmt.get(emailId, filename) as any;

    if (!analysis) {
      return { alreadyProcessed: false };
    }

    // Check if there's a successful processing log entry
    const logStmt = this.db.prepare(`
      SELECT COUNT(*) as successful_stages
      FROM processing_log 
      WHERE email_id = ? AND filename = ? AND success = 1
    `);
    const logResult = logStmt.get(emailId, filename) as any;

    // Check if receipt data exists (for receipts)
    let extractionData = null;
    if (analysis.is_receipt) {
      const receiptStmt = this.db.prepare(`
        SELECT 
          merchant_name,
          transaction_date,
          total_amount,
          tax_amount,
          subtotal,
          payment_method,
          line_items,
          llm_confidence
        FROM receipt_ledger 
        WHERE email_id = ? AND filename = ?
      `);
      const receiptData = receiptStmt.get(emailId, filename) as any;
      
      if (receiptData) {
        extractionData = {
          merchantName: receiptData.merchant_name,
          transactionDate: receiptData.transaction_date,
          totalAmount: receiptData.total_amount,
          taxAmount: receiptData.tax_amount,
          subtotal: receiptData.subtotal,
          paymentMethod: receiptData.payment_method,
          lineItems: this.safeJsonParse(receiptData.line_items, []),
          confidence: receiptData.llm_confidence
        };
      }
    }

    // Consider document processed if:
    // 1. Analysis exists AND
    // 2. At least one successful processing stage exists AND
    // 3. If it's a receipt, extraction data exists
    const isSuccessfullyProcessed = logResult.successful_stages > 0 && 
      (!analysis.is_receipt || extractionData !== null);

    return {
      alreadyProcessed: isSuccessfullyProcessed,
      isReceipt: Boolean(analysis.is_receipt),
      confidence: analysis.confidence_score,
      documentType: analysis.document_type,
      reasoning: analysis.llm_reasoning,
      keyIndicators: this.safeJsonParse(analysis.key_indicators, []),
      processedAt: analysis.processed_at,
      extractionData
    };
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
        processed_at
      FROM processing_log
      WHERE ${whereClause}
      ORDER BY processed_at DESC
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

  getProcessedFiles(filters: any = {}, pagination: { page: number, limit: number } = { page: 1, limit: 50 }): any {
    const { emailId } = filters;
    const { page, limit } = pagination;

    // Build filter conditions
    let whereConditions = ['1=1'];
    let params: any[] = [];

    if (emailId) {
      whereConditions.push('da.email_id = ?');
      params.push(emailId);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get processed files with their analysis and receipt data
    const stmt = this.db.prepare(`
      SELECT 
        da.id,
        da.email_id,
        da.filename,
        da.is_receipt,
        da.confidence_score,
        da.document_type,
        da.processed_at,
        rl.merchant_name,
        rl.total_amount,
        rl.transaction_date,
        CASE 
          WHEN da.is_receipt = 1 AND rl.id IS NOT NULL THEN 'completed'
          WHEN da.is_receipt = 1 AND rl.id IS NULL THEN 'classified_only'
          WHEN da.is_receipt = 0 THEN 'not_receipt'
          ELSE 'unknown'
        END as processing_status,
        (
          SELECT COUNT(*) 
          FROM processing_log pl 
          WHERE pl.email_id = da.email_id 
            AND pl.filename = da.filename 
            AND pl.success = 1
        ) as successful_stages
      FROM document_analysis da
      LEFT JOIN receipt_ledger rl ON da.email_id = rl.email_id AND da.filename = rl.filename
      WHERE ${whereClause}
      ORDER BY da.processed_at DESC
      LIMIT ? OFFSET ?
    `);

    const files = stmt.all(...params, limit, (page - 1) * limit);

    // Get total count
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as total
      FROM document_analysis da
      WHERE ${whereClause}
    `);

    const totalResult = countStmt.get(...params) as { total: number };

    return {
      files: files.map((file: any) => ({
        id: file.id,
        emailId: file.email_id,
        filename: file.filename,
        isReceipt: Boolean(file.is_receipt),
        confidence: file.confidence_score,
        documentType: file.document_type,
        processedAt: file.processed_at,
        processingStatus: file.processing_status,
        successfulStages: file.successful_stages,
        merchantName: file.merchant_name,
        totalAmount: file.total_amount,
        transactionDate: file.transaction_date
      })),
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

  // Bank Statement Processing Methods
  /**
   * Process CSV bank statement and store transactions
   * @param csvContent - Raw CSV content
   * @param filename - Original filename
   * @returns Processing result
   */
  async processBankStatement(csvContent: string, filename: string): Promise<{
    success: boolean;
    transactionsProcessed: number;
    errors: string[];
    uploadId: number;
  }> {
    const errors: string[] = [];
    let transactionsProcessed = 0;

    try {
      // Create upload record
      const uploadStmt = this.db.prepare(`
        INSERT INTO bank_statement_uploads (filename, original_filename, file_size, upload_status)
        VALUES (?, ?, ?, 'processing')
      `);
      const uploadResult = uploadStmt.run(`bank_${Date.now()}.csv`, filename, csvContent.length);
      const uploadId = uploadResult.lastInsertRowid as number;

      // Parse CSV
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header and one data row');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const transactions = [];

      // Process each transaction line
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = this.parseCSVLine(lines[i]);
          if (values.length < 3) continue; // Skip incomplete rows

          const transaction = this.mapCSVToTransaction(headers, values);
          if (this.validateTransaction(transaction)) {
            transactions.push(transaction);
          } else {
            errors.push(`Row ${i + 1}: Invalid transaction data`);
          }
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
        }
      }

      // Store transactions in database
      const insertStmt = this.db.prepare(`
        INSERT INTO bank_transactions 
        (statement_file, transaction_date, description, amount, reference, account_number, transaction_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = this.db.transaction((transactions: any[]) => {
        for (const txn of transactions) {
          insertStmt.run(
            filename,
            txn.date,
            txn.description,
            txn.amount,
            txn.reference || null,
            txn.accountNumber || null,
            txn.type || 'unknown'
          );
          transactionsProcessed++;
        }
      });

      insertMany(transactions);

      // Update upload status
      const updateStmt = this.db.prepare(`
        UPDATE bank_statement_uploads 
        SET transactions_count = ?, upload_status = 'completed'
        WHERE id = ?
      `);
      updateStmt.run(transactionsProcessed, uploadId);

      return {
        success: true,
        transactionsProcessed,
        errors,
        uploadId
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      return {
        success: false,
        transactionsProcessed,
        errors,
        uploadId: 0
      };
    }
  }

  /**
   * Add a single bank transaction to the database
   * @param filename - Original filename for tracking
   * @param date - Transaction date (YYYY-MM-DD format)
   * @param description - Transaction description/merchant
   * @param amount - Transaction amount (positive for credits, negative for debits)
   * @param reference - Reference number (optional)
   * @param accountNumber - Account number (optional)
   * @param balance - Account balance after transaction (optional)
   */
  addBankTransaction(
    filename: string,
    date: string,
    description: string,
    amount: number,
    reference?: string,
    accountNumber?: string,
    balance?: number
  ): void {
    try {
      const insertStmt = this.db.prepare(`
        INSERT INTO bank_transactions 
        (statement_file, transaction_date, description, amount, transaction_type, reference, account_number, balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Determine transaction type and keep original amount sign
      const transactionType = amount < 0 ? 'debit' : 'credit';

      insertStmt.run(
        filename,
        date,
        description,
        amount, // Keep original sign - negative for debits, positive for credits
        transactionType,
        reference || null,
        accountNumber || null,
        balance || null
      );

      console.log(`Added bank transaction: ${date} - ${description} - $${amount} (${transactionType})`);
    } catch (error) {
      console.error('Error adding bank transaction:', error);
      throw error;
    }
  }

  /**
   * Parse CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  /**
   * Map CSV columns to transaction object
   */
  private mapCSVToTransaction(headers: string[], values: string[]): any {
    const transaction: any = {};

    headers.forEach((header, index) => {
      const value = values[index] || '';
      const lowerHeader = header.toLowerCase();

      if (lowerHeader.includes('date')) {
        transaction.date = this.parseDate(value);
      } else if (lowerHeader.includes('description') || lowerHeader.includes('details')) {
        transaction.description = value;
      } else if (lowerHeader.includes('amount') || lowerHeader.includes('debit') || lowerHeader.includes('credit')) {
        transaction.amount = this.parseAmount(value);
      } else if (lowerHeader.includes('reference') || lowerHeader.includes('ref')) {
        transaction.reference = value;
      } else if (lowerHeader.includes('account')) {
        transaction.accountNumber = value;
      } else if (lowerHeader.includes('type')) {
        transaction.type = value;
      }
    });

    return transaction;
  }

  /**
   * Parse date from various formats with enhanced error handling
   */
  private parseDate(dateStr: string): string {
    if (!dateStr || typeof dateStr !== 'string') {
      throw new Error('Invalid date input: must be a non-empty string');
    }

    try {
      // Clean and normalize the input
      const cleaned = dateStr.replace(/["\s]/g, '').trim();
      
      if (!cleaned) {
        throw new Error('Empty date string after cleaning');
      }

      // Define comprehensive date format patterns
      const formats = [
        { pattern: /^(\d{4})-(\d{2})-(\d{2})$/, format: 'YYYY-MM-DD', group: [1, 2, 3] },
        { pattern: /^(\d{2})\/(\d{2})\/(\d{4})$/, format: 'MM/DD/YYYY', group: [3, 1, 2] },
        { pattern: /^(\d{2})-(\d{2})-(\d{4})$/, format: 'MM-DD-YYYY', group: [3, 1, 2] },
        { pattern: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, format: 'M/D/YYYY', group: [3, 1, 2] },
        { pattern: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, format: 'M-D-YYYY', group: [3, 1, 2] },
        { pattern: /^(\d{4})\/(\d{2})\/(\d{2})$/, format: 'YYYY/MM/DD', group: [1, 2, 3] },
        { pattern: /^(\d{2})\.(\d{2})\.(\d{4})$/, format: 'DD.MM.YYYY', group: [3, 2, 1] },
        { pattern: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, format: 'D.M.YYYY', group: [3, 2, 1] }
      ];

      // Try to match against known patterns first
      for (const { pattern, group } of formats) {
        const match = cleaned.match(pattern);
        if (match) {
          const year = match[group[0]];
          const month = match[group[1]].padStart(2, '0');
          const day = match[group[2]].padStart(2, '0');
          
          // Validate the parsed date
          const dateObj = new Date(`${year}-${month}-${day}`);
          if (!isNaN(dateObj.getTime()) && 
              dateObj.getFullYear() == parseInt(year) &&
              dateObj.getMonth() + 1 == parseInt(month) &&
              dateObj.getDate() == parseInt(day)) {
            return `${year}-${month}-${day}`;
          }
        }
      }

      // Try native Date parsing as fallback
      const date = new Date(cleaned);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }

      // If all else fails, try some edge cases
      const edgeCases = [
        cleaned.replace(/\//g, '-'),
        cleaned.replace(/\./g, '-'),
        cleaned.replace(/(\d{2})(\d{2})(\d{4})/, '$3-$1-$2') // MMDDYYYY
      ];

      for (const edgeCase of edgeCases) {
        const date = new Date(edgeCase);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }

      throw new Error(`Unrecognized date format: ${dateStr}`);
    } catch (error) {
      console.error(`Date parsing error for "${dateStr}":`, error);
      throw new Error(`Invalid date: ${dateStr} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse amount from string, handling various formats
   */
  /**
   * Parse amount from string with enhanced error handling and format support
   */
  private parseAmount(amountStr: string): number {
    if (!amountStr || typeof amountStr !== 'string') {
      throw new Error('Invalid amount input: must be a non-empty string');
    }

    try {
      // Clean the amount string - remove currency symbols, commas, spaces
      let cleaned = amountStr.trim()
        .replace(/[$£€¥₹₽¢₩₪₿,\s]/g, '') // Remove currency symbols and commas
        .replace(/^\+/, ''); // Remove leading plus

      if (!cleaned) {
        throw new Error('Empty amount string after cleaning');
      }

      // Handle negative amounts (parentheses, minus sign, or 'CR'/'Dr' notation)
      let isNegative = false;
      
      if (cleaned.includes('(') && cleaned.includes(')')) {
        // Parentheses notation for negative amounts
        isNegative = true;
        cleaned = cleaned.replace(/[()]/g, '');
      } else if (cleaned.startsWith('-')) {
        // Minus sign notation
        isNegative = true;
        cleaned = cleaned.substring(1);
      } else if (cleaned.toLowerCase().includes('cr')) {
        // Credit notation (typically negative for expenses)
        isNegative = true;
        cleaned = cleaned.replace(/cr/gi, '');
      } else if (cleaned.toLowerCase().includes('dr')) {
        // Debit notation (typically positive for expenses)
        cleaned = cleaned.replace(/dr/gi, '');
      }

      // Remove any remaining non-numeric characters except decimal point
      cleaned = cleaned.replace(/[^0-9.]/g, '');

      if (!cleaned) {
        throw new Error('No numeric content found');
      }

      // Handle multiple decimal points
      const decimalCount = (cleaned.match(/\./g) || []).length;
      if (decimalCount > 1) {
        // Assume the last decimal is the actual decimal point
        const lastDecimalIndex = cleaned.lastIndexOf('.');
        cleaned = cleaned.substring(0, lastDecimalIndex).replace(/\./g, '') + 
                 cleaned.substring(lastDecimalIndex);
      }

      const amount = parseFloat(cleaned);
      
      if (isNaN(amount)) {
        throw new Error(`Cannot parse as number: ${cleaned}`);
      }

      if (amount < 0) {
        throw new Error('Amount cannot be negative after parsing');
      }

      return isNegative ? -amount : amount;
    } catch (error) {
      console.error(`Amount parsing error for "${amountStr}":`, error);
      throw new Error(`Invalid amount: ${amountStr} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate transaction data
   */
  private validateTransaction(transaction: any): boolean {
    return !!(
      transaction.date &&
      transaction.description &&
      typeof transaction.amount === 'number' &&
      !isNaN(transaction.amount)
    );
  }

  /**
   * Get all bank transactions with filtering
   */
  getBankTransactions(
    filters?: {
      dateRange?: { start: string; end: string };
      minAmount?: number;
      maxAmount?: number;
      description?: string;
    },
    pagination?: { page: number; limit: number }
  ): { transactions: any[]; total: number; page: number; limit: number } {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    
    let whereConditions = ['1=1'];
    let params: any[] = [];

    if (filters?.dateRange) {
      whereConditions.push('transaction_date BETWEEN ? AND ?');
      params.push(filters.dateRange.start, filters.dateRange.end);
    }

    if (filters?.minAmount !== undefined) {
      whereConditions.push('amount >= ?');
      params.push(filters.minAmount);
    }

    if (filters?.maxAmount !== undefined) {
      whereConditions.push('amount <= ?');
      params.push(filters.maxAmount);
    }

    if (filters?.description) {
      whereConditions.push('description LIKE ?');
      params.push(`%${filters.description}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM bank_transactions WHERE ${whereClause}`);
    const { total } = countStmt.get(...params) as { total: number };

    // Get paginated results
    const offset = (page - 1) * limit;
    const dataStmt = this.db.prepare(`
      SELECT * FROM bank_transactions 
      WHERE ${whereClause} 
      ORDER BY transaction_date DESC, id DESC
      LIMIT ? OFFSET ?
    `);

    const transactions = dataStmt.all(...params, limit, offset);

    return {
      transactions,
      total,
      page,
      limit
    };
  }

  // Reconciliation Engine Methods
  /**
   * Perform automatic reconciliation between receipts and bank transactions
   */
  async performReconciliation(): Promise<{
    matches: any[];
    receiptOnlyCount: number;
    bankOnlyCount: number;
    totalMatches: number;
  }> {
    // Clear existing automatic matches (keep manual ones)
    const clearStmt = this.db.prepare('DELETE FROM reconciliation_matches WHERE is_manual = 0');
    clearStmt.run();

    // Get all receipts and bank transactions
    const receipts = this.db.prepare(`
      SELECT id, merchant_name, transaction_date, total_amount, created_at
      FROM receipt_ledger 
      WHERE total_amount IS NOT NULL AND transaction_date IS NOT NULL
      ORDER BY transaction_date DESC
    `).all();

    const bankTransactions = this.db.prepare(`
      SELECT id, description, transaction_date, amount, reference
      FROM bank_transactions 
      WHERE amount < 0  -- Focus on debits/expenses
      ORDER BY transaction_date DESC
    `).all();

    const matches: any[] = [];
    const matchedReceiptIds = new Set<number>();
    const matchedBankIds = new Set<number>();

    // Perform matching
    for (const receipt of receipts as any[]) {
      if (matchedReceiptIds.has(receipt.id)) continue;

      const bestMatch = this.findBestMatch(receipt, bankTransactions as any[], matchedBankIds);
      
      if (bestMatch && bestMatch.confidence >= 70) { // 70% confidence threshold
        matches.push({
          receiptId: receipt.id,
          bankTransactionId: bestMatch.bankTransaction.id,
          confidence: bestMatch.confidence,
          matchType: bestMatch.type,
          receipt: receipt,
          bankTransaction: bestMatch.bankTransaction
        });

        matchedReceiptIds.add(receipt.id);
        matchedBankIds.add(bestMatch.bankTransaction.id);

        // Store match in database
        const insertStmt = this.db.prepare(`
          INSERT INTO reconciliation_matches 
          (receipt_id, bank_transaction_id, match_confidence, match_type, is_manual)
          VALUES (?, ?, ?, ?, 0)
        `);
        insertStmt.run(
          receipt.id,
          bestMatch.bankTransaction.id,
          bestMatch.confidence,
          bestMatch.type
        );
      }
    }

    const receiptOnlyCount = receipts.length - matchedReceiptIds.size;
    const bankOnlyCount = (bankTransactions as any[]).length - matchedBankIds.size;

    return {
      matches,
      receiptOnlyCount,
      bankOnlyCount,
      totalMatches: matches.length
    };
  }

  /**
   * Find best matching bank transaction for a receipt
   */
  private findBestMatch(receipt: any, bankTransactions: any[], excludeIds: Set<number>): {
    bankTransaction: any;
    confidence: number;
    type: string;
  } | null {
    let bestMatch = null;
    let bestConfidence = 0;

    for (const bankTxn of bankTransactions) {
      if (excludeIds.has(bankTxn.id)) continue;

      const confidence = this.calculateMatchConfidence(receipt, bankTxn);
      
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = {
          bankTransaction: bankTxn,
          confidence,
          type: this.getMatchType(confidence)
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate match confidence between receipt and bank transaction
   */
  private calculateMatchConfidence(receipt: any, bankTxn: any): number {
    let confidence = 0;

    // Amount matching (most important factor - 50% weight)
    const receiptAmount = Math.abs(receipt.total_amount);
    const bankAmount = Math.abs(bankTxn.amount);
    const amountDiff = Math.abs(receiptAmount - bankAmount);
    const amountMatch = Math.max(0, 100 - (amountDiff / receiptAmount) * 100);
    confidence += amountMatch * 0.5;

    // Date matching (30% weight)
    const dateMatch = this.calculateDateMatch(receipt.transaction_date, bankTxn.transaction_date);
    confidence += dateMatch * 0.3;

    // Merchant/description matching (20% weight)
    const textMatch = this.calculateTextMatch(receipt.merchant_name, bankTxn.description);
    confidence += textMatch * 0.2;

    return Math.min(100, confidence);
  }

  /**
   * Calculate date match score
   */
  private calculateDateMatch(receiptDate: string, bankDate: string): number {
    try {
      const date1 = new Date(receiptDate);
      const date2 = new Date(bankDate);
      const diffDays = Math.abs((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 100;
      if (diffDays <= 1) return 90;
      if (diffDays <= 2) return 75;
      if (diffDays <= 3) return 60;
      if (diffDays <= 7) return 40;
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Calculate text similarity between merchant name and bank description
   */
  private calculateTextMatch(merchant: string, description: string): number {
    if (!merchant || !description) return 0;

    const m1 = merchant.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const m2 = description.toLowerCase().replace(/[^\w\s]/g, '').trim();

    // Exact match
    if (m1 === m2) return 100;

    // Check if merchant name is contained in description
    if (m2.includes(m1) || m1.includes(m2)) return 80;

    // Word-by-word matching
    const words1 = m1.split(/\s+/);
    const words2 = m2.split(/\s+/);
    
    let matchedWords = 0;
    for (const word1 of words1) {
      if (word1.length > 2 && words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        matchedWords++;
      }
    }

    const wordMatchPercent = (matchedWords / Math.max(words1.length, 1)) * 100;
    return Math.min(70, wordMatchPercent);
  }

  /**
   * Get match type based on confidence score
   */
  private getMatchType(confidence: number): string {
    if (confidence >= 90) return 'exact';
    if (confidence >= 70) return 'probable';
    if (confidence >= 50) return 'possible';
    return 'uncertain';
  }

  /**
   * Get reconciliation results
   */
  getReconciliationResults(): {
    matches: any[];
    receiptOnly: any[];
    bankOnly: any[];
    summary: any;
  } {
    // Get matched transactions
    const matchesStmt = this.db.prepare(`
      SELECT 
        rm.*,
        rl.merchant_name, rl.transaction_date as receipt_date, rl.total_amount as receipt_amount,
        rl.filename, rl.email_id,
        bt.description, bt.transaction_date as bank_date, bt.amount as bank_amount,
        bt.reference, bt.statement_file
      FROM reconciliation_matches rm
      JOIN receipt_ledger rl ON rm.receipt_id = rl.id
      JOIN bank_transactions bt ON rm.bank_transaction_id = bt.id
      ORDER BY rm.match_confidence DESC, rl.transaction_date DESC
    `);
    const matches = matchesStmt.all();

    // Get unmatched receipts
    const receiptOnlyStmt = this.db.prepare(`
      SELECT rl.*
      FROM receipt_ledger rl
      LEFT JOIN reconciliation_matches rm ON rl.id = rm.receipt_id
      WHERE rm.receipt_id IS NULL 
        AND rl.total_amount IS NOT NULL 
        AND rl.transaction_date IS NOT NULL
      ORDER BY rl.transaction_date DESC
    `);
    const receiptOnly = receiptOnlyStmt.all();

    // Get unmatched bank transactions (debits only)
    const bankOnlyStmt = this.db.prepare(`
      SELECT bt.*
      FROM bank_transactions bt
      LEFT JOIN reconciliation_matches rm ON bt.id = rm.bank_transaction_id
      WHERE rm.bank_transaction_id IS NULL 
        AND bt.amount < 0
      ORDER BY bt.transaction_date DESC
    `);
    const bankOnly = bankOnlyStmt.all();

    // Calculate summary
    const summary = {
      totalReceipts: receiptOnly.length + matches.length,
      totalBankTransactions: bankOnly.length + matches.length,
      totalMatches: matches.length,
      exactMatches: matches.filter((m: any) => m.match_type === 'exact').length,
      probableMatches: matches.filter((m: any) => m.match_type === 'probable').length,
      manualMatches: matches.filter((m: any) => m.is_manual === 1).length,
      receiptOnlyCount: receiptOnly.length,
      bankOnlyCount: bankOnly.length,
      reconciliationRate: matches.length > 0 ? 
        (matches.length / (receiptOnly.length + matches.length)) * 100 : 0
    };

    return {
      matches,
      receiptOnly,
      bankOnly,
      summary
    };
  }

  /**
   * Create manual match between receipt and bank transaction
   */
  createManualMatch(receiptId: number, bankTransactionId: number, notes?: string): boolean {
    try {
      // Check if either is already matched
      const existingStmt = this.db.prepare(`
        SELECT id FROM reconciliation_matches 
        WHERE receipt_id = ? OR bank_transaction_id = ?
      `);
      const existing = existingStmt.get(receiptId, bankTransactionId);
      
      if (existing) {
        throw new Error('One of the transactions is already matched');
      }

      const insertStmt = this.db.prepare(`
        INSERT INTO reconciliation_matches 
        (receipt_id, bank_transaction_id, match_confidence, match_type, is_manual, notes)
        VALUES (?, ?, 100, 'manual', 1, ?)
      `);
      
      insertStmt.run(receiptId, bankTransactionId, notes || null);
      return true;
    } catch (error) {
      console.error('Error creating manual match:', error);
      return false;
    }
  }

  /**
   * Remove a match
   */
  removeMatch(matchId: number): boolean {
    try {
      const deleteStmt = this.db.prepare('DELETE FROM reconciliation_matches WHERE id = ?');
      const result = deleteStmt.run(matchId);
      return result.changes > 0;
    } catch (error) {
      console.error('Error removing match:', error);
      return false;
    }
  }

  /**
   * Get reconciliation history with filtering and pagination
   */
  getReconciliationHistory(
    filters?: {
      status?: string;
      dateRange?: { start: string; end: string };
    },
    pagination?: { page: number; limit: number }
  ): { reconciliations: any[]; total: number; page: number; limit: number } {
    let query = `
      SELECT 
        rm.*,
        bt.description as bank_description,
        bt.amount as bank_amount,
        bt.transaction_date as bank_date,
        rt.merchant_name,
        rt.total_amount as receipt_amount,
        rt.transaction_date as receipt_date
      FROM reconciliation_matches rm
      LEFT JOIN bank_transactions bt ON rm.bank_transaction_id = bt.id
      LEFT JOIN receipt_ledger rt ON rm.receipt_id = rt.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status) {
      query += ' AND rm.match_type = ?';
      params.push(filters.status);
    }

    if (filters?.dateRange) {
      query += ' AND rm.created_at >= ? AND rm.created_at <= ?';
      params.push(filters.dateRange.start, filters.dateRange.end);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM reconciliation_matches rm WHERE 1=1` + 
      (filters?.status ? ' AND rm.match_type = ?' : '') +
      (filters?.dateRange ? ' AND rm.created_at >= ? AND rm.created_at <= ?' : '');
    const countResult = this.db.prepare(countQuery).get(params) as { count: number };
    const total = countResult.count;

    // Add pagination
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit;
      query += ' ORDER BY rm.created_at DESC LIMIT ? OFFSET ?';
      params.push(pagination.limit, offset);
    } else {
      query += ' ORDER BY rm.created_at DESC';
    }

    const reconciliations = this.db.prepare(query).all(params);

    return {
      reconciliations,
      total,
      page: pagination?.page || 1,
      limit: pagination?.limit || reconciliations.length
    };
  }

  /**
   * Get bank transaction statistics
   */
  getBankStatistics(): {
    totalTransactions: number;
    totalAmount: number;
    totalDebits: number;
    totalCredits: number;
    statementFiles: number;
    dateRange: { start: string | null; end: string | null };
    recentUploads: any[];
  } {
    // Get bank transaction statistics
    const statsStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as totalTransactions,
        SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as totalDebits,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as totalCredits,
        MIN(transaction_date) as earliestDate,
        MAX(transaction_date) as latestDate,
        COUNT(DISTINCT statement_file) as statementFiles
      FROM bank_transactions
    `);
    
    const stats = statsStmt.get() as any;
    
    // Get recent uploads
    const uploadsStmt = this.db.prepare(`
      SELECT filename, transactions_count, upload_status, created_at
      FROM bank_statement_uploads
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    const recentUploads = uploadsStmt.all();

    return {
      totalTransactions: stats?.totalTransactions || 0,
      totalAmount: (stats?.totalDebits || 0) + (stats?.totalCredits || 0),
      totalDebits: stats?.totalDebits || 0,
      totalCredits: stats?.totalCredits || 0,
      statementFiles: stats?.statementFiles || 0,
      dateRange: {
        start: stats?.earliestDate || null,
        end: stats?.latestDate || null
      },
      recentUploads: recentUploads.map((upload: any) => ({
        filename: upload.filename,
        transactionsCount: upload.transactions_count,
        status: upload.upload_status,
        uploadedAt: upload.created_at
      }))
    };
  }
}
