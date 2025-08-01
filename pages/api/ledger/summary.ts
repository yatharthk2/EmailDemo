import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { ReceiptProcessor } from '../../../lib/receipt-processor';
import { LedgerSummaryData } from '../../../types/receipt-types';

type ResponseData = {
  success: boolean;
  data?: LedgerSummaryData;
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
    // Get ledger summary
    const receiptProcessor = new ReceiptProcessor();
    const summaryData = await receiptProcessor.getLedgerSummary();

    return res.status(200).json({
      success: true,
      data: summaryData
    });
  } catch (error) {
    console.error('Error fetching ledger summary:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
