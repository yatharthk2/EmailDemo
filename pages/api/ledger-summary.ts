import { NextApiRequest, NextApiResponse } from 'next';
import { ReceiptProcessorWithDB } from '../../lib/receipt-processor-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const processor = new ReceiptProcessorWithDB();
    const summary = processor.getLedgerSummary();

    res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Ledger summary API error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch ledger summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
