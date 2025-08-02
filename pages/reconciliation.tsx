import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, ArrowLeft, Upload, Eye, FileText } from 'lucide-react';
import Link from 'next/link';

interface ReconciliationData {
  matches: any[];
  receiptOnly: any[];
  bankOnly: any[];
  summary: {
    totalMatches: number;
    receiptOnlyCount: number;
    bankOnlyCount: number;
    reconciliationRate: number;
    exactMatches: number;
    probableMatches: number;
    manualMatches: number;
  };
}

export default function ReconciliationDashboard() {
  const [reconciliationData, setReconciliationData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'matched' | 'ledger-only' | 'bank-only'>('matched');

  const fetchReconciliationData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reconciliation/results');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setReconciliationData(data);
      setError('');
    } catch (error) {
      console.error('Error fetching reconciliation data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  }, []);

  const runReconciliation = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reconciliation/run', { method: 'POST' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      await fetchReconciliationData();
    } catch (error) {
      console.error('Error running reconciliation:', error);
      setError(error instanceof Error ? error.message : 'Failed to run reconciliation');
    } finally {
      setLoading(false);
    }
  }, [fetchReconciliationData]);

  useEffect(() => {
    fetchReconciliationData();
  }, [fetchReconciliationData]);

  if (loading && !reconciliationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading reconciliation data...</p>
        </div>
      </div>
    );
  }

  if (error && !reconciliationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={fetchReconciliationData}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
            <Link href="/test-reconciliation" className="block w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-center">
              Run Test First
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!reconciliationData || (!reconciliationData.matches.length && !reconciliationData.receiptOnly.length && !reconciliationData.bankOnly.length)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-lg">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600 mb-6">Upload bank statements and process receipts to begin reconciliation.</p>
          <div className="space-y-3">
            <Link href="/bank-upload" className="block w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700">
              📄 Upload Bank Statement
            </Link>
            <Link href="/receipt-processing/ledger" className="block w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700">
              📋 View Receipt Ledger
            </Link>
            <button 
              onClick={runReconciliation}
              className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700"
            >
              🔄 Run Reconciliation
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { matches, receiptOnly, bankOnly, summary } = reconciliationData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bank Reconciliation</h1>
                <p className="text-sm text-gray-600">Compare ledger transactions with bank statements</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link href="/bank-upload" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload CSV
              </Link>
              <button
                onClick={runReconciliation}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                disabled={loading}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Run Reconciliation
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Matched Transactions</p>
                <p className="text-2xl font-bold text-green-600">{summary.totalMatches}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Ledger Only</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.receiptOnlyCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <XCircle className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Bank Only</p>
                <p className="text-2xl font-bold text-red-600">{summary.bankOnlyCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <RefreshCw className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Match Rate</p>
                <p className="text-2xl font-bold text-blue-600">{summary.reconciliationRate?.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('matched')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'matched'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ✅ Matched Transactions ({summary.totalMatches})
              </button>
              <button
                onClick={() => setActiveTab('ledger-only')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ledger-only'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ⚠️ Ledger Only ({summary.receiptOnlyCount})
              </button>
              <button
                onClick={() => setActiveTab('bank-only')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'bank-only'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ❌ Bank Only ({summary.bankOnlyCount})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'matched' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Matched Transactions</h3>
                {matches.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No matched transactions found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant/Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {matches.map((match, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {match.merchant_name || match.description || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {match.receipt_date || match.bank_date || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ${match.receipt_amount ? Math.abs(match.receipt_amount).toFixed(2) : 
                                (match.bank_amount ? Math.abs(match.bank_amount).toFixed(2) : '0.00')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                match.match_confidence >= 95 ? 'bg-green-100 text-green-800' :
                                match.match_confidence >= 80 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {match.match_confidence ? Math.round(match.match_confidence) : 0}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {match.match_type || 'Auto'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ledger-only' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Transactions Only in Ledger</h3>
                {receiptOnly.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No ledger-only transactions found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {receiptOnly.map((receipt, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {receipt.merchant_name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {receipt.transaction_date || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ${receipt.total_amount ? Math.abs(receipt.total_amount).toFixed(2) : '0.00'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              Receipt
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'bank-only' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Transactions Only in Bank Statement</h3>
                {bankOnly.length === 0 ? (
                  <div className="text-center py-8">
                    <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No bank-only transactions found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bankOnly.map((transaction, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {transaction.description || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {transaction.transaction_date || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ${transaction.amount ? Math.abs(transaction.amount).toFixed(2) : '0.00'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {transaction.reference || 'Bank'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link href="/bank-upload" className="text-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Upload className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="font-medium">Upload CSV</p>
              <p className="text-sm text-gray-600">Bank statement</p>
            </Link>
            <Link href="/test-reconciliation" className="text-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="font-medium">Run Test</p>
              <p className="text-sm text-gray-600">Test with sample data</p>
            </Link>
            <Link href="/receipt-processing/ledger" className="text-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Eye className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="font-medium">View Receipts</p>
              <p className="text-sm text-gray-600">Receipt ledger</p>
            </Link>
            <Link href="/processing-logs" className="text-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="font-medium">View Logs</p>
              <p className="text-sm text-gray-600">Processing history</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}