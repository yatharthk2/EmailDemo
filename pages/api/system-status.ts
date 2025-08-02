import { NextApiRequest, NextApiResponse } from 'next';
import { ReceiptProcessorWithDB } from '../../lib/receipt-processor-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const processor = new ReceiptProcessorWithDB();
    
    // Get processing stats
    const stats = processor.getProcessingStats();
    
    // Get recent receipt data
    const recentReceipts = processor.getAllReceiptData({}, { page: 1, limit: 10, sortBy: 'created_at', sortOrder: 'desc' });
    
    // Get recent logs
    const recentLogs = processor.getProcessingLogs({}, { page: 1, limit: 10 });
    
    processor.close();

    res.status(200).json({
      message: 'System status check completed successfully',
      stats,
      recentReceipts: recentReceipts.entries,
      recentLogs: recentLogs.logs,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking system status:', error);
    res.status(500).json({ 
      message: 'Failed to check system status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
