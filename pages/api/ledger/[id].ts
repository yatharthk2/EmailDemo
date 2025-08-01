import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { ReceiptProcessor } from '../../../lib/receipt-processor';

type ResponseData = {
  success: boolean;
  data?: any;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Check if user is authenticated
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { id } = req.query;
    
    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        success: false,
        error: 'Valid ID parameter required'
      });
    }
    
    const receiptId = parseInt(id, 10);
    
    if (isNaN(receiptId)) {
      return res.status(400).json({
        success: false,
        error: 'ID must be a number'
      });
    }

    // Get ledger entry by ID
    const receiptProcessor = new ReceiptProcessor();
    const data = await receiptProcessor.getLedgerEntryById(receiptId);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }

    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('Error fetching receipt details:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
