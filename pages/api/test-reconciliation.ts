import { NextApiRequest, NextApiResponse } from 'next';
import { ReceiptProcessorWithDB } from '../../lib/receipt-processor-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const processor = new ReceiptProcessorWithDB();
    
    console.log('🧪 Starting Reconciliation System Test...');

    // Test 1: Upload sample bank statement
    console.log('\n📁 Test 1: Processing Bank Statement...');
    const csvContent = `Date,Description,Amount,Reference
2024-01-15,"WALMART SUPERCENTER #1234",-45.67,REF123456
2024-01-16,"STARBUCKS STORE #5678",-4.25,REF123457
2024-01-18,"TARGET STORE T-1234",-89.32,REF123458
2024-01-20,"AMAZON.COM AMZN.COM/BILL",-29.99,REF123459
2024-01-22,"SHELL OIL #12345678",-38.50,REF123460`;

    const bankResult = await processor.processBankStatement(csvContent, 'test-bank-statement.csv');
    console.log('Bank statement result:', bankResult);

    // Test 2: Add some sample receipt data manually for testing
    console.log('\n🧾 Test 2: Adding Sample Receipt Data...');
    
    // Create sample receipts that should match bank transactions
    const sampleReceipts = [
      {
        emailId: 'test-email-1',
        filename: 'walmart-receipt.pdf',
        merchantName: 'Walmart Supercenter',
        transactionDate: '2024-01-15',
        totalAmount: 45.67,
        taxAmount: 3.45,
        subtotal: 42.22,
        paymentMethod: 'credit',
        lineItems: JSON.stringify([
          { description: 'Groceries', quantity: 1, unitPrice: 42.22, totalPrice: 42.22 }
        ]),
        confidence: 95,
        extractionIssues: JSON.stringify({ note: 'Test data' })
      },
      {
        emailId: 'test-email-2',
        filename: 'starbucks-receipt.pdf',
        merchantName: 'Starbucks',
        transactionDate: '2024-01-16',
        totalAmount: 4.25,
        taxAmount: 0.25,
        subtotal: 4.00,
        paymentMethod: 'credit',
        lineItems: JSON.stringify([
          { description: 'Coffee', quantity: 1, unitPrice: 4.00, totalPrice: 4.00 }
        ]),
        confidence: 90,
        extractionIssues: JSON.stringify({ note: 'Test data' })
      }
    ];

    // Store sample receipts using private methods
    for (const receipt of sampleReceipts) {
      // Add to document analysis first
      await (processor as any).storeDocumentAnalysis(
        receipt.emailId,
        receipt.filename,
        true,
        receipt.confidence,
        'receipt',
        'Test receipt data',
        JSON.stringify(['merchant_name', 'total_amount', 'transaction_date'])
      );

      // Add receipt data
      await (processor as any).storeReceiptData(
        receipt.emailId,
        receipt.filename,
        receipt.merchantName,
        receipt.transactionDate,
        receipt.totalAmount,
        receipt.taxAmount,
        receipt.subtotal,
        receipt.paymentMethod,
        receipt.lineItems,
        receipt.confidence,
        receipt.extractionIssues
      );
    }

    // Test 3: Perform reconciliation
    console.log('\n🔄 Test 3: Performing Reconciliation...');
    const reconciliationResult = await processor.performReconciliation();
    console.log('Reconciliation result:', reconciliationResult);

    // Test 4: Get reconciliation results
    console.log('\n📊 Test 4: Getting Reconciliation Results...');
    const results = processor.getReconciliationResults();
    console.log('Reconciliation summary:', results.summary);

    // Test 5: Test manual matching if there are unmatched items
    console.log('\n✋ Test 5: Testing Manual Match...');
    let manualMatchResult = false;
    if (results.receiptOnly.length > 0 && results.bankOnly.length > 0) {
      manualMatchResult = processor.createManualMatch(
        results.receiptOnly[0].id,
        results.bankOnly[0].id,
        'Manual test match'
      );
      console.log('Manual match result:', manualMatchResult);
    }

    processor.close();

    res.status(200).json({
      success: true,
      testResults: {
        bankStatementProcessing: bankResult,
        reconciliation: reconciliationResult,
        reconciliationSummary: results.summary,
        manualMatchTest: manualMatchResult,
        matchedTransactions: results.matches.length,
        unmatchedReceipts: results.receiptOnly.length,
        unmatchedBankTransactions: results.bankOnly.length,
        message: 'All tests completed successfully!'
      }
    });

  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
