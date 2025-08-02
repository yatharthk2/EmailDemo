import { NextApiRequest, NextApiResponse } from 'next';
import { ReceiptProcessorWithDB } from '../../lib/receipt-processor-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const processor = new ReceiptProcessorWithDB();
    
    // Get query parameters for pagination and filtering
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const emailId = req.query.emailId as string;

    // Build filter object
    const filters: any = {};
    if (emailId) filters.emailId = emailId;

    // Get processed files with their status
    const result = processor.getProcessedFiles(filters, { page, limit });

    processor.close();

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting processed files:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve processed files',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
