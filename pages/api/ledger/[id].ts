import { NextApiRequest, NextApiResponse } from 'next';
import { ReceiptProcessorWithDB } from '../../../lib/receipt-processor-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Receipt ID is required' });
    }

    const processor = new ReceiptProcessorWithDB();
    const receipt = processor.getReceiptById(parseInt(id));

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    res.status(200).json({
      success: true,
      data: receipt
    });

  } catch (error) {
    console.error('Receipt detail API error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch receipt details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
