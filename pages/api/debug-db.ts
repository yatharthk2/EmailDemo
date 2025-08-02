import { NextApiRequest, NextApiResponse } from 'next';
import { ReceiptProcessorWithDB } from '../../lib/receipt-processor-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const processor = new ReceiptProcessorWithDB();
    
    // Get all data from tables for debugging
    const documentAnalysis = processor.getProcessingStats();
    const receiptData = processor.getAllReceiptData({}, { page: 1, limit: 100, sortBy: 'created_at', sortOrder: 'desc' });
    
    // Also get raw table data for debugging
    const db = (processor as any).db;
    const rawDocuments = db.prepare('SELECT * FROM document_analysis ORDER BY processed_at DESC LIMIT 10').all();
    const rawReceipts = db.prepare('SELECT * FROM receipt_ledger ORDER BY created_at DESC LIMIT 10').all();
    const rawLogs = db.prepare('SELECT * FROM processing_log ORDER BY processed_at DESC LIMIT 20').all();

    res.status(200).json({
      success: true,
      debug: {
        documentAnalysis,
        receiptData: {
          total: receiptData.total,
          entries: receiptData.entries
        },
        rawTables: {
          documents: rawDocuments,
          receipts: rawReceipts,
          logs: rawLogs
        }
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch debug data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
