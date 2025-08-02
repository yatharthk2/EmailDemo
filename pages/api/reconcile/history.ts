import { NextApiRequest, NextApiResponse } from 'next';
import { ReceiptProcessorWithDB } from '../../../lib/receipt-processor-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const processor = new ReceiptProcessorWithDB();
    
    // Get query parameters for pagination and filtering
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;
    const dateRange = req.query.dateRange ? JSON.parse(req.query.dateRange as string) : undefined;

    // Build filter object
    const filters: any = {};
    if (status) filters.status = status;
    if (dateRange) filters.dateRange = dateRange;

    // Get reconciliation history
    const result = processor.getReconciliationHistory(filters, { page, limit });

    processor.close();

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting reconciliation history:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve reconciliation history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
