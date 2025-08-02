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
    const dateRange = req.query.dateRange ? JSON.parse(req.query.dateRange as string) : undefined;
    const minAmount = req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined;
    const maxAmount = req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined;
    const description = req.query.description as string;

    // Build filter object
    const filters: any = {};
    if (dateRange) filters.dateRange = dateRange;
    if (minAmount !== undefined) filters.minAmount = minAmount;
    if (maxAmount !== undefined) filters.maxAmount = maxAmount;
    if (description) filters.description = description;

    // Get bank transactions
    const result = processor.getBankTransactions(filters, { page, limit });

    processor.close();

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting bank transactions:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve bank transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
