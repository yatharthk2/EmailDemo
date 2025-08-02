/**
 * Test API endpoint for Gemini 2.0 Flash receipt processing
 * Demonstrates the new direct PDF processing capabilities
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { ReceiptProcessorWithDB } from '../../lib/receipt-processor-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[TEST-GEMINI] Initializing Gemini 2.0 Flash processor...');
    
    // Initialize the processor with Gemini 2.0 Flash
    const processor = new ReceiptProcessorWithDB();
    
    // Test Gemini API connection
    console.log('[TEST-GEMINI] Testing Gemini API connection...');
    const healthCheck = await processor.testGeminiConnection();
    
    if (!healthCheck.success) {
      console.error('[TEST-GEMINI] Gemini API connection failed:', healthCheck.error);
      return res.status(500).json({
        success: false,
        error: 'Gemini API connection failed',
        details: healthCheck.error,
        model: healthCheck.model
      });
    }
    
    console.log('[TEST-GEMINI] ✅ Gemini API connection successful');
    
    // Return success response with system information
    return res.status(200).json({
      success: true,
      message: 'Gemini 2.0 Flash receipt processor initialized successfully',
      system: {
        model: 'gemini-2.0-flash-exp',
        capabilities: [
          'Direct PDF processing (no OCR required)',
          'Advanced document classification',
          'Structured receipt data extraction',
          'Multi-modal AI understanding',
          'JSON-formatted responses'
        ],
        features: {
          eliminatesOCR: true,
          fasterProcessing: true,
          betterAccuracy: true,
          costEffective: true,
          latestModel: true
        }
      },
      apiTest: {
        connectionStatus: 'connected',
        model: healthCheck.model,
        responseTime: 'varies per request',
        testResponse: healthCheck.response
      },
      usage: {
        endpoint: '/api/test-gemini',
        description: 'Test Gemini 2.0 Flash API connectivity',
        nextSteps: [
          'Use /api/process-emails for email processing',
          'Use /api/emails-auto-process for batch processing',
          'Monitor processing logs via /api/processing-logs'
        ]
      }
    });

  } catch (error: any) {
    console.error('[TEST-GEMINI] System initialization error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to initialize Gemini 2.0 Flash processor',
      details: error.message,
      troubleshooting: {
        checkApiKey: 'Verify GEMINI_API_KEY environment variable',
        checkNetwork: 'Ensure internet connectivity to Google AI services',
        checkDependencies: 'Verify @google/generative-ai package is installed',
        checkModel: 'Confirm gemini-2.0-flash-exp model availability'
      }
    });
  }
}

/**
 * API Response Examples:
 * 
 * Success Response:
 * {
 *   "success": true,
 *   "message": "Gemini 2.0 Flash receipt processor initialized successfully",
 *   "system": {
 *     "model": "gemini-2.0-flash-exp",
 *     "capabilities": [...],
 *     "features": {...}
 *   },
 *   "apiTest": {
 *     "connectionStatus": "connected",
 *     "model": "gemini-2.0-flash-exp"
 *   }
 * }
 * 
 * Error Response:
 * {
 *   "success": false,
 *   "error": "Failed to initialize Gemini 2.0 Flash processor",
 *   "details": "API key not configured",
 *   "troubleshooting": {...}
 * }
 */
