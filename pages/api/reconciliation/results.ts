import { NextApiRequest, NextApiResponse } from 'next';
import { ReceiptProcessorWithDB } from '../../../lib/receipt-processor-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const processor = new ReceiptProcessorWithDB();
    const results = processor.getReconciliationResults();
    processor.close();

    res.status(200).json(results);
  } catch (error) {
    console.error('Error getting reconciliation results:', error);
    res.status(500).json({ 
      error: 'Failed to get reconciliation results', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
