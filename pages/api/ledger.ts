import { NextApiRequest, NextApiResponse } from 'next';
import { ReceiptProcessorWithDB } from '../../lib/receipt-processor-db';
import { LedgerFilters, PaginationParams } from '../../types/receipt-processing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const processor = new ReceiptProcessorWithDB();

    // Parse query parameters
    const {
      page = '1',
      limit = '20',
      sortBy = 'created_at',
      sortOrder = 'desc',
      searchTerm,
      dateStart,
      dateEnd,
      minAmount,
      maxAmount,
      minConfidence
    } = req.query;

    // Build filters
    const filters: LedgerFilters = {};
    
    if (searchTerm && typeof searchTerm === 'string') {
      filters.searchTerm = searchTerm;
    }

    if (dateStart && dateEnd && typeof dateStart === 'string' && typeof dateEnd === 'string') {
      filters.dateRange = { start: dateStart, end: dateEnd };
    }

    if (minAmount && typeof minAmount === 'string') {
      filters.minAmount = parseFloat(minAmount);
    }

    if (maxAmount && typeof maxAmount === 'string') {
      filters.maxAmount = parseFloat(maxAmount);
    }

    if (minConfidence && typeof minConfidence === 'string') {
      filters.minConfidence = parseInt(minConfidence);
    }

    // Build pagination
    const pagination: PaginationParams = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: (sortOrder as string) === 'asc' ? 'asc' : 'desc'
    };

    const result = processor.getAllReceiptData(filters, pagination);

    res.status(200).json({
      success: true,
      data: result.entries,
      pagination: {
        ...pagination,
        total: result.total,
        totalPages: Math.ceil(result.total / pagination.limit)
      }
    });

  } catch (error) {
    console.error('Ledger API error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch ledger data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
