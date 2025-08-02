import { NextApiRequest, NextApiResponse } from 'next';
import { ReceiptProcessorWithDB } from '../../../lib/receipt-processor-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const processor = new ReceiptProcessorWithDB();
    const result = await processor.performReconciliation();
    processor.close();

    res.status(200).json({
      success: true,
      message: 'Reconciliation completed successfully',
      ...result
    });
  } catch (error) {
    console.error('Error running reconciliation:', error);
    res.status(500).json({ 
      error: 'Failed to run reconciliation', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
