import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface Transaction {
  id: number;
  amount: number;
  description?: string;
  merchant_name?: string;
  transaction_date: string;
  total_amount?: number;
}

interface Match {
  id: number;
  receipt_id: number;
  bank_transaction_id: number;
  match_confidence: number;
  match_type: string;
  is_manual: boolean;
  notes?: string;
  bank_description?: string;
  bank_amount?: number;
  bank_date?: string;
  merchant_name?: string;
  receipt_amount?: number;
  receipt_date?: string;
}

interface ReconciliationData {
  matches: Match[];
  receiptOnly: Transaction[];
  bankOnly: Transaction[];
  summary: {
    totalReceipts: number;
    totalBankTransactions: number;
    totalMatches: number;
    exactMatches: number;
    probableMatches: number;
    manualMatches: number;
    receiptOnlyCount: number;
    bankOnlyCount: number;
    reconciliationRate: number;
  };
}

interface ReconciliationDashboardProps {
  className?: string;
}

export default function ReconciliationDashboard({ className = '' }: ReconciliationDashboardProps) {
  const [reconciliationData, setReconciliationData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'matched' | 'receipt-only' | 'bank-only'>('matched');
  const [showManualMatchModal, setShowManualMatchModal] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);

  const runReconciliation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reconcile', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Reconciliation failed');
      }
      
      const data = await response.json();
      setReconciliationData(data);
    } catch (error) {
      console.error('Error running reconciliation:', error);
    } finally {
      setLoading(false);
    }
  };

  const createManualMatch = async (receiptId: number, bankTransactionId: number, notes?: string) => {
    try {
      const response = await fetch('/api/reconcile/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptId,
          bankTransactionId,
          notes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create manual match');
      }

      // Refresh reconciliation data
      await runReconciliation();
      setShowManualMatchModal(false);
      setSelectedReceiptId(null);
      setSelectedBankId(null);
    } catch (error) {
      console.error('Error creating manual match:', error);
    }
  };

  const removeMatch = async (matchId: number) => {
    try {
      const response = await fetch('/api/reconcile/manual', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchId })
      });

      if (!response.ok) {
        throw new Error('Failed to remove match');
      }

      // Refresh reconciliation data
      await runReconciliation();
    } catch (error) {
      console.error('Error removing match:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getMatchTypeColor = (matchType: string, isManual: boolean) => {
    if (isManual) return 'bg-purple-100 text-purple-800';
    switch (matchType) {
      case 'exact': return 'bg-green-100 text-green-800';
      case 'probable': return 'bg-yellow-100 text-yellow-800';
      case 'possible': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMatchTypeLabel = (matchType: string, isManual: boolean) => {
    if (isManual) return 'Manual';
    return matchType.charAt(0).toUpperCase() + matchType.slice(1);
  };

  useEffect(() => {
    runReconciliation();
  }, []);

  if (!reconciliationData) {
    return (
      <div className={`w-full ${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reconciliation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Total Matches</h3>
          <p className="text-2xl font-bold text-green-600">{reconciliationData.summary.totalMatches}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Reconciliation Rate</h3>
          <p className="text-2xl font-bold text-blue-600">
            {reconciliationData.summary.reconciliationRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Receipt Only</h3>
          <p className="text-2xl font-bold text-orange-600">{reconciliationData.summary.receiptOnlyCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Bank Only</h3>
          <p className="text-2xl font-bold text-red-600">{reconciliationData.summary.bankOnlyCount}</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Bank Reconciliation</h2>
        <button
          onClick={runReconciliation}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Running...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              <span>Run Reconciliation</span>
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('matched')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'matched'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Matched ({reconciliationData.summary.totalMatches})
          </button>
          <button
            onClick={() => setActiveTab('receipt-only')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'receipt-only'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Receipt Only ({reconciliationData.summary.receiptOnlyCount})
          </button>
          <button
            onClick={() => setActiveTab('bank-only')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'bank-only'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Bank Only ({reconciliationData.summary.bankOnlyCount})
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200">
        {activeTab === 'matched' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receipt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reconciliationData.matches.map((match) => (
                  <tr key={match.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {match.merchant_name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(match.receipt_amount || 0)} • {formatDate(match.receipt_date || '')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {match.bank_description || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(match.bank_amount || 0)} • {formatDate(match.bank_date || '')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMatchTypeColor(match.match_type, match.is_manual)}`}>
                        {getMatchTypeLabel(match.match_type, match.is_manual)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {match.match_confidence}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => removeMatch(match.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'receipt-only' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Merchant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reconciliationData.receiptOnly.map((receipt) => (
                  <tr key={receipt.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {receipt.merchant_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(receipt.total_amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(receipt.transaction_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedReceiptId(receipt.id);
                          setShowManualMatchModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Manual Match
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'bank-only' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reconciliationData.bankOnly.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.description || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedBankId(transaction.id);
                          setShowManualMatchModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Manual Match
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Match Modal */}
      {showManualMatchModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create Manual Match</h3>
              
              <div className="space-y-4">
                {selectedReceiptId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Bank Transaction:
                    </label>
                    <select 
                      value={selectedBankId || ''} 
                      onChange={(e) => setSelectedBankId(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Choose a bank transaction...</option>
                      {reconciliationData.bankOnly.map((transaction) => (
                        <option key={transaction.id} value={transaction.id}>
                          {transaction.description} - {formatCurrency(transaction.amount)} ({formatDate(transaction.transaction_date)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedBankId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Receipt:
                    </label>
                    <select 
                      value={selectedReceiptId || ''} 
                      onChange={(e) => setSelectedReceiptId(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Choose a receipt...</option>
                      {reconciliationData.receiptOnly.map((receipt) => (
                        <option key={receipt.id} value={receipt.id}>
                          {receipt.merchant_name} - {formatCurrency(receipt.total_amount || 0)} ({formatDate(receipt.transaction_date)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => {
                    setShowManualMatchModal(false);
                    setSelectedReceiptId(null);
                    setSelectedBankId(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedReceiptId && selectedBankId) {
                      createManualMatch(selectedReceiptId, selectedBankId);
                    }
                  }}
                  disabled={!selectedReceiptId || !selectedBankId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Match
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
