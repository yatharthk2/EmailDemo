import { NextApiRequest, NextApiResponse } from 'next';
import { ReceiptProcessorWithDB } from '../../../lib/receipt-processor-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const processor = new ReceiptProcessorWithDB();

  try {
    switch (req.method) {
      case 'POST':
        // Run reconciliation
        const result = await processor.performReconciliation();
        processor.close();
        
        res.status(200).json({
          success: true,
          message: 'Reconciliation completed',
          ...result
        });
        break;

      case 'GET':
        // Get reconciliation results
        const results = processor.getReconciliationResults();
        processor.close();
        
        res.status(200).json({
          success: true,
          ...results
        });
        break;

      default:
        processor.close();
        res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    processor.close();
    console.error('Error in reconciliation:', error);
    res.status(500).json({ 
      message: 'Reconciliation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
