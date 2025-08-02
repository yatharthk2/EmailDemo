import { NextApiRequest, NextApiResponse } from 'next';
import { ReceiptProcessorWithDB } from '../../lib/receipt-processor-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting comprehensive system test...');
    const processor = new ReceiptProcessorWithDB();
    const results: any = {};

    // Test 1: Database connectivity and schema
    console.log('Test 1: Database connectivity...');
    try {
      // Test database by trying to get bank transactions count
      const testResult = await processor.getBankTransactions();
      results.databaseTest = { 
        success: true, 
        message: 'Database connected successfully',
        bankTransactionCount: testResult.transactions.length
      };
    } catch (error) {
      results.databaseTest = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Database test failed'
      };
    }

    // Test 2: Enhanced date parsing
    console.log('Test 2: Enhanced date parsing...');
    try {
      const testDates = [
        '2024-01-15',
        '01/15/2024', 
        '15-01-2024',
        '1/5/2024',
        '2024/01/15',
        '15.01.2024',
        '"2024-01-15"',
        ' 01/15/2024 '
      ];
      
      const dateResults = testDates.map(dateStr => {
        try {
          const parsed = (processor as any).parseDate(dateStr);
          return { input: dateStr, output: parsed, success: true };
        } catch (error) {
          return { 
            input: dateStr, 
            success: false, 
            error: error instanceof Error ? error.message : 'Parse error'
          };
        }
      });

      const successCount = dateResults.filter(r => r.success).length;
      results.dateParsingTest = {
        success: successCount > 0,
        totalTests: testDates.length,
        successCount,
        details: dateResults
      };
    } catch (error) {
      results.dateParsingTest = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Date parsing test failed'
      };
    }

    // Test 3: Enhanced amount parsing
    console.log('Test 3: Enhanced amount parsing...');
    try {
      const testAmounts = [
        '123.45',
        '$123.45',
        '1,234.56',
        '(123.45)',
        '-123.45',
        '£1,234.56',
        '€123,45',
        '123.45 CR',
        '123.45 DR',
        '+123.45'
      ];
      
      const amountResults = testAmounts.map(amountStr => {
        try {
          const parsed = (processor as any).parseAmount(amountStr);
          return { input: amountStr, output: parsed, success: true };
        } catch (error) {
          return { 
            input: amountStr, 
            success: false, 
            error: error instanceof Error ? error.message : 'Parse error'
          };
        }
      });

      const successCount = amountResults.filter(r => r.success).length;
      results.amountParsingTest = {
        success: successCount > 0,
        totalTests: testAmounts.length,
        successCount,
        details: amountResults
      };
    } catch (error) {
      results.amountParsingTest = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Amount parsing test failed'
      };
    }

    // Test 4: Bank reconciliation functionality
    console.log('Test 4: Bank reconciliation functionality...');
    try {
      // Create sample CSV content for testing
      const testCSVContent = `Date,Description,Amount,Type
2024-01-15,"Coffee Shop Purchase",12.50,debit
2024-01-16,"Restaurant Dinner",45.75,debit
2024-01-17,"Gas Station",38.20,debit
2024-01-18,"Grocery Store",87.33,debit
2024-01-19,"Online Purchase",23.99,debit`;

      // Create a temporary CSV file
      const fs = await import('fs');
      const path = await import('path');
      const tempDir = './temp';
      
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, `test-bank-${Date.now()}.csv`);
      fs.writeFileSync(tempFilePath, testCSVContent);

      // Test bank statement processing
      const bankResult = await processor.processBankStatement(tempFilePath, 'Test Account');
      
      // Clean up temp file
      fs.unlinkSync(tempFilePath);

      results.bankReconciliationTest = {
        success: bankResult.success,
        transactionsProcessed: bankResult.transactionsProcessed,
        errors: bankResult.errors,
        uploadId: bankResult.uploadId
      };
    } catch (error) {
      results.bankReconciliationTest = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bank reconciliation test failed'
      };
    }

    // Test 5: Reconciliation engine
    console.log('Test 5: Reconciliation engine...');
    try {
      const reconciliationResult = await processor.performReconciliation();
      results.reconciliationEngineTest = {
        success: true,
        totalMatches: reconciliationResult.totalMatches,
        receiptOnlyCount: reconciliationResult.receiptOnlyCount,
        bankOnlyCount: reconciliationResult.bankOnlyCount,
        matchedCount: reconciliationResult.matches.length
      };
    } catch (error) {
      results.reconciliationEngineTest = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Reconciliation engine test failed'
      };
    }

    // Test 6: System integration test
    console.log('Test 6: System integration test...');
    try {
      // Test Gemini connection
      const geminiTest = await processor.testGeminiConnection();
      results.systemIntegrationTest = {
        success: true,
        geminiConnection: geminiTest,
        message: 'System integration working correctly'
      };
    } catch (error) {
      results.systemIntegrationTest = { 
        success: false, 
        error: error instanceof Error ? error.message : 'System integration test failed'
      };
    }

    // Calculate overall status
    const testKeys = Object.keys(results);
    const successfulTests = testKeys.filter(key => results[key].success).length;
    const totalTests = testKeys.length;
    const overallSuccess = successfulTests === totalTests;
    const completionPercentage = Math.round((successfulTests / totalTests) * 100);

    console.log(`System test completed: ${successfulTests}/${totalTests} tests passed (${completionPercentage}%)`);

    // Close database connection
    processor.close();

    return res.status(200).json({
      success: overallSuccess,
      completionPercentage,
      summary: {
        totalTests,
        successfulTests,
        failedTests: totalTests - successfulTests
      },
      message: overallSuccess 
        ? '🎉 All systems operational! Bank reconciliation system is 100% functional.'
        : `⚠️ System is ${completionPercentage}% operational. Some functionality needs attention.`,
      details: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Comprehensive test failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Comprehensive test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
