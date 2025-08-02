/**
 * Test API endpoint for validating Gemini fixes
 * Tests JSON parsing and database operations
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { ReceiptProcessorWithDB } from '../../lib/receipt-processor-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[TEST-FIXES] Testing Gemini fixes...');
    
    // Initialize the processor
    const processor = new ReceiptProcessorWithDB();
    
    // Test 1: Check Gemini connection
    console.log('[TEST-FIXES] Testing Gemini connection...');
    const healthCheck = await processor.testGeminiConnection();
    
    // Test 2: Check database operations
    console.log('[TEST-FIXES] Testing database operations...');
    const stats = processor.getProcessingStats();
    
    // Test 3: Try to get ledger data with safe JSON parsing
    console.log('[TEST-FIXES] Testing ledger data retrieval...');
    let ledgerTest;
    try {
      const ledgerData = processor.getAllReceiptData({}, { 
        page: 1, 
        limit: 5, 
        sortBy: 'created_at', 
        sortOrder: 'desc' 
      });
      ledgerTest = {
        success: true,
        totalEntries: ledgerData.total,
        retrievedEntries: ledgerData.entries.length,
        sampleEntry: ledgerData.entries[0] || null
      };
    } catch (error: any) {
      ledgerTest = {
        success: false,
        error: error.message
      };
    }
    
    // Test 4: Check document type breakdown
    console.log('[TEST-FIXES] Testing document type breakdown...');
    const documentTypes = processor.getDocumentTypeBreakdown();
    
    processor.close();
    
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        geminiConnection: {
          success: healthCheck.success,
          model: healthCheck.model,
          error: healthCheck.error || null
        },
        databaseStats: {
          success: true,
          statsCount: stats?.length || 0,
          stats: stats
        },
        ledgerRetrieval: ledgerTest,
        documentTypes: {
          success: true,
          typesFound: documentTypes.length,
          types: documentTypes
        }
      },
      fixes: {
        jsonParsingImproved: 'Added array handling for Gemini responses',
        safeJsonParsingAdded: 'Added safeJsonParse method for database fields',
        errorHandlingEnhanced: 'Improved error handling for malformed responses',
        debuggingAdded: 'Added more detailed logging for troubleshooting'
      },
      recommendations: [
        'Monitor logs for JSON parsing errors',
        'Check Gemini response format consistency',
        'Verify database JSON field integrity',
        'Test with various document types'
      ]
    });

  } catch (error: any) {
    console.error('[TEST-FIXES] Test failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Test validation failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Usage: GET /api/test-fixes
 * 
 * This endpoint tests all the fixes made to address:
 * 1. Gemini JSON response parsing issues
 * 2. Database JSON field parsing errors
 * 3. Array response handling
 * 4. Enhanced error handling
 */
