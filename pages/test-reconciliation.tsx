import { useState } from 'react';
import Link from 'next/link';

export default function TestReconciliation() {
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [testResults, setTestResults] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const runTests = async () => {
    setTestStatus('running');
    setError('');
    setTestResults(null);

    try {
      const response = await fetch('/api/test-reconciliation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setTestResults(data.testResults);
        setTestStatus('success');
      } else {
        setError(data.error || 'Test failed');
        setTestStatus('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setTestStatus('error');
    }
  };

  const uploadTestFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/bank/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('Upload result:', result);
      alert(`Uploaded: ${result.transactionsProcessed} transactions processed`);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Bank Reconciliation System Test
          </h1>

          {/* Test Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Automated Test */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Automated Test Suite</h2>
              <p className="text-gray-600 mb-4">
                Runs a complete test with sample data including bank statement processing, 
                receipt matching, and reconciliation.
              </p>
              <button
                onClick={runTests}
                disabled={testStatus === 'running'}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {testStatus === 'running' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Running Tests...
                  </>
                ) : (
                  <>
                    ▶️ Run Full Test Suite
                  </>
                )}
              </button>
            </div>

            {/* Manual File Upload */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Manual File Upload</h2>
              <p className="text-gray-600 mb-4">
                Upload your own CSV bank statement file to test the processing.
              </p>
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={uploadTestFile}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 cursor-pointer"
                >
                  📤 Upload CSV File
                </label>
              </div>
            </div>
          </div>

          {/* Test Status */}
          {testStatus !== 'idle' && (
            <div className="mb-6">
              <div className={`flex items-center gap-2 p-4 rounded-lg ${
                testStatus === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                testStatus === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {testStatus === 'success' && '✅'}
                {testStatus === 'error' && '❌'}
                {testStatus === 'running' && '🔄'}
                
                <span className="font-medium">
                  {testStatus === 'success' && 'Tests Completed Successfully!'}
                  {testStatus === 'error' && `Test Failed: ${error}`}
                  {testStatus === 'running' && 'Running tests...'}
                </span>
              </div>
            </div>
          )}

          {/* Test Results */}
          {testResults && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Test Results</h2>
              
              {/* Bank Statement Processing */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Bank Statement Processing</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Transactions Processed</div>
                    <div className="font-semibold text-lg">
                      {testResults.bankStatementProcessing.transactionsProcessed}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Success Rate</div>
                    <div className="font-semibold text-lg text-green-600">
                      {testResults.bankStatementProcessing.success ? '100%' : '0%'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Errors</div>
                    <div className="font-semibold text-lg">
                      {testResults.bankStatementProcessing.errors.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reconciliation Results */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Reconciliation Results</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Total Matches</div>
                    <div className="font-semibold text-lg text-green-600">
                      {testResults.matchedTransactions}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Receipt Only</div>
                    <div className="font-semibold text-lg text-yellow-600">
                      {testResults.unmatchedReceipts}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Bank Only</div>
                    <div className="font-semibold text-lg text-red-600">
                      {testResults.unmatchedBankTransactions}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Match Rate</div>
                    <div className="font-semibold text-lg">
                      {testResults.reconciliationSummary.reconciliationRate?.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="flex gap-4 pt-4">
                <Link
                  href="/reconciliation"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  View Reconciliation Dashboard
                </Link>
                <Link
                  href="/receipt-processing/ledger"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  View Receipt Ledger
                </Link>
              </div>
            </div>
          )}

          {/* Test Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Testing Instructions</h3>
            <div className="text-blue-800 text-sm space-y-2">
              <p><strong>Automated Test:</strong> Runs a complete test with sample bank transactions and receipts, then performs reconciliation.</p>
              <p><strong>Manual Upload:</strong> Upload your own CSV file with columns: Date, Description, Amount, Reference</p>
              <p><strong>CSV Format:</strong> Ensure dates are in YYYY-MM-DD, MM/DD/YYYY, or DD/MM/YYYY format</p>
              <p><strong>Amount Format:</strong> Negative values for debits/expenses, positive for credits</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
