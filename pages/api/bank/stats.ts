import { NextApiRequest, NextApiResponse } from 'next';
import { ReceiptProcessorWithDB } from '../../../lib/receipt-processor-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const processor = new ReceiptProcessorWithDB();
    const result = processor.getBankStatistics();
    processor.close();

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting bank stats:', error);
    res.status(500).json({ 
      error: 'Failed to get bank statistics', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
