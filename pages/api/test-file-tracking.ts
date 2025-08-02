import { NextApiRequest, NextApiResponse } from 'next';
import { ReceiptProcessorWithDB } from '../../lib/receipt-processor-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const processor = new ReceiptProcessorWithDB();
    
    // Test the file tracking functionality
    const testEmailId = 'test-email-123';
    const testFilename = 'test-receipt.pdf';
    
    // Check if a non-existent file is already processed
    const status1 = await (processor as any).checkDocumentProcessingStatus(testEmailId, testFilename);
    
    // Insert some test data
    await (processor as any).storeDocumentAnalysis(
      testEmailId,
      testFilename,
      true, // isReceipt
      85,   // confidence
      'receipt',
      'Test reasoning',
      JSON.stringify(['total amount', 'merchant name'])
    );
    
    await (processor as any).storeProcessingLog(
      testEmailId,
      testFilename,
      'classification',
      true,
      null,
      1500
    );
    
    // Check status after classification
    const status2 = await (processor as any).checkDocumentProcessingStatus(testEmailId, testFilename);
    
    // Add receipt data
    await (processor as any).storeReceiptData(
      testEmailId,
      testFilename,
      'Test Store',
      '2025-01-01',
      25.99,
      2.08,
      23.91,
      'credit',
      JSON.stringify([{ name: 'Test Item', price: 23.91, quantity: 1 }]),
      85,
      JSON.stringify({ note: 'Test extraction' })
    );
    
    await (processor as any).storeProcessingLog(
      testEmailId,
      testFilename,
      'extraction',
      true,
      null,
      2500
    );
    
    // Check final status
    const status3 = await (processor as any).checkDocumentProcessingStatus(testEmailId, testFilename);
    
    // Clean up test data
    await (processor as any).deleteExistingDocumentRecords(testEmailId, testFilename);
    
    processor.close();
    
    res.status(200).json({
      success: true,
      message: 'File tracking test completed',
      results: {
        beforeProcessing: status1,
        afterClassification: status2,
        afterExtraction: status3
      }
    });
    
  } catch (error) {
    console.error('Error testing file tracking:', error);
    res.status(500).json({ 
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
