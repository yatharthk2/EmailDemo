import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { ReceiptProcessor } from '../../../lib/receipt-processor';
import { LedgerFilterOptions } from '../../../types/receipt-types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
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
    // Extract query parameters for filtering
    const { 
      search, 
      startDate, 
      endDate, 
      minAmount,
      maxAmount, 
      minConfidence 
    } = req.query;
    
    // Parse query parameters
    const filters: LedgerFilterOptions = {
      searchTerm: search as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
      minConfidence: minConfidence ? parseInt(minConfidence as string, 10) : undefined
    };
    
    // Generate CSV
    const receiptProcessor = new ReceiptProcessor();
    const csvContent = await receiptProcessor.exportLedgerAsCsv(filters);
    
    // Get current date for filename
    const date = new Date().toISOString().split('T')[0];
    const filename = `receipt-ledger-export-${date}.csv`;
    
    // Set appropriate headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send the CSV content
    res.status(200).send(csvContent);

  } catch (error) {
    console.error('Error exporting ledger to CSV:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
