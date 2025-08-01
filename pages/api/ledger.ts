import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { ReceiptProcessor } from '../../lib/receipt-processor';
import { LedgerEntry, PaginatedResult } from '../../types/receipt-types';

type ResponseData = {
  success: boolean;
  message?: string;
  data?: PaginatedResult<LedgerEntry>;
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
      message: 'Authentication required' 
    });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    // Extract query parameters
    const { 
      search, 
      startDate, 
      endDate, 
      minAmount,
      maxAmount, 
      minConfidence, 
      sortField, 
      sortDirection,
      page,
      pageSize
    } = req.query;
    
    // Parse query parameters
    const filters = {
      searchTerm: search as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
      minConfidence: minConfidence ? parseInt(minConfidence as string, 10) : undefined,
      sortField: sortField as string,
      sortDirection: (sortDirection as 'asc' | 'desc') || 'desc',
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : 10
    };
    
    // Get ledger entries
    const receiptProcessor = new ReceiptProcessor();
    const data = await receiptProcessor.getLedgerEntries(filters);

    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('Error fetching ledger entries:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
