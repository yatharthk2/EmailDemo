import { NextApiRequest, NextApiResponse } from 'next';
import { ReceiptProcessorWithDB } from '../../../lib/receipt-processor-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const processor = new ReceiptProcessorWithDB();

  try {
    const { action, receiptId, bankTransactionId, matchId, notes } = req.body;

    switch (action) {
      case 'create':
        if (!receiptId || !bankTransactionId) {
          return res.status(400).json({ message: 'Receipt ID and Bank Transaction ID are required' });
        }
        
        const created = processor.createManualMatch(receiptId, bankTransactionId, notes);
        if (created) {
          res.status(200).json({ success: true, message: 'Manual match created successfully' });
        } else {
          res.status(400).json({ success: false, message: 'Failed to create match' });
        }
        break;

      case 'remove':
        if (!matchId) {
          return res.status(400).json({ message: 'Match ID is required' });
        }
        
        const removed = processor.removeMatch(matchId);
        if (removed) {
          res.status(200).json({ success: true, message: 'Match removed successfully' });
        } else {
          res.status(400).json({ success: false, message: 'Failed to remove match' });
        }
        break;

      default:
        res.status(400).json({ message: 'Invalid action' });
    }

  } catch (error) {
    console.error('Error in manual reconciliation:', error);
    res.status(500).json({ 
      message: 'Manual reconciliation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    processor.close();
  }
}
